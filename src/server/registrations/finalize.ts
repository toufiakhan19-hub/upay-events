import "server-only";

import { eq } from "drizzle-orm";

import type { DatabaseTransaction } from "@/db/client";
import { registrations } from "@/db/schema";
import { succeedPaymentInTransaction } from "@/server/payments/payments";
import { issueTicketInTransaction, type IssuedTicket } from "@/server/tickets/tickets";

/**
 * Turns a held registration into a paid registration with a ticket.
 *
 * One `better-sqlite3` transaction covers all three writes, so the app can
 * never end up with a paid registration and no ticket, or a ticket whose
 * payment failed. It must always be called inside a transaction opened by the
 * caller (`src/server/payments/checkout.ts` or `src/server/registrations/`),
 * never on its own.
 *
 * Idempotent by construction: a registration that is already `paid` returns its
 * existing ticket and writes nothing, which is what makes a double-clicked
 * payment button or a page refresh safe.
 */

export type CompletionResult = {
  ticket: IssuedTicket;
  /** True when the registration was already paid and nothing was written. */
  replayed: boolean;
};

export function completeRegistrationInTransaction(
  tx: DatabaseTransaction,
  input: {
    registrationId: string;
    /** Integer Taka read from the event row, never from the browser. */
    amountTaka: number;
    /** Opaque provider transaction id, or `null` for a free registration. */
    transactionId: string | null;
    paidAt: Date;
  },
): CompletionResult {
  const [registration] = tx
    .select({ id: registrations.id, status: registrations.status })
    .from(registrations)
    .where(eq(registrations.id, input.registrationId))
    .all();

  if (!registration) {
    throw new Error("Cannot complete a registration that does not exist.");
  }

  if (registration.status === "cancelled") {
    throw new Error("Cannot complete a cancelled registration.");
  }

  // Already paid: the payment and ticket exist. Returning them keeps a repeated
  // submission idempotent instead of issuing a second ticket.
  if (registration.status === "paid") {
    return { ticket: issueTicketInTransaction(tx, registration.id), replayed: true };
  }

  succeedPaymentInTransaction(tx, {
    registrationId: registration.id,
    amountTaka: input.amountTaka,
    transactionId: input.transactionId,
    paidAt: input.paidAt,
  });

  tx.update(registrations)
    .set({ status: "paid" })
    .where(eq(registrations.id, registration.id))
    .run();

  return { ticket: issueTicketInTransaction(tx, registration.id), replayed: false };
}