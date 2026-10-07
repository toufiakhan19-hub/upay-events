import "server-only";

import { and, count, eq, ne } from "drizzle-orm";

import { db, type DatabaseTransaction } from "@/db/client";
import { events, registrations } from "@/db/schema";
import { newId } from "@/lib/ids";
import { getPaymentAdapter } from "@/server/payments";
import { initiatePaymentInTransaction } from "@/server/payments/payments";

import { completeRegistrationInTransaction } from "./finalize";

/**
 * Creating an attendee registration.
 *
 * Capacity policy for this phase: **every non-cancelled registration holds a
 * seat**, `pending_payment` included, because a pending registration is a seat
 * held while the attendee completes payment. Cancelled registrations release
 * their seat. No reservation timeout is implemented — that belongs to a later
 * phase and would need its own status handling.
 *
 * Everything is decided from server-side state: the attendee comes from the
 * session, the event and its price come from the database by slug, and capacity
 * is counted inside the transaction. No value submitted by the browser decides
 * anything.
 */

export type RegistrationFailureReason =
  | "event_not_found"
  | "event_not_published"
  | "already_registered"
  | "event_full";

export type RegisterResult =
  | {
      ok: true;
      registrationId: string;
      /** `paid` for a free event, `pending_payment` when payment is still due. */
      status: "paid" | "pending_payment";
      /** Set when a free event completed immediately. */
      ticketId: string | null;
    }
  | { ok: false; reason: RegistrationFailureReason };

/**
 * Registrations that hold a seat: everything except a cancellation.
 *
 * Exported as its own condition because the organizer dashboard reports the
 * same capacity rule from a grouped query over many events
 * (`src/server/organizers/queries.ts`). One definition, two callers.
 */
export function heldSeatCondition() {
  return ne(registrations.status, "cancelled");
}

/** Registrations that hold a seat for one event. */
export function heldSeatsFilter(eventId: string) {
  return and(eq(registrations.eventId, eventId), heldSeatCondition());
}

async function countHeldSeatsInTransaction(
  tx: DatabaseTransaction,
  eventId: string,
): Promise<number> {
  const [row] = await tx
    .select({ taken: count() })
    .from(registrations)
    .where(heldSeatsFilter(eventId));

  return row?.taken ?? 0;
}

/** Seats currently held for an event, for display next to the capacity. */
export async function countHeldSeats(eventId: string): Promise<number> {
  const [row] = await db
    .select({ taken: count() })
    .from(registrations)
    .where(heldSeatsFilter(eventId));

  return row?.taken ?? 0;
}

/** Whole days between registration and the event; an AI input feature. */
function daysUntil(dateTime: string, now: Date): number {
  const eventDate = new Date(dateTime).getTime();

  if (Number.isNaN(eventDate)) {
    return 0;
  }

  return Math.max(0, Math.floor((eventDate - now.getTime()) / 86_400_000));
}

/**
 * Registers the attendee for the published event identified by `eventSlug`.
 *
 * The duplicate check, the capacity check, and every write run inside one
 * transaction that first locks the event row `FOR UPDATE`. Registrations for the
 * same event are therefore serialized, which is what stops the classic oversell:
 * two requests cannot both read "one seat left" and both insert.
 */
export async function registerForEvent(input: {
  userId: string;
  eventSlug: string;
}): Promise<RegisterResult> {
  const [event] = await db
    .select({
      id: events.id,
      capacity: events.capacity,
      priceTaka: events.priceTaka,
      dateTime: events.dateTime,
      status: events.status,
    })
    .from(events)
    .where(eq(events.slug, input.eventSlug))
    .limit(1);

  if (!event) {
    return { ok: false, reason: "event_not_found" };
  }

  if (event.status !== "published") {
    return { ok: false, reason: "event_not_published" };
  }

  const now = new Date();
  // Pre-generated so the payment adapter can use it as its idempotency key.
  const registrationId = newId();
  const isFree = event.priceTaka <= 0;

  // A paid event opens its payment attempt now; a free event has none.
  const initiation = isFree
    ? null
    : await getPaymentAdapter().initiate({
        amountTaka: event.priceTaka,
        reference: registrationId,
      });

  try {
    return await db.transaction(async (tx): Promise<RegisterResult> => {
      await tx
        .select({ id: events.id })
        .from(events)
        .where(eq(events.id, event.id))
        .for("update");

      const [existing] = await tx
        .select({ id: registrations.id })
        .from(registrations)
        .where(and(eq(registrations.userId, input.userId), eq(registrations.eventId, event.id)))
        .limit(1);

      if (existing) {
        return { ok: false, reason: "already_registered" };
      }

      if ((await countHeldSeatsInTransaction(tx, event.id)) >= event.capacity) {
        return { ok: false, reason: "event_full" };
      }

      await tx.insert(registrations).values({
        id: registrationId,
        userId: input.userId,
        eventId: event.id,
        status: "pending_payment",
        daysBeforeEvent: daysUntil(event.dateTime, now),
      });

      if (initiation) {
        await initiatePaymentInTransaction(tx, {
          registrationId,
          amountTaka: event.priceTaka,
          providerReference: initiation.providerReference,
        });

        return { ok: true, registrationId, status: "pending_payment", ticketId: null };
      }

      // Free event: no payment step, so finish inside the same transaction.
      const { ticket } = await completeRegistrationInTransaction(tx, {
        registrationId,
        amountTaka: 0,
        transactionId: null,
        paidAt: now,
      });

      return { ok: true, registrationId, status: "paid", ticketId: ticket.id };
    });
  } catch (error: unknown) {
    // `registrations_user_event_unique` is the last line of defence against a
    // duplicate registration (PRD §12). The event lock normally prevents two
    // concurrent requests from both passing the check above; a loser lands here.
    if (isUniqueConstraintError(error)) {
      return { ok: false, reason: "already_registered" };
    }

    throw error;
  }
}

/** Postgres `unique_violation` (SQLSTATE 23505), possibly wrapped by Drizzle. */
function isUniqueConstraintError(error: unknown): boolean {
  for (let current: unknown = error; current; current = (current as { cause?: unknown }).cause) {
    if (typeof current !== "object") {
      return false;
    }

    if ((current as { code?: unknown }).code === "23505") {
      return true;
    }
  }

  return false;
}