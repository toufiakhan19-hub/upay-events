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

/** Registrations that hold a seat: everything except a cancellation. */
function heldSeatsFilter(eventId: string) {
  return and(eq(registrations.eventId, eventId), ne(registrations.status, "cancelled"));
}

function countHeldSeatsInTransaction(tx: DatabaseTransaction, eventId: string): number {
  const [row] = tx
    .select({ taken: count() })
    .from(registrations)
    .where(heldSeatsFilter(eventId))
    .all();

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
 * `BEGIN IMMEDIATE` transaction. Taking the write lock up front is what stops
 * the classic oversell: two requests cannot both read "one seat left", both
 * wait, and both insert.
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
    return db.transaction(
      (tx) => {
        const [existing] = tx
          .select({ id: registrations.id })
          .from(registrations)
          .where(
            and(eq(registrations.userId, input.userId), eq(registrations.eventId, event.id)),
          )
          .all();

        if (existing) {
          return { ok: false as const, reason: "already_registered" as const };
        }

        if (countHeldSeatsInTransaction(tx, event.id) >= event.capacity) {
          return { ok: false as const, reason: "event_full" as const };
        }

        tx.insert(registrations)
          .values({
            id: registrationId,
            userId: input.userId,
            eventId: event.id,
            status: "pending_payment",
            daysBeforeEvent: daysUntil(event.dateTime, now),
          })
          .run();

        if (initiation) {
          initiatePaymentInTransaction(tx, {
            registrationId,
            amountTaka: event.priceTaka,
            providerReference: initiation.providerReference,
          });

          return {
            ok: true as const,
            registrationId,
            status: "pending_payment" as const,
            ticketId: null,
          };
        }

        // Free event: no payment step, so finish inside the same transaction.
        const { ticket } = completeRegistrationInTransaction(tx, {
          registrationId,
          amountTaka: 0,
          transactionId: null,
          paidAt: now,
        });

        return {
          ok: true as const,
          registrationId,
          status: "paid" as const,
          ticketId: ticket.id,
        };
      },
      { behavior: "immediate" },
    );
  } catch (error: unknown) {
    // `registrations_user_event_unique` is the last line of defence against a
    // duplicate registration (PRD §12). Concurrent requests can both pass the
    // check above — the write lock normally prevents that — and the loser lands
    // here.
    if (isUniqueConstraintError(error)) {
      return { ok: false, reason: "already_registered" };
    }

    throw error;
  }
}

/** True for SQLite's unique and primary-key violations only. */
function isUniqueConstraintError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  const code = String((error as { code: unknown }).code);

  return code === "SQLITE_CONSTRAINT_UNIQUE" || code === "SQLITE_CONSTRAINT_PRIMARYKEY";
}