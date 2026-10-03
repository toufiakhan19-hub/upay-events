import { refreshEventForecast } from "@/server/forecast/forecast";
import {
  aiFailure,
  eventNotFound,
  forecastError,
  forecastOk,
  unauthorized,
} from "@/server/forecast/http";
import { getCurrentOrganizer } from "@/server/organizers/access";

export const dynamic = "force-dynamic";

/**
 * `POST /api/organizer/events/[id]/forecast` — the explicit refresh behind the
 * dashboard's "Refresh forecast" control (API_CONTRACT.md §7.1, §7.4 step 4).
 *
 * Request: no body. Nothing the browser sends chooses what is forecast — the event id
 * comes from the URL and is only honoured in combination with the organizer id from
 * the session cookie.
 *
 * Response `200`: `{ forecast }`, the row now cached in `event_forecasts` — the very
 * shape the dashboard renders, so the client can `router.refresh()` and let the
 * server component re-read it.
 *
 * Failure responses (§5 mapping):
 *
 * - `401` no organizer session.
 * - `404` the event is not this organizer's, or does not exist. Indistinguishable on
 *   purpose: ownership is enforced in the query, so a foreign event matches no row.
 * - `422` the cohort is larger than the contract's 2000-row batch limit, or the AI
 *   service rejected the payload this app built.
 * - `503` `MODEL_NOT_READY`, or the service could not be reached at all.
 * - `504` `TIMEOUT` (after the single retry in `./client.ts`).
 * - `429` `RATE_LIMITED` · `500` `INTERNAL_ERROR` · `502` a `200` body that is not a
 *   contract-shaped forecast.
 *
 * No failure path writes to the database: a refresh that does not succeed leaves the
 * previously cached forecast untouched, which is what lets the dashboard keep showing
 * it (§7.3).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const organizer = await getCurrentOrganizer();

  if (!organizer) {
    return unauthorized();
  }

  const { id } = await params;

  try {
    const result = await refreshEventForecast(organizer.id, id);

    if (result.ok) {
      return forecastOk({ forecast: result.forecast });
    }

    switch (result.reason.kind) {
      case "event_not_found":
        return eventNotFound();

      case "batch_too_large": {
        const issue = `This event has ${result.reason.paidRegistrations} paid registrations, above the 2000 the AI service accepts per request.`;
        return forecastError("VALIDATION_ERROR", `${issue} Nothing was saved.`, 422, [
          { field: "registrations", issue },
        ]);
      }

      case "ai_failure":
        return aiFailure(result.reason.failure);

      case "invalid_ai_response": {
        // The offending field is safe to name — it is a contract field name, not
        // data — and it is what makes a rejected response diagnosable. The response
        // body itself is not forwarded.
        const issue = `The AI service returned a forecast that does not match the contract (${result.reason.issue}).`;
        return forecastError("AI_INVALID_RESPONSE", `${issue} Nothing was saved.`, 502, [
          { field: "response", issue: result.reason.issue },
        ]);
      }

      case "unusable_event_data": {
        const issue =
          "This event's stored date and time cannot be converted into the features the AI service requires.";
        return forecastError("INTERNAL_ERROR", `${issue} Nothing was saved.`, 500, [
          { field: "date_time", issue },
        ]);
      }
    }
  } catch {
    // Unexpected failure — a database error, most likely. Never surfaced: no stack
    // trace, no exception name, no path.
    return forecastError(
      "INTERNAL_ERROR",
      "The forecast could not be refreshed. Try again.",
      500,
    );
  }
}