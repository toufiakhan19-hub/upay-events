import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { events, registrations, tickets } from "@/db/schema";
import type { RegistrationStatus } from "@/db/enums";
import { completeRegistrationInTransaction } from "@/server/registrations/finalize";

import { getPaymentAdapter, type PaymentSimulation } from "./index";
import { failPaymentInTransaction, readPayment } from "./payments";

/**
 * Mock upay checkout orchestration.
 *
 * The adapter decides success or failure; this module owns the database. That
 * split is the point of the abstraction — a real provider returns the same
 * `PaymentCapture` shape and nothing below this file changes.
 *
 * Idempotency, layered:
 * 1. an already-`paid` registration is answered from the existing ticket before
 *    the adapter is called, so a refresh never charges again;
 * 2. the provider call and the write are separated, and the write re-reads the
 *    registration `FOR UPDATE` inside a transaction, so two simultaneous
 *    submissions cannot both flip it to `paid`;
 * 3. `payments_registration_unique` allows one payment row per registration and
 *    `tickets_registration_unique` one ticket, so even a lost race updates the
 *    existing rows rather than adding new ones.
 */

export type CheckoutFailureReason =
  | "event_not_found"
  | "event_not_published"
  | "not_registered"
  | "registration_cancelled"
  | "payment_failed";

export type PayResult =
  | { ok: true; ticketId: string; replayed: boolean }
  | {
      ok: false;
      reason: CheckoutFailureReason;
      /** Attendee-safe explanation, shown verbatim on the checkout page. */
      message: string;
    };

type CheckoutTarget = {
  registrationId: string;
  /** Price read from the event row. Never a value from the browser. */
  priceTaka: number;
  status: RegistrationStatus;
  ticketId: string | null;
};

type TargetFailure = { ok: false; reason: CheckoutFailureReason; message: string };

/**
 * Resolves the attendee's registration for an event from server-side state:
 * session user, database event, database registration. The browser only ever
 * supplies the public event slug.
 */
async function resolveTarget(
  userId: string,
  eventSlug: string,
): Promise<{ ok: true; target: CheckoutTarget } | TargetFailure> {
  const [event] = await db
    .select({ id: events.id, status: events.status, priceTaka: events.priceTaka })
    .from(events)
    .where(eq(events.slug, eventSlug))
    .limit(1);

  if (!event) {
    return { ok: false, reason: "event_not_found", message: "That event no longer exists." };
  }

  if (event.status !== "published") {
    return {
      ok: false,
      reason: "event_not_published",
      message: "That event is not open for registration.",
    };
  }

  const [registration] = await db
    .select({
      registrationId: registrations.id,
      status: registrations.status,
      ticketId: tickets.id,
    })
    .from(registrations)
    .leftJoin(tickets, eq(tickets.registrationId, registrations.id))
    .where(and(eq(registrations.userId, userId), eq(registrations.eventId, event.id)))
    .limit(1);

  if (!registration) {
    return {
      ok: false,
      reason: "not_registered",
      message: "Register for the event before paying for it.",
    };
  }

  return {
    ok: true,
    target: {
      registrationId: registration.registrationId,
      priceTaka: event.priceTaka,
      status: registration.status,
      ticketId: registration.ticketId,
    },
  };
}

/**
 * Pays for a held registration and issues the ticket.
 *
 * `simulate` only reaches the mock adapter; a real integration ignores it and
 * reports whatever the provider decided.
 */
export async function payForRegistration(input: {
  userId: string;
  eventSlug: string;
  simulate?: PaymentSimulation;
}): Promise<PayResult> {
  const resolved = await resolveTarget(input.userId, input.eventSlug);

  if (!resolved.ok) {
    return resolved;
  }

  const target = resolved.target;

  if (target.status === "cancelled") {
    return {
      ok: false,
      reason: "registration_cancelled",
      message: "That registration was cancelled, so it cannot be paid.",
    };
  }

  if (target.status === "paid" && target.ticketId) {
    return { ok: true, ticketId: target.ticketId, replayed: true };
  }

  // Free event reaching checkout, or a paid registration whose ticket is
  // missing: finish it here instead of pretending there is a payment to take.
  if (target.priceTaka <= 0 || target.status === "paid") {
    return completeRegistration(target.registrationId, 0, null, new Date());
  }

  const payment = await readPayment(target.registrationId);

  const capture = await getPaymentAdapter().capture({
    amountTaka: target.priceTaka,
    providerReference: payment?.mockTransactionId ?? `mock_pi_${target.registrationId}`,
    reference: target.registrationId,
    simulate: input.simulate,
  });

  if (capture.status === "failed") {
    await db.transaction((tx) =>
      failPaymentInTransaction(tx, {
        registrationId: target.registrationId,
        amountTaka: target.priceTaka,
      }),
    );

    return { ok: false, reason: "payment_failed", message: capture.message };
  }

  return completeRegistration(
    target.registrationId,
    target.priceTaka,
    capture.transactionId,
    capture.capturedAt,
  );
}

/**
 * The successful path: payment success, registration `paid`, and the ticket are
 * written in one transaction, so a failure leaves nothing behind.
 */
async function completeRegistration(
  registrationId: string,
  amountTaka: number,
  transactionId: string | null,
  paidAt: Date,
): Promise<PayResult> {
  const completed = await db.transaction((tx) =>
    completeRegistrationInTransaction(tx, {
      registrationId,
      amountTaka,
      transactionId,
      paidAt,
    }),
  );

  return { ok: true, ticketId: completed.ticket.id, replayed: completed.replayed };
}