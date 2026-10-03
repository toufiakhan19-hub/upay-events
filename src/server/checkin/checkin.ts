import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db, type DatabaseTransaction } from "@/db/client";
import { checkIns, events, registrations, tickets } from "@/db/schema";
import type { CheckInResult } from "@/db/enums";
import { newId } from "@/lib/ids";
import { toUtcTimestamp } from "@/lib/time";
import { TICKET_QR_PREFIX, ticketReference } from "@/server/tickets/tickets";

/**
 * Organizer/staff check-in: the only place a ticket moves from `valid` to
 * `checked_in` (PRD §7 ticket status, §10 check-in requirements).
 *
 * Design rules, in the order they matter:
 *
 * 1. **The event is derived from the ticket, never from the request.** There is
 *    no `event_id` parameter on this module, so a browser cannot ask for a
 *    different event's attendance to be credited. Authorization is the only
 *    caller-supplied value: an organizer id, which must already own the ticket's
 *    event. A ticket belonging to another organizer's event therefore matches no
 *    row and is reported as `invalid_ticket` — indistinguishable from a
 *    fabricated id, so the endpoint cannot be used to probe for other organizers'
 *    tickets.
 * 2. **Duplicate prevention is atomic at the database level.** The claim is a
 *    conditional `UPDATE ... WHERE id = ? AND status = 'valid'`: whichever scanner
 *    changes exactly one row wins, and the loser falls through to
 *    `already_used`. A read-then-write in application code would race; the
 *    `BEGIN IMMEDIATE` transaction in `registerForEvent` sets the precedent for
 *    taking the write lock up front, and this module follows it.
 * 3. **Every scan against a real ticket is logged** in `check_ins`, including
 *    rejected duplicates and rejected tickets (PRD §14).
 * 4. **No PII in or out.** Only the opaque `qr_token` is read, and the response
 *    carries no name, phone, or payment data.
 */

/**
 * What a scan is matched against.
 *
 * `unrecognized` is a real outcome, not an error: a staff member pointing the
 * camera at a restaurant menu QR is a scan attempt that matched no ticket, and
 * the console should say "invalid ticket" rather than complain about the
 * request.
 */
export type TicketCredential =
  | { kind: "qr_token"; value: string }
  | { kind: "ticket_reference"; value: string }
  | { kind: "ticket_id"; value: string }
  | { kind: "unrecognized" };

/**
 * A scan outcome, in the vocabulary the product already uses.
 *
 * `result` is `CHECK_IN_RESULTS` from `src/db/enums.ts` — the same three values
 * the dashboard counts in `src/server/organizers/queries.ts`, so the console and
 * the dashboard can never disagree about what happened.
 */
export type CheckInScanOutcome = {
  result: CheckInResult;
  /** The moment this scan was processed, to the schema's second precision. */
  scannedAt: string;
  /**
   * When the ticket was checked in. For `checked_in` that is now; for
   * `already_used` it is when it was first used, which is what the duplicate
   * notice shows staff.
   */
  checkedInAt: string | null;
  /** `null` for `invalid_ticket`, including for tickets the caller may not see. */
  ticketId: string | null;
  /** Human-readable `UPE-…` reference printed on the attendee's ticket. */
  ticketReference: string | null;
  eventId: string | null;
  eventTitle: string | null;
};

/** 32 bytes of base64url entropy, as produced by `newOpaqueToken`. Generous bounds. */
const OPAQUE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

/** The eight-token-character reference printed on a ticket, e.g. `UPE-A1B2C3D4`. */
const TICKET_REFERENCE_PATTERN = /^UPE-([A-Za-z0-9]{8})$/;

/** Ticket ids are ULIDs; this only rejects absurd input before hitting SQLite. */
const MAX_TICKET_ID_LENGTH = 64;

/**
 * Strips the QR payload wrapper and checks the remainder is shaped like an
 * opaque token. Returns `null` for anything else, including a QR code that
 * encodes a URL or a WiFi password.
 *
 * Reuses `TICKET_QR_PREFIX` from the ticket service, so the format is defined in
 * exactly one place.
 */
export function parseQrToken(rawValue: string): string | null {
  const value = rawValue.trim();
  const withoutPrefix = value.startsWith(`${TICKET_QR_PREFIX}:`)
    ? value.slice(TICKET_QR_PREFIX.length + 1).trim()
    : value;

  return OPAQUE_TOKEN_PATTERN.test(withoutPrefix) ? withoutPrefix : null;
}

