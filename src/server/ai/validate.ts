import "server-only";

import { CONFIDENCE_LABELS, RECOMMENDATION_ACTION_TYPES } from "@/db/enums";
import type { ConfidenceLabel, RecommendationActionType } from "@/db/enums";

import type { ForecastOutput } from "./types";

/**
 * Decides whether a `200` body from the AI service is a forecast the application is
 * willing to persist.
 *
 * `POST /predict/forecast` is an HTTP boundary, and an HTTP boundary returns whatever
 * the other side sends. A body that parsed is not a body that is correct: a stale
 * build, a debug stub, a proxy error page, or a model that drifted from the contract
 * will all answer `200` with something unexpected. Trusting that output would put
 * invented numbers on the organizer dashboard — the one thing this app refuses to do
 * (§7.3, PRD §14).
 *
 * So the response is checked against the request that produced it, and against the
 * invariants §2.2 and §4.4.1 state as normative:
 *
 * - the `event_id` must be the event that was asked about,
 * - `event_capacity` and `paid_registrations` must be the values that were sent,
 * - `synthetic_data_only` must be `true` — a forecast trained on real data is not
 *   something this phase is allowed to show,
 * - every number is finite and inside the documented range,
 * - `recommended_waitlist` is within `0…event_capacity`,
 * - `confidence_label` and `action_type` are documented enum values,
 * - `top_reasons` is a short list of plain-language strings,
 * - the recommendation is complete, and its two nullable fields obey §4.4.1
 *   ("non-null only for…").
 *
 * Arithmetic that the service derives from a *rounded* intermediate (`no_show_rate`
 * against `predicted_attendance`) is deliberately **not** re-computed here: with a
 * small cohort, a 2 dp rounding difference in `predicted_attendance` moves the rate
 * by far more than any sane tolerance, and rejecting the teammate's model over that
 * would be a false positive. Range and consistency checks that cannot be explained
 * away are enforced; the rest is left to `/model-info` and to the review checklist
 * in §10.
 */

/** §4.3.1 / §4.4.1: `top_reasons` is 2–5 items. */
const MIN_REASONS = 2;
const MAX_REASONS = 5;

/**
 * A reason is a sentence an organizer reads, not a feature dump. A generous ceiling
 * that still rejects a payload trying to push a whole JSON document through the UI.
 */
const MAX_REASON_LENGTH = 400;

/** `detail`, `headline`, `rationale` are prose; same reasoning as above. */
const MAX_TEXT_LENGTH = 600;

/**
 * §4.4.1 requires reasons in plain language with "no jargon or raw feature names".
 * Rejecting the ten declared feature names is the one part of that rule that can be
 * checked mechanically — and it is checked as whole words, so an ordinary sentence
 * mentioning "reminders" is unaffected.
 */
const RAW_FEATURE_NAMES = [
  "event_category",
  "ticket_price_taka",
  "days_before_event_registered",
  "payment_delay_hours",
  "event_day_of_week",
  "event_start_hour",
  "location_type",
  "reminder_status",
  "prior_attendance_count",
  "is_cancelled",
] as const;

/** §4.4.1: `suggested_send_at` is non-null only for time-dependent actions. */
const TIME_DEPENDENT_ACTIONS: RecommendationActionType[] = ["send_reminder", "target_segment"];

export type ForecastValidation =
  | { ok: true; forecast: ForecastOutput }
  | { ok: false; issue: string };

export type ForecastExpectation = {
  /** The event the request was built for. */
  eventId: string;
  /** The capacity that was sent; the response must echo it. */
  eventCapacity: number;
  /** How many paid registrations were sent; the response must count the same rows. */
  paidRegistrations: number;
};

/** Sum-of-probabilities rounding slack, in people. */
const COUNT_TOLERANCE = 1e-6;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value);
}

/** A parseable timestamp string. Format strictness beyond that is the service's job. */
function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function isNonEmptyText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

/** Every failure carries the offending field so a `request_id` can be traced to it. */
function invalid(field: string, issue: string): ForecastValidation {
  return { ok: false, issue: `${field}: ${issue}` };
}

type ReasonValidation = { ok: true; reasons: string[] } | { ok: false; issue: string };

