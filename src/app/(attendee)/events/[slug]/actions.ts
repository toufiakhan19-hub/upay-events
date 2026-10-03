"use server";

import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/server/auth/session";
import { registerForEvent, type RegistrationFailureReason } from "@/server/registrations/registrations";

/**
 * "Register" on the event page.
 *
 * The form submits nothing but the event slug; the attendee comes from the
 * session and the event, price, and capacity are read from the database inside
 * `registerForEvent`. A free event completes in the same transaction and lands
 * on the ticket; a paid event holds the seat and moves to checkout.
 */

export type RegisterActionState = {
  error: string | null;
};

const ERRORS: Record<RegistrationFailureReason, string> = {
  event_not_found: "That event no longer exists.",
  event_not_published: "That event is not open for registration.",
  already_registered: "You are already registered for this event.",
  event_full: "This event is full. No seats are left.",
};

export async function registerAction(
  _previousState: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  const user = await requireCurrentUser();
  const eventSlug = formData.get("slug");

  if (typeof eventSlug !== "string" || eventSlug.length === 0) {
    return { error: "That registration request was incomplete. Try again." };
  }

  const result = await registerForEvent({ userId: user.id, eventSlug });

  if (!result.ok) {
    return { error: ERRORS[result.reason] };
  }

  // Free event: the ticket already exists. Paid event: go pay for the seat.
  redirect(result.ticketId ? `/tickets/${result.ticketId}` : `/events/${eventSlug}/checkout`);
}