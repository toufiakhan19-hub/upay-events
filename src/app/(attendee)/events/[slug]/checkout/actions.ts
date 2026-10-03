"use server";

import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/server/auth/session";
import { payForRegistration } from "@/server/payments/checkout";

/**
 * "Pay with upay" on the checkout page.
 *
 * Only the event slug and the requested simulation reach the action: the
 * attendee comes from the session, the amount comes from the event row, and the
 * mock adapter is the only thing that can mark a payment successful.
 */

export type PayActionState = {
  error: string | null;
};

export async function payAction(
  _previousState: PayActionState,
  formData: FormData,
): Promise<PayActionState> {
  const user = await requireCurrentUser();
  const eventSlug = formData.get("slug");
  const requested = formData.get("outcome");

  if (typeof eventSlug !== "string" || eventSlug.length === 0) {
    return { error: "That payment request was incomplete. Try again." };
  }

  const result = await payForRegistration({
    userId: user.id,
    eventSlug,
    // Only the mock provider understands this field; a real adapter ignores it.
    simulate: requested === "failure" ? "failure" : "success",
  });

  if (!result.ok) {
    return { error: result.message };
  }

  redirect(`/tickets/${result.ticketId}`);
}