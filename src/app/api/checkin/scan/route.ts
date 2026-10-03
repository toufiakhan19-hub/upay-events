import { scanTicket } from "@/server/checkin/checkin";
import { apiError, apiOk, internalError, readScanRequest, unauthorized } from "@/server/checkin/http";
import { getCurrentOrganizer } from "@/server/organizers/access";

export const dynamic = "force-dynamic";

/**
 * `POST /api/checkin/scan` — one scan, one answer.
 *
 * Request: `{ "qr_token": "…" }` or `{ "ticket_id": "…" }`.
 *
 * Response `200`, always one of the three `CHECK_IN_RESULTS` values:
 * `checked_in`, `already_used`, or `invalid_ticket`, with the ticket reference and
 * event it belongs to when the caller is allowed to see them. Ticket ids and event
 * ids are included because staff need to know *which* ticket they just admitted;
 * no name, phone number, or payment data is ever returned.
 *
 * Response `401` without an organizer session, `422` when the body carries
 * neither credential field, `500` on an unexpected failure.
 *
 * Authorization comes from the organizer cookie. The event is derived from the
 * ticket, so no field in the body can redirect a scan to another event.
 */
export async function POST(request: Request) {
  const organizer = await getCurrentOrganizer();

  if (!organizer) {
    return unauthorized();
  }

  const parsed = await readScanRequest(request);

  if (!parsed.ok) {
    return apiError("VALIDATION_ERROR", parsed.message, 422, [
      { field: parsed.field, issue: parsed.message },
    ]);
  }

  try {
    return apiOk(
      await scanTicket({
        organizerId: organizer.id,
        // No staff accounts exist in this phase; the organization is the only
        // identity the check-in screen has. See `scanTicket`.
        scannedBy: organizer.id,
        credential: parsed.credential,
      }),
    );
  } catch {
    return internalError();
  }
}