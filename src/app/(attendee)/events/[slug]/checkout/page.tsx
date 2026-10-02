import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { formatTaka } from "@/lib/format";
import { requireCurrentUser } from "@/server/auth/session";
import { getPublishedEventBySlug } from "@/server/events/queries";
import { getAttendeeEventState } from "@/server/registrations/state";

import { EventDateTime } from "../../[slug]/event-date-time";
import { PayPanel } from "./pay-panel";

export const metadata: Metadata = {
  title: "Checkout",
};

type CheckoutPageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Mock upay checkout for an event the attendee is already registered for.
 *
 * A free event never needs this screen: registration completes on the event
 * page. Reaching checkout without a registration, or with one that is already
 * paid, sends the attendee back where they belong.
 */
export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { slug } = await params;

  const user = await requireCurrentUser(`/events/${slug}/checkout`);

  const event = await getPublishedEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const state = await getAttendeeEventState(user.id, slug);

  if (!state || state.registrationStatus === "cancelled") {
    redirect(`/events/${slug}`);
  }

  if (state.registrationStatus === "paid" && state.ticketId) {
    redirect(`/tickets/${state.ticketId}`);
  }

  if (event.priceTaka <= 0) {
    // Nothing to pay: send the attendee back to the event page, where a free
    // registration is completed without a payment step.
    redirect(`/events/${slug}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Checkout
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
        <p className="text-sm text-muted-foreground">
          <EventDateTime dateTime={event.dateTime} /> · {event.venue}
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold tracking-tight uppercase">Payment summary</h2>

        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Attendee</dt>
            <dd className="text-right">{user.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="text-right">{user.phone}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Ticket price</dt>
            <dd className="text-right">{formatTaka(event.priceTaka)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-border pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatTaka(event.priceTaka)}</dd>
          </div>
        </dl>

        <PayPanel eventSlug={event.slug} amountLabel={formatTaka(event.priceTaka)} />

        <p className="text-xs text-muted-foreground">
          Simulated upay checkout for this demo. No card or wallet details are collected, no
          upay account is touched, and no money moves. A successful payment issues your QR ticket
          immediately.
        </p>
      </section>

      <Link href={`/events/${event.slug}`} className="w-fit text-xs underline">
        Back to event
      </Link>
    </div>
  );
}