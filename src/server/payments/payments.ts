import "server-only";

import { eq } from "drizzle-orm";

import type { DatabaseTransaction } from "@/db/client";
import { db } from "@/db/client";
import { payments } from "@/db/schema";
import { newId } from "@/lib/ids";
import { toUtcTimestamp } from "@/lib/time";

/**
 * Writes to the `payments` table.
 *
 * One payment row per registration, enforced by `payments_registration_unique`,
 * so every writer here is an upsert rather than an insert. That is what makes a
 * retried payment safe: the second attempt updates the same row instead of
 * creating a second payment.
 *
 * All writers take a transaction handle so payment state can only change
 * together with the registration and ticket rows it belongs to.
 */

/** Payment opened, awaiting capture. Written when a registration is created. */
export async function initiatePaymentInTransaction(
  tx: DatabaseTransaction,
  input: { registrationId: string; amountTaka: number; providerReference: string },
): Promise<void> {
  await tx
    .insert(payments)
    .values({
      id: newId(),
      registrationId: input.registrationId,
      amountTaka: input.amountTaka,
      status: "pending",
      mockTransactionId: input.providerReference,
    })
    .onConflictDoNothing({ target: payments.registrationId });
}

/**
 * Payment attempt failed. The registration stays `pending_payment`, so the
 * attendee can retry, and no ticket exists.
 *
 * `mockTransactionId` is cleared: nothing was transacted, so there is no
 * transaction id to keep.
 */
export async function failPaymentInTransaction(
  tx: DatabaseTransaction,
  input: { registrationId: string; amountTaka: number },
): Promise<void> {
  await tx
    .insert(payments)
    .values({
      id: newId(),
      registrationId: input.registrationId,
      amountTaka: input.amountTaka,
      status: "failed",
      mockTransactionId: null,
    })
    .onConflictDoUpdate({
      target: payments.registrationId,
      set: { status: "failed", mockTransactionId: null },
    });
}

/**
 * Payment captured successfully.
 *
 * `transactionId` is the mock provider's opaque handle, or `null` for a free
 * registration, which is recorded as a zero-value successful payment so the
 * invariant "a ticket exists only when a payment succeeded" stays in one place.
 */
export async function succeedPaymentInTransaction(
  tx: DatabaseTransaction,
  input: {
    registrationId: string;
    amountTaka: number;
    transactionId: string | null;
    paidAt: Date;
  },
): Promise<void> {
  await tx
    .insert(payments)
    .values({
      id: newId(),
      registrationId: input.registrationId,
      amountTaka: input.amountTaka,
      status: "success",
      mockTransactionId: input.transactionId,
      paidAt: toUtcTimestamp(input.paidAt),
    })
    .onConflictDoUpdate({
      target: payments.registrationId,
      set: {
        status: "success",
        amountTaka: input.amountTaka,
        mockTransactionId: input.transactionId,
        paidAt: toUtcTimestamp(input.paidAt),
      },
    });
}

/** The payment row for a registration, if one exists. */
export async function readPayment(registrationId: string) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.registrationId, registrationId))
    .limit(1);

  return payment ?? null;
}