/**
 * Reads a reference typed off a printed ticket. Returns the uppercase token
 * prefix, or `null` when the value is not a reference.
 */
export function parseTicketReference(rawValue: string): string | null {
  const match = TICKET_REFERENCE_PATTERN.exec(rawValue.trim());

  return match ? match[1].toUpperCase() : null;
}

/**
 * Turns whatever the console sent into a credential.
 *
 * `qr_token` accepts both the bare token and the full `UPE1:` payload, because a
 * camera reads the whole encoded string and a staff member may well paste it
 * into the manual box.
 *
 * `ticket_id` is the manual fallback: the ticket ULID from the attendee's ticket
 * page, or the shorter `UPE-…` reference printed next to the QR code.
 */
export function buildTicketCredential(input: {
  qrToken?: unknown;
  ticketId?: unknown;
}): TicketCredential {
  const fromQr = typeof input.qrToken === "string" ? parseQrToken(input.qrToken) : null;

  if (typeof input.qrToken === "string" && fromQr) {
    return { kind: "qr_token", value: fromQr };
  }

  const manual = typeof input.ticketId === "string" ? input.ticketId.trim() : "";

  if (manual.length === 0 || manual.length > MAX_TICKET_ID_LENGTH) {
    // A non-empty `qr_token` that did not parse is a foreign QR code; an empty
    // or oversized `ticket_id` cannot match any row.
    return { kind: "unrecognized" };
  }

  // A ticket page can be copied in full, so tolerate the QR payload here too.
  const manualQrToken = parseQrToken(manual);

  if (manualQrToken) {
    return { kind: "qr_token", value: manualQrToken };
  }

  const reference = parseTicketReference(manual);

  if (reference) {
    return { kind: "ticket_reference", value: reference };
  }

  return { kind: "ticket_id", value: manual };
}

type ScannedTicket = {
  id: string;
  qrToken: string;
  status: string;
  checkedInAt: string | null;
  registrationStatus: string;
  eventId: string;
  eventTitle: string;
  eventStatus: string;
};

function credentialCondition(credential: TicketCredential) {
  switch (credential.kind) {
    case "qr_token":
      return eq(tickets.qrToken, credential.value);
    case "ticket_reference":
      // `ticketReference()` prints the first eight characters uppercased, so the
      // comparison is a case-insensitive prefix. Eight characters of a 43
      // character token is a demo convenience, not an identifier: the scan is
      // still validated against the organizer's own event below.
      return sql`lower(substr(${tickets.qrToken}, 1, 8)) = ${credential.value.toLowerCase()}`;
    case "ticket_id":
      return eq(tickets.id, credential.value);
    default:
      // Matches no row, so an unrecognized scan reads as an invalid ticket.
      return sql`1 = 0`;
  }
}

/**
 * The ticket a scan refers to, with the event it belongs to.
 *
 * Ownership (`events.organizerId`) is part of the `WHERE` clause rather than a
 * check afterwards, exactly like `getOrganizerEventDashboard`: a ticket outside
 * this organizer's events matches nothing, and the caller cannot tell that
 * apart from an id that never existed.
 */
function findTicketInTransaction(
  tx: DatabaseTransaction,
  organizerId: string,
  credential: TicketCredential,
): ScannedTicket | null {
  const [row] = tx
    .select({
      id: tickets.id,
      qrToken: tickets.qrToken,
      status: tickets.status,
      checkedInAt: tickets.checkedInAt,
      registrationStatus: registrations.status,
      eventId: events.id,
      eventTitle: events.title,
      eventStatus: events.status,
    })
    .from(tickets)
    .innerJoin(registrations, eq(tickets.registrationId, registrations.id))
    .innerJoin(events, eq(registrations.eventId, events.id))
    .where(and(credentialCondition(credential), eq(events.organizerId, organizerId)))
    .limit(1)
    .all();

  return row ?? null;
}

/**
 * `check_ins.ticket_id` is `NOT NULL` with a foreign key, so only scans against a
 * ticket that exists can be recorded. A typo'd ticket id therefore returns
 * `invalid_ticket` without leaving a row — the honest consequence of the existing
 * schema, and no fake sentinel ticket is created to work around it.
 */
function recordScanInTransaction(
  tx: DatabaseTransaction,
  input: { ticketId: string; scannedBy: string | null; result: CheckInResult; scannedAt: string },
): void {
  tx.insert(checkIns)
    .values({
      id: newId(),
      ticketId: input.ticketId,
      scannedBy: input.scannedBy,
      result: input.result,
      scannedAt: input.scannedAt,
    })
    .run();
}

