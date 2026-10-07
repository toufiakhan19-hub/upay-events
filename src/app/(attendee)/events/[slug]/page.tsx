import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  categoryLabel,
  formatEventDate,
  formatEventTime,
  formatTaka,
  locationTypeLabel,
} from "@/lib/format";
import { requireCurrentUser } from "@/server/auth/session";
import { getPublishedEventBySlug } from "@/server/events/queries";
import { countHeldSeats } from "@/server/registrations/registrations";
import { getAttendeeEventState } from "@/server/registrations/state";

import { EventDateTime } from "./event-date-time";
import { RegisterButton } from "./register-button";
import { ShareEvent } from "./share-event";

type EventPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);

  return { title: event ? event.title : "Event not found" };
}

/**
 * Event detail with the attendee's registration state.
 *
 * The CTA is decided on the server: a new attendee gets a register button, a
 * pending registration gets a payment link, and a paid registration gets a link
 * to the ticket. Nothing here trusts a price, capacity, or user id from the
 * browser.
 */
export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;

  const user = await requireCurrentUser(`/events/${slug}`);

  const event = await getPublishedEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const [state, seatsHeld] = await Promise.all([
    getAttendeeEventState(user.id, slug),
    countHeldSeats(event.id),
  ]);

  const remaining = Math.max(0, event.capacity - seatsHeld);
  const isFree = event.priceTaka <= 0;
  const isFull = remaining === 0 && state?.registrationStatus !== "paid";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {categoryLabel(event.category)}
          </span>
          <span className="text-xs text-muted-foreground">
            {locationTypeLabel(event.locationType)}
          </span>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight">{event.title}</h1>

        <p className="text-sm text-muted-foreground">Hosted by {event.organizerName}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <dl className="flex flex-col gap-4 rounded-xl border border-border p-5 text-sm">
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Date and time</dt>
            <dd>
              <EventDateTime dateTime={event.dateTime} />
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Venue</dt>
            <dd>{event.venue}</dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Location type</dt>
            <dd>{locationTypeLabel(event.locationType)}</dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Capacity</dt>
            <dd>
              {event.capacity.toLocaleString("en-US")} seats ·{" "}
              {remaining === 0 ? "none left" : `${remaining} left`}
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Ticket price</dt>
            <dd>{formatTaka(event.priceTaka)}</dd>
          </div>
        </dl>

        <aside className="flex h-fit flex-col gap-3 rounded-xl border border-border p-5">
          <p className="text-2xl font-semibold">{formatTaka(event.priceTaka)}</p>

          {state?.registrationStatus === "paid" && state.ticketId ? (
            <>
              <Link
                href={`/tickets/${state.ticketId}`}
                className="w-full rounded-md bg-brand px-4 py-2.5 text-center text-sm font-semibold text-brand-foreground hover:opacity-90"
              >
                View ticket
              </Link>
              <p className="text-xs text-muted-foreground">
                You are registered{isFree ? "" : " and paid"}. Your QR ticket is ready.
              </p>
            </>
          ) : state?.registrationStatus === "pending_payment" ? (
            <>
              <Link
                href={`/events/${event.slug}/checkout`}
                className="w-full rounded-md bg-brand px-4 py-2.5 text-center text-sm font-semibold text-brand-foreground hover:opacity-90"
              >
                Continue to payment
              </Link>
              <p className="text-xs text-muted-foreground">
                Your seat is held. Pay with upay to get your QR ticket.
              </p>
            </>
          ) : state?.registrationStatus === "cancelled" ? (
            <p className="text-xs text-muted-foreground">
              Your registration for this event was cancelled. Contact the organizer if that looks
              wrong.
            </p>
          ) : isFull ? (
            <>
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-md border border-border px-4 py-2.5 text-sm font-semibold opacity-60"
              >
                Event is full
              </button>
              <p className="text-xs text-muted-foreground">
                All {event.capacity.toLocaleString("en-US")} seats are taken.
              </p>
            </>
          ) : (
            <>
              <RegisterButton eventSlug={event.slug} isFree={isFree} />
              <p className="text-xs text-muted-foreground">
                {isFree
                  ? "Free event. Your QR ticket is issued immediately."
                  : "Payment is simulated in this demo. No money moves and no card details are collected."}
              </p>
            </>
          )}

          <ShareEvent
            slug={event.slug}
            title={event.title}
            when={`${formatEventDate(event.dateTime)}, ${formatEventTime(event.dateTime)}`}
          />

          <Link href="/events" className="text-xs underline">
            Back to all events
          </Link>
        </aside>
      </div>
    </div>
  );
}