function validateReasons(value: unknown): ReasonValidation {
  if (!Array.isArray(value)) {
    return { ok: false, issue: "top_reasons: must be an array of strings." };
  }

  if (value.length < MIN_REASONS || value.length > MAX_REASONS) {
    return {
      ok: false,
      issue: `top_reasons: expected ${MIN_REASONS}–${MAX_REASONS} items, received ${value.length}.`,
    };
  }

  for (const [index, reason] of value.entries()) {
    if (!isNonEmptyText(reason, MAX_REASON_LENGTH)) {
      return {
        ok: false,
        issue: `top_reasons[${index}]: must be a non-empty plain-language string.`,
      };
    }

    if (mentionsRawFeatureName(reason)) {
      return {
        ok: false,
        issue: `top_reasons[${index}]: must be plain language, not a raw feature name.`,
      };
    }
  }

  return { ok: true, reasons: value as string[] };
}

function mentionsRawFeatureName(reason: string): boolean {
  return RAW_FEATURE_NAMES.some((feature) =>
    new RegExp(`(^|[^a-z0-9_])${feature}([^a-z0-9_]|$)`, "i").test(reason),
  );
}

type RecommendationValidation =
  | { ok: true; recommendation: ForecastOutput["recommendation"] }
  | { ok: false; issue: string };

function validateRecommendation(value: unknown): RecommendationValidation {
  if (!isRecord(value)) {
    return { ok: false, issue: "recommendation: must be an object." };
  }

  if (!isOneOf(value.action_type, RECOMMENDATION_ACTION_TYPES)) {
    return {
      ok: false,
      issue: `recommendation.action_type: must be one of ${RECOMMENDATION_ACTION_TYPES.join(", ")}.`,
    };
  }

  const actionType = value.action_type;

  if (!isNonEmptyText(value.headline, MAX_TEXT_LENGTH)) {
    return { ok: false, issue: "recommendation.headline: must be a non-empty string." };
  }

  if (!isNonEmptyText(value.detail, MAX_TEXT_LENGTH)) {
    return { ok: false, issue: "recommendation.detail: must be a non-empty string." };
  }

  if (!isNonEmptyText(value.rationale, MAX_TEXT_LENGTH)) {
    return { ok: false, issue: "recommendation.rationale: must be a non-empty string." };
  }

  // §4.4.1: "Non-null only for time-dependent actions … `null` for immediate
  // actions." Both directions are checked, so the shape the dashboard renders is
  // always the shape the contract describes.
  if (TIME_DEPENDENT_ACTIONS.includes(actionType)) {
    if (!isTimestamp(value.suggested_send_at)) {
      return {
        ok: false,
        issue: `recommendation.suggested_send_at: required for "${actionType}" and must be an ISO 8601 timestamp.`,
      };
    }
  } else if (value.suggested_send_at !== null) {
    return {
      ok: false,
      issue: `recommendation.suggested_send_at: must be null for "${actionType}".`,
    };
  }

  // §4.4.1: "Non-null only for `adjust_catering`, otherwise `null`."
  if (actionType === "adjust_catering") {
    if (!isInteger(value.catering_headcount) || value.catering_headcount < 0) {
      return {
        ok: false,
        issue: "recommendation.catering_headcount: required for \"adjust_catering\" and must be a non-negative integer.",
      };
    }
  } else if (value.catering_headcount !== null) {
    return {
      ok: false,
      issue: `recommendation.catering_headcount: must be null for "${actionType}".`,
    };
  }

  return {
    ok: true,
    recommendation: {
      action_type: actionType,
      headline: value.headline,
      detail: value.detail,
      rationale: value.rationale,
      suggested_send_at: value.suggested_send_at,
      catering_headcount: value.catering_headcount,
    },
  };
}

/**
 * Validates a `POST /predict/forecast` body against the request that produced it.
 *
 * Returns the parsed forecast, or the first problem found. Nothing is written to the
 * database unless this returns `ok`, which is what guarantees that a bad response
 * leaves the previously cached forecast exactly as it was.
 */
