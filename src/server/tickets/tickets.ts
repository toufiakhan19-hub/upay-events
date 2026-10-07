import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db, type DatabaseTransaction } from "@/db/client";
import { events, registrations, tickets, users } from "@/db/schema";
import type { TicketStatus } from "@/db/enums";
import { newId, newOpaqueToken } from "@/lib/ids";

/**
 * Ticket issuing and lookup.
 *
 * A ticket is a bearer credential for future check-in: it carries a random QR
 * token and nothing else. Name, phone, and payment data stay in their own
 * tables and are resolved by joining when a ticket is rendered (PRD §14).
 *
 * Check-in is not implemented in this phase, so `checked_in` and `invalid` are
 * never written here — those column values are only honoured when read.
 */

/** Version tag inside the QR payload so a future scanner can route formats. */
export const TICKET_QR_PREFIX = "UPE1";

export type IssuedTicket = {
  id: string;
  registrationId: string;
  qrToken: string;
};

export type TicketSummary = {
  id: string;
  status: TicketStatusValue;
  eventTitle: string;
  eventSlug: string;
  dateTime: string;
  venue: string;
};

export type TicketDetail = TicketSummary & {
  qrToken: string;
  attendeeName: string;
  issuedAt: string;
};

type TicketStatusValue = TicketStatus;

/** Human-facing reference. Derived from the token, far too short to be scanned. */
export function ticketReference(qrToken: string): string {
  return `UPE-${qrToken.slice(0, 8).toUpperCase()}`;
}

/** Exactly what the QR code encodes: a version tag and the opaque token. */
export function ticketQrPayload(qrToken: string): string {
  return `${TICKET_QR_PREFIX}:${qrToken}`;
}

/**
 * Issues the single ticket for a registration, or returns the existing one.
 *
 * Runs inside the caller's transaction so a ticket can never exist without the
 * payment that justified it, and vice versa. `tickets_registration_unique` is
 * the final guarantee of exactly one ticket per registration.
 */
export async function issueTicketInTransaction(
  tx: DatabaseTransaction,
  registrationId: string,
): Promise<IssuedTicket> {
  const [existing] = await tx
    .select({ id: tickets.id, registrationId: tickets.registrationId, qrToken: tickets.qrToken })
    .from(tickets)
    .where(eq(tickets.registrationId, registrationId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const ticket: IssuedTicket = {
    id: newId(),
    registrationId,
    qrToken: newOpaqueToken(),
  };

  await tx.insert(tickets).values({
    id: ticket.id,
    registrationId: ticket.registrationId,
    qrToken: ticket.qrToken,
    status: "valid",
  });

  return ticket;
}

/** Current user's tickets, soonest event first. */
export async function listTicketsForUser(userId: string): Promise<TicketSummary[]> {
  return db
    .select({
      id: tickets.id,
      status: tickets.status,
      eventTitle: events.title,
      eventSlug: events.slug,
      dateTime: events.dateTime,
      venue: events.venue,
    })
    .from(tickets)
    .innerJoin(registrations, eq(tickets.registrationId, registrations.id))
    .innerJoin(events, eq(registrations.eventId, events.id))
    .where(eq(registrations.userId, userId))
    .orderBy(asc(events.dateTime));
}

/**
 * One ticket, only if it belongs to `userId`.
 *
 * Ownership is part of the query rather than a check afterwards, so a request
 * for someone else's ticket matches no row and the caller answers 404 instead
 * of revealing that the id exists.
 */
export async function getTicketForUser(
  ticketId: string,
  userId: string,
): Promise<TicketDetail | null> {
  const [ticket] = await db
    .select({
      id: tickets.id,
      status: tickets.status,
      qrToken: tickets.qrToken,
      issuedAt: tickets.issuedAt,
      eventTitle: events.title,
      eventSlug: events.slug,
      dateTime: events.dateTime,
      venue: events.venue,
      attendeeName: users.name,
    })
    .from(tickets)
    .innerJoin(registrations, eq(tickets.registrationId, registrations.id))
    .innerJoin(events, eq(registrations.eventId, events.id))
    .innerJoin(users, eq(registrations.userId, users.id))
    .where(and(eq(tickets.id, ticketId), eq(registrations.userId, userId)))
    .limit(1);

  return ticket ?? null;
}