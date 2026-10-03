import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { events, registrations, tickets } from "@/db/schema";
import type { RegistrationStatus, TicketStatus } from "@/db/enums";

/**
 * Where one attendee stands for one event: no registration yet, a seat held
 * awaiting payment, or paid with a ticket to show.
 *
 * One joined query, keyed by the public slug rather than a database id, so a
 * page never has to be handed an id from the browser.
 */

export type AttendeeEventState = {
  registrationId: string;
  registrationStatus: RegistrationStatus;
  /** Present once payment succeeded, i.e. once a ticket exists. */
  ticketId: string | null;
  ticketStatus: TicketStatus | null;
} | null;

export async function getAttendeeEventState(
  userId: string,
  eventSlug: string,
): Promise<AttendeeEventState> {
  const [row] = await db
    .select({
      registrationId: registrations.id,
      registrationStatus: registrations.status,
      ticketId: tickets.id,
      ticketStatus: tickets.status,
    })
    .from(registrations)
    .innerJoin(events, eq(registrations.eventId, events.id))
    .leftJoin(tickets, eq(tickets.registrationId, registrations.id))
    .where(and(eq(registrations.userId, userId), eq(events.slug, eventSlug)))
    .limit(1);

  return row ?? null;
}