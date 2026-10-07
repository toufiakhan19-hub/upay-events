import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonClass } from "@/components/ui/button-styles";
import { Card } from "@/components/ui/card";
import { CategoryTile } from "@/components/ui/category-tile";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CompassIcon,
  PinIcon,
  TicketIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
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

  const details = [
    { icon: CalendarIcon, label: "Date and time", value: <EventDateTime dateTime={event.dateTime} /> },
    { icon: PinIcon, label: "Venue", value: event.venue },
    { icon: CompassIcon, label: "Location type", value: locationTypeLabel(event.locationType) },
    {
      icon: UsersIcon,
      label: "Capacity",
      value: `${event.capacity.toLocaleString("en-US")} seats · ${remaining === 0 ? "none left" : `${remaining} left`}`,
    },
    { icon: TicketIcon, label: "Ticket price", value: formatTaka(event.priceTaka) },
  ];
  const noteClass = "text-xs font-medium text-upay-navy/55";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/events"
        className="flex w-fit items-center gap-1 text-xs font-bold text-upay-blue hover:underline"
      >
        <ArrowLeftIcon className="size-4" />
        All events
      </Link>

      <CategoryTile
        category={event.category}
        className="min-h-56 rounded-hero shadow-hero lg:min-h-72"
        iconClassName="size-20 lg:size-28"
      >
        <div className="flex h-full min-h-56 flex-col justify-end gap-3 p-6 pr-24 text-white lg:min-h-72 lg:p-9 lg:pr-40">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="white">{categoryLabel(event.category)}</Pill>
            <Pill tone="white">{locationTypeLabel(event.locationType)}</Pill>
          </div>
          <h1 className="max-w-2xl text-[1.75rem] leading-tight font-extrabold tracking-tight drop-shadow lg:text-4xl">
            {event.title}
          </h1>
          <p className="text-sm font-semibold text-white/85">Hosted by {event.organizerName}</p>
        </div>
      </CategoryTile>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card as="section" className="p-5 lg:p-6">
          <h2 className="mb-4 text-sm font-extrabold text-upay-navy">Event details</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            {details.map(({ icon: DetailIcon, label, value }) => (
              <div key={label} className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-upay-blue-soft text-upay-blue">
                  <DetailIcon className="size-4" />
                </span>
                <div className="min-w-0">
                  <dt className="text-[0.6875rem] font-semibold tracking-wide text-upay-navy/45 uppercase">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-sm font-bold text-upay-navy">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </Card>

        <aside className="event-card flex h-fit flex-col gap-4 rounded-card p-5 shadow-card lg:sticky lg:top-8">
          <div>
            <p className="text-[0.6875rem] font-semibold tracking-wide text-upay-navy/40 uppercase">
              Entry
            </p>
            <p className="text-3xl font-extrabold text-upay-blue">{formatTaka(event.priceTaka)}</p>
          </div>

          {state?.registrationStatus === "paid" && state.ticketId ? (
            <>
              <Link
                href={`/tickets/${state.ticketId}`}
                className={buttonClass("blue", "lg", "w-full font-extrabold")}
              >
                View ticket
              </Link>
              <p className={noteClass}>
                You are registered{isFree ? "" : " and paid"}. Your QR ticket is ready.
              </p>
            </>
          ) : state?.registrationStatus === "pending_payment" ? (
            <>
              <Link
                href={`/events/${event.slug}/checkout`}
                className={buttonClass("primary", "lg", "w-full font-extrabold")}
              >
                Continue to payment
              </Link>
              <p className={noteClass}>Your seat is held. Pay with upay to get your QR ticket.</p>
            </>
          ) : state?.registrationStatus === "cancelled" ? (
            <p className={noteClass}>
              Your registration for this event was cancelled. Contact the organizer if that looks
              wrong.
            </p>
          ) : isFull ? (
            <>
              <button type="button" disabled className={buttonClass("outline", "lg", "w-full")}>
                Event is full
              </button>
              <p className={noteClass}>
                All {event.capacity.toLocaleString("en-US")} seats are taken.
              </p>
            </>
          ) : (
            <>
              <RegisterButton eventSlug={event.slug} isFree={isFree} />
              <p className={noteClass}>
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
        </aside>
      </div>
    </div>
  );
}