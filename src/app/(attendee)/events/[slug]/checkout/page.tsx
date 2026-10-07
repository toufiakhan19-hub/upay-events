import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { CategoryTile } from "@/components/ui/category-tile";
import { ArrowLeftIcon } from "@/components/ui/icons";
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
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <Link
        href={`/events/${event.slug}`}
        className="flex w-fit items-center gap-1 text-xs font-bold text-upay-blue hover:underline"
      >
        <ArrowLeftIcon className="size-4" />
        Back to event
      </Link>

      <Card className="event-card flex items-center gap-4 p-3">
        <CategoryTile category={event.category} className="size-20 shrink-0 rounded-2xl" iconClassName="size-8" />
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-upay-blue/70 uppercase">
            Checkout
          </p>
          <h1 className="truncate text-lg font-extrabold tracking-tight text-upay-navy">
            {event.title}
          </h1>
          <p className="text-xs font-medium text-upay-navy/55">
            <EventDateTime dateTime={event.dateTime} /> · {event.venue}
          </p>
        </div>
      </Card>

      <Card as="section" className="flex flex-col gap-5 p-5 lg:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-logo bg-upay-yellow text-lg font-black text-upay-blue shadow-logo">
            U
          </span>
          <h2 className="text-sm font-extrabold text-upay-navy">Payment summary</h2>
        </div>

        <dl className="flex flex-col gap-2.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-upay-navy/50">Attendee</dt>
            <dd className="text-right font-semibold text-upay-navy">{user.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-upay-navy/50">Phone</dt>
            <dd className="text-right font-semibold text-upay-navy">{user.phone}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-upay-navy/50">Ticket price</dt>
            <dd className="text-right font-semibold text-upay-navy">
              {formatTaka(event.priceTaka)}
            </dd>
          </div>
          <div className="mt-1 flex items-end justify-between gap-4 border-t border-dashed border-upay-blue/15 pt-3">
            <dt className="font-bold text-upay-navy">Total</dt>
            <dd className="text-2xl font-extrabold text-upay-blue">{formatTaka(event.priceTaka)}</dd>
          </div>
        </dl>

        <PayPanel eventSlug={event.slug} amountLabel={formatTaka(event.priceTaka)} />

        <p className="rounded-2xl bg-upay-blue-soft p-3 text-xs font-medium text-upay-navy/65">
          Simulated upay checkout for this demo. No card or wallet details are collected, no
          upay account is touched, and no money moves. A successful payment issues your QR ticket
          immediately.
        </p>
      </Card>
    </div>
  );
}