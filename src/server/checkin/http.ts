import "server-only";

import { NextResponse } from "next/server";

import { newId } from "@/lib/ids";
import { buildTicketCredential, type TicketCredential } from "@/server/checkin/checkin";

/**
 * The check-in HTTP contract: one success shape, one error shape, shared by both
 * routes.
 *
 * Errors use the envelope already documented in `docs/API_CONTRACT.md` §5 —
 * `{ error: { code, message, details, request_id } }` with a ULID `request_id` —
 * rather than inventing a second format for this one part of the app. The codes
 * below are the app's own; the AI service's error codes are its own.
 *
 * The split between an error and a scan result is deliberate:
 *
 * - **Errors** mean the request never became a scan: no organizer session, a
 *   body that is not JSON, a body with neither credential field. Nothing was
 *   written, so there is nothing to record.
 * - **Scan results** are ordinary outcomes and answer `200`. An unknown ticket, a
 *   foreign QR code, a cancelled attendee, and a ticket already used are all
 *   things a staff member sees in a normal evening, and the console renders them
 *   as states rather than errors. The three values are `CHECK_IN_RESULTS` from
 *   `src/db/enums.ts`.
 */

/** Field-level detail, matching `docs/API_CONTRACT.md` §5 `error.details[]`. */
export type ApiErrorDetail = {
  field: string;
  issue: string;
};

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export function apiOk<TBody>(body: TBody): NextResponse<TBody> {
  return NextResponse.json(body);
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details: ApiErrorDetail[] | null = null,
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
        request_id: newId(),
      },
    },
    { status },
  );
}

/**
 * Guards both routes with the existing organizer access model.
 *
 * `requireOrganizer()` redirects, which is the right behaviour for a page and the
 * wrong shape for JSON, so the API reads the same session and answers `401`. The
 * organizer id is never taken from the request: it is the cookie value, re-read
 * from `organizers` on every request.
 */
export function unauthorized(): NextResponse {
  return apiError(
    "UNAUTHORIZED",
    "Select an organization before opening the check-in screen.",
    401,
  );
}

/** Never leak an exception message to the console; the `request_id` is the handle. */
export function internalError(): NextResponse {
  return apiError(
    "INTERNAL_ERROR",
    "The scan could not be processed. Try again.",
    500,
  );
}

export type ScanRequestResult =
  | { ok: true; credential: TicketCredential }
  | { ok: false; message: string; field: string };

/**
 * Reads the `POST /api/checkin/scan` body.
 *
 * Accepts either `{ qr_token }` or `{ ticket_id }`, matching the published
 * contract. There is no `event_id`: the event comes from the ticket and the
 * organizer comes from the session, so nothing in this body chooses what gets
 * checked in.
 */
export async function readScanRequest(request: Request): Promise<ScanRequestResult> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      message: "The request body must be JSON.",
      field: "body",
    };
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      ok: false,
      message: "The request body must be a JSON object.",
      field: "body",
    };
  }

  const { qr_token: qrToken, ticket_id: ticketId } = body as Record<string, unknown>;

  const hasQrToken = typeof qrToken === "string" && qrToken.trim().length > 0;
  const hasTicketId = typeof ticketId === "string" && ticketId.trim().length > 0;

  if (!hasQrToken && !hasTicketId) {
    // Point at whichever key the caller actually sent, so the console can focus
    // the field the person needs to fix.
    return {
      ok: false,
      message: "Provide either qr_token or ticket_id.",
      field: qrToken !== undefined ? "qr_token" : "ticket_id",
    };
  }

  return {
    ok: true,
    credential: buildTicketCredential({
      qrToken: hasQrToken ? qrToken : undefined,
      ticketId: hasTicketId ? ticketId : undefined,
    }),
  };
}

/** The single query parameter `GET /api/checkin/live` accepts. */
export function readEventId(request: Request): string | null {
  const eventId = new URL(request.url).searchParams.get("event_id");

  return eventId && eventId.trim().length > 0 ? eventId.trim() : null;
}