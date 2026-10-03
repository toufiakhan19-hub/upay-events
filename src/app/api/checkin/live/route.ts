import { toUtcTimestamp } from "@/lib/time";
import { getCheckInLiveState } from "@/server/checkin/queries";
import { apiError, apiOk, internalError, readEventId, unauthorized } from "@/server/checkin/http";
import { getCurrentOrganizer } from "@/server/organizers/access";

export const dynamic = "force-dynamic";

/**
 * `GET /api/checkin/live?event_id=…` — the counter the check-in screen polls.
 *
 * Response `200`:
 * `{ event, attendance, registrations, forecast, comparison, generatedAt }`.
 *
 * `attendance` and `forecast` are the very shapes the organizer dashboard already
 * renders — same query, same field names, same `null` forecast — so this endpoint
 * is a transport, not a second attendance contract. `comparison` is the one thing
 * added here: live checked-in attendance against the cached forecast, and `null`
 * whenever no forecast has been persisted (API_CONTRACT.md §7.3 — the console says
 * "prediction unavailable" rather than showing a made-up number).
 *
 * `event_id` comes from the query string, so it is browser-supplied; the read is
 * scoped by organizer id from the session cookie, and an event the organizer does
 * not own answers `404` exactly like one that does not exist.
 */
export async function GET(request: Request) {
  const organizer = await getCurrentOrganizer();

  if (!organizer) {
    return unauthorized();
  }

  const eventId = readEventId(request);

  if (!eventId) {
    const message = "Provide the event_id to report attendance for.";
    return apiError("VALIDATION_ERROR", message, 422, [{ field: "event_id", issue: message }]);
  }

  try {
    const state = await getCheckInLiveState(organizer.id, eventId);

    if (!state) {
      return apiError(
        "NOT_FOUND",
        "That event does not exist for this organization.",
        404,
      );
    }

    return apiOk({ ...state, generatedAt: toUtcTimestamp(new Date()) });
  } catch {
    return internalError();
  }
}