export function validateForecastOutput(
  body: unknown,
  expected: ForecastExpectation,
): ForecastValidation {
  if (!isRecord(body)) {
    return invalid("response", "expected a JSON object.");
  }

  if (body.event_id !== expected.eventId) {
    return invalid("event_id", "does not match the event that was requested.");
  }

  if (!isNonEmptyText(body.model_version, 200)) {
    return invalid("model_version", "must be a non-empty string.");
  }

  if (!isTimestamp(body.generated_at)) {
    return invalid("generated_at", "must be an ISO 8601 timestamp.");
  }

  if (!isTimestamp(body.as_of)) {
    return invalid("as_of", "must be an ISO 8601 timestamp.");
  }

  // §4.4.1 and PRD §14: v1.0 predictions come from synthetic data only, and the app
  // says so on the dashboard. A `false` here means the service is running in a mode
  // this phase has no disclosure for.
  if (body.synthetic_data_only !== true) {
    return invalid("synthetic_data_only", "must be true.");
  }

  if (body.event_capacity !== expected.eventCapacity) {
    return invalid("event_capacity", "does not echo the capacity that was requested.");
  }

  if (body.paid_registrations !== expected.paidRegistrations) {
    return invalid(
      "paid_registrations",
      `does not match the ${expected.paidRegistrations} paid registration(s) that were sent.`,
    );
  }

  const paid = expected.paidRegistrations;

  if (!isFiniteNumber(body.predicted_attendance)) {
    return invalid("predicted_attendance", "must be a finite number.");
  }

  // §2.2: `predicted_attendance` is a sum of probabilities, one per paid
  // registration, so it cannot exceed the cohort or be negative.
  if (body.predicted_attendance < -COUNT_TOLERANCE) {
    return invalid("predicted_attendance", "must not be negative.");
  }

  if (body.predicted_attendance > paid + COUNT_TOLERANCE) {
    return invalid(
      "predicted_attendance",
      `must not exceed the ${paid} paid registration(s) it is a sum of.`,
    );
  }

  if (paid === 0 && Math.abs(body.predicted_attendance) > COUNT_TOLERANCE) {
    return invalid("predicted_attendance", "must be 0 for an empty cohort.");
  }

  if (!isInteger(body.predicted_no_shows)) {
    return invalid("predicted_no_shows", "must be an integer.");
  }

  if (body.predicted_no_shows < 0 || body.predicted_no_shows > paid + COUNT_TOLERANCE) {
    return invalid("predicted_no_shows", `must be between 0 and ${paid}.`);
  }

  if (!isFiniteNumber(body.no_show_rate) || body.no_show_rate < 0 || body.no_show_rate > 1) {
    return invalid("no_show_rate", "must be a number between 0.0 and 1.0.");
  }

  if (
    !isInteger(body.recommended_waitlist) ||
    body.recommended_waitlist < 0 ||
    body.recommended_waitlist > expected.eventCapacity
  ) {
    // §2.2: `0 <= recommended_waitlist <= event_capacity` is stated as a hard
    // constraint, so a violation is a contract breach rather than a display concern.
    return invalid(
      "recommended_waitlist",
      `must be an integer between 0 and the ${expected.eventCapacity}-seat capacity.`,
    );
  }

  if (!isFiniteNumber(body.confidence) || body.confidence < 0 || body.confidence > 1) {
    return invalid("confidence", "must be a number between 0.0 and 1.0.");
  }

  if (!isOneOf<ConfidenceLabel>(body.confidence_label, CONFIDENCE_LABELS)) {
    return invalid(
      "confidence_label",
      `must be one of ${CONFIDENCE_LABELS.join(", ")}.`,
    );
  }

  const reasons = validateReasons(body.top_reasons);

  if (!reasons.ok) {
    return reasons;
  }

  const recommendation = validateRecommendation(body.recommendation);

  if (!recommendation.ok) {
    return recommendation;
  }

  return {
    ok: true,
    forecast: {
      event_id: body.event_id,
      model_version: body.model_version,
      generated_at: body.generated_at,
      as_of: body.as_of,
      synthetic_data_only: true,
      event_capacity: body.event_capacity,
      paid_registrations: body.paid_registrations,
      predicted_attendance: body.predicted_attendance,
      predicted_no_shows: body.predicted_no_shows,
      no_show_rate: body.no_show_rate,
      recommended_waitlist: body.recommended_waitlist,
      confidence: body.confidence,
      confidence_label: body.confidence_label,
      top_reasons: reasons.reasons,
      recommendation: recommendation.recommendation,
    },
  };
}