/**
 * Why this ticket cannot be admitted, or `null` when it is still usable.
 *
 * `checked_in` is deliberately *not* a rejection here — that case is answered
 * separately so the duplicate notice can report when the ticket was first used.
 */
function rejectionReason(ticket: ScannedTicket): CheckInResult | null {
  if (ticket.status === "invalid") {
    return "invalid_ticket";
  }

  // A ticket exists only for a paid registration, but a registration can be
  // cancelled afterwards. A cancelled attendee must not be admitted.
  if (ticket.registrationStatus !== "paid") {
    return "invalid_ticket";
  }

  if (ticket.eventStatus === "cancelled") {
    return "invalid_ticket";
  }

  return null;
}

function outcome(input: {
  result: CheckInResult;
  scannedAt: string;
  checkedInAt: string | null;
  ticketId?: string;
  ticketReference?: string;
  eventId?: string;
  eventTitle?: string;
}): CheckInScanOutcome {
  return {
    result: input.result,
    scannedAt: input.scannedAt,
    checkedInAt: input.checkedInAt,
    ticketId: input.ticketId ?? null,
    ticketReference: input.ticketReference ?? null,
    eventId: input.eventId ?? null,
    eventTitle: input.eventTitle ?? null,
  };
}

/**
 * Processes one scan and reports what it means for the attendee.
 *
 * @param organizerId Authorization boundary. It owns the event, or the ticket is
 *   not visible to this caller at all. Supplied by the caller from the organizer
 *   cookie, never from a request field.
 * @param scannedBy Written to `check_ins.scanned_by`. There are no staff
 *   accounts in this phase, and organizer access is a demo selector rather than
 *   an authentication system, so the only identity that can honestly be
 *   recorded is the organization whose door did the scanning. An attendee session
 *   is a separate cookie for a separate role and is deliberately not mixed in.
 */
export async function scanTicket(input: {
  organizerId: string;
  scannedBy: string | null;
  credential: TicketCredential;
}): Promise<CheckInScanOutcome> {
  const scannedAt = toUtcTimestamp(new Date());

  return db.transaction(
    (tx) => {
      const ticket = findTicketInTransaction(tx, input.organizerId, input.credential);

      if (!ticket) {
        return outcome({ result: "invalid_ticket", scannedAt, checkedInAt: null });
      }

      const identity = {
        ticketId: ticket.id,
        ticketReference: ticketReference(ticket.qrToken),
        eventId: ticket.eventId,
        eventTitle: ticket.eventTitle,
      };

      const rejected = rejectionReason(ticket);

      if (rejected) {
        recordScanInTransaction(tx, {
          ticketId: ticket.id,
          scannedBy: input.scannedBy,
          result: rejected,
          scannedAt,
        });

        return outcome({ result: rejected, scannedAt, checkedInAt: null, ...identity });
      }

      // The atomic claim. `status = 'valid'` in the predicate is what makes a
      // ticket usable exactly once, even if two phones scan it at the same
      // moment: the update can only affect one row, and only one caller sees
      // `changes === 1`.
      const claimed = tx
        .update(tickets)
        .set({ status: "checked_in", checkedInAt: scannedAt })
        .where(and(eq(tickets.id, ticket.id), eq(tickets.status, "valid")))
        .run();

      if (claimed.changes === 1) {
        recordScanInTransaction(tx, {
          ticketId: ticket.id,
          scannedBy: input.scannedBy,
          result: "checked_in",
          scannedAt,
        });

        return outcome({ result: "checked_in", scannedAt, checkedInAt: scannedAt, ...identity });
      }

      // Lost the race, or the ticket was already used when it was read. Re-read
      // inside the same transaction so the duplicate is attributed to whichever
      // state actually won, and still log the rejected attempt.
      const [current] = tx
        .select({ status: tickets.status, checkedInAt: tickets.checkedInAt })
        .from(tickets)
        .where(eq(tickets.id, ticket.id))
        .all();

      const result: CheckInResult = current?.status === "checked_in" ? "already_used" : "invalid_ticket";

      recordScanInTransaction(tx, {
        ticketId: ticket.id,
        scannedBy: input.scannedBy,
        result,
        scannedAt,
      });

      return outcome({
        result,
        scannedAt,
        checkedInAt: current?.checkedInAt ?? null,
        ...identity,
      });
    },
    { behavior: "immediate" },
  );
}