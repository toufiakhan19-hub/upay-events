import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { eventForecasts } from "@/db/schema";
import { newId } from "@/lib/ids";
import { toUtcTimestamp } from "@/lib/time";
import { AI_MAX_REGISTRATIONS, requestForecast } from "@/server/ai/client";
import { toForecastRequest } from "@/server/ai/features";
import type { AiFailure } from "@/server/ai/types";
import { validateForecastOutput } from "@/server/ai/validate";
import { toPersistedEventForecast, type PersistedEventForecast } from "@/server/organizers/queries";

import { readForecastSource } from "./queries";

/**
 * One explicit forecast refresh: read the event, call the AI service, verify what came
 * back, and cache it.
 *
 * The order of those four steps is the design. Everything that can go wrong —
 * the event belonging to somebody else, a cohort too large for the contract's batch
 * limit, an unreachable service, a response that does not match §4.4.1 — is settled
 * before a single row is written, so a failed refresh leaves `event_forecasts`
 * exactly as it was. That is the graceful-degradation rule of §7.3 working in the
 * app's favour: the dashboard keeps serving the last good forecast, and an organizer
 * with no cached forecast keeps seeing "prediction unavailable", instead of either
 * being shown a number nobody produced.
 *
 * Nothing in this module runs during a page render. It is reachable only from the
 * refresh control (§7.1: "Forecast refresh is explicit").
 */

export type RefreshForecastFailure =
  /** This organizer does not own the event — reported exactly like a missing one. */
  | { kind: "event_not_found" }
  /** §3 caps a batch at 2000 rows; a larger cohort is refused, never truncated. */
  | { kind: "batch_too_large"; paidRegistrations: number }
  /** The AI service did not answer, timed out, or reported an error envelope. */
  | { kind: "ai_failure"; failure: AiFailure }
  /** A `200` body that is not a forecast this app is willing to store. */
  | { kind: "invalid_ai_response"; issue: string }
  /** Stored rows cannot produce the contract's features (unusable dates). */
  | { kind: "unusable_event_data" };

export type RefreshEventForecastResult =
  | { ok: true; forecast: PersistedEventForecast }
  | { ok: false; reason: RefreshForecastFailure };

/**
 * Regenerates and caches the forecast for one event.
 *
 * @param organizerId Authorization boundary, taken from the organizer session by the
 *   caller and never from a request field. Enforced inside `readForecastSource`.
 * @param eventId The event to forecast, from the URL. Also only meaningful in
 *   combination with `organizerId`.
 */
export async function refreshEventForecast(
  organizerId: string,
  eventId: string,
): Promise<RefreshEventForecastResult> {
  const source = await readForecastSource(organizerId, eventId);

  if (!source) {
    return { ok: false, reason: { kind: "event_not_found" } };
  }

  // An empty cohort is legitimate — §4.4.1 returns a zeroed forecast rather than an
  // error — but a cohort beyond the contract's batch ceiling cannot be sent whole,
  // and sending the first 2000 rows would quietly forecast the wrong number of people.
  if (source.registrations.length > AI_MAX_REGISTRATIONS) {
    return {
      ok: false,
      reason: { kind: "batch_too_large", paidRegistrations: source.registrations.length },
    };
  }

  const paidRegistrations = source.registrations.length;

  let request;

  try {
    request = toForecastRequest({
      event: source.event,
      registrations: source.registrations,
      // Always sent, never defaulted server-side (§4.3.1): it makes the response
      // deterministic and it is what time-relative rules such as "send a reminder
      // tonight" are evaluated against.
      asOf: toUtcTimestamp(new Date()),
    });
  } catch {
    // Thrown only when a stored date cannot produce `event_day_of_week` or
    // `event_start_hour`, or a registration has no usable creation date. Those are
    // data problems in the app, not AI failures, and they are reported as such.
    return { ok: false, reason: { kind: "unusable_event_data" } };
  }

  const call = await requestForecast(request);

  if (!call.ok) {
    return { ok: false, reason: { kind: "ai_failure", failure: call.failure } };
  }

  const validated = validateForecastOutput(call.body, {
    eventId: source.event.id,
    eventCapacity: source.event.capacity,
    paidRegistrations,
  });

  if (!validated.ok) {
    // The issue names the offending field and nothing else — no response body, no
    // stack, no configuration value.
    console.warn("[ai] rejected a forecast response", {
      eventId: source.event.id,
      issue: validated.issue,
    });

    return { ok: false, reason: { kind: "invalid_ai_response", issue: validated.issue } };
  }

  const forecast = validated.forecast;
  const id = newId();

  // History, not replacement (§7.1, PRD §12): every successful refresh appends a row
  // and no row is ever updated or deleted. `getOrganizerEventDashboard` already reads
  // the newest row per event, so a refresh is visible immediately and the previous
  // forecast stays available for comparison.
  db.insert(eventForecasts)
    .values({
      id,
      eventId: source.event.id,
      paidRegistrations: forecast.paid_registrations,
      predictedAttendance: forecast.predicted_attendance,
      predictedNoShows: forecast.predicted_no_shows,
      noShowRate: forecast.no_show_rate,
      recommendedWaitlist: forecast.recommended_waitlist,
      confidence: forecast.confidence,
      confidenceLabel: forecast.confidence_label,
      topReasons: forecast.top_reasons,
      // Stored verbatim as the contract's snake_case object; the dashboard renders it
      // through `recommendationActionLabel` and the existing panel.
      recommendation: forecast.recommendation,
      modelVersion: forecast.model_version,
      // A forecast written seconds ago cannot be stale. Staleness is application state
      // (§7.3) and only becomes true through age or an explicit flag.
      isStale: false,
    })
    .run();

  // Read the row back through the same mapper the dashboard uses, so the response to
  // this refresh and the next page load cannot disagree about what was stored.
  // `better-sqlite3` is synchronous, hence `.all()` rather than `await`.
  const [stored] = db.select().from(eventForecasts).where(eq(eventForecasts.id, id)).limit(1).all();

  if (!stored) {
    return {
      ok: false,
      reason: {
        kind: "invalid_ai_response",
        issue: "event_forecasts: the stored row could not be read back",
      },
    };
  }

  return { ok: true, forecast: toPersistedEventForecast(stored) };
}