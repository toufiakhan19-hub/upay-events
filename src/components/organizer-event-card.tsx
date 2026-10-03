import Link from "next/link";

import {
  categoryLabel,
  eventStatusLabel,
  formatCount,
  formatEventDate,
  formatEventTime,
  formatTaka,
  locationTypeLabel,
} from "@/lib/format";
import type { OrganizerEventSummary } from "@/server/organizers/queries";

/**
 * One event in the organizer dashboard list.
 *
 * Every figure on the card is a count from the database. When an event has no
 * cached forecast the card says so plainly instead of showing a placeholder
 * number.
 */
export function OrganizerEventCard({ event }: { event: OrganizerEventSummary }) {
  return (
    <article className="flex h-full flex-col gap-4 rounded-xl border border-border p-5">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {categoryLabel(event.category)}
          </span>
          <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {eventStatusLabel(event.status)}
          </span>
          <span className="text-xs text-muted-foreground">{locationTypeLabel(event.locationType)}</span>
        </div>

        <h2 className="text-lg font-semibold tracking-tight">
          <Link href={`/organizer/events/${event.id}`} className="hover:underline">
            {event.title}
          </Link>
        </h2>

        <p className="text-sm text-muted-foreground">
          <time dateTime={event.dateTime}>{formatEventDate(event.dateTime)}</time>
          {" · "}
          <time dateTime={event.dateTime}>{formatEventTime(event.dateTime)}</time>
          {" · "}
          {event.venue}
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Capacity</dt>
          <dd className="tabular-nums">
            {formatCount(event.capacity)} seats
            <span className="block text-xs text-muted-foreground">
              {formatCount(event.remainingCapacity)} left
            </span>
          </dd>
        </div>

        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Ticket price</dt>
          <dd className="tabular-nums">{formatTaka(event.priceTaka)}</dd>
        </div>

        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Registrations</dt>
          <dd className="tabular-nums">
            {formatCount(event.totalRegistrations)}
            <span className="block text-xs text-muted-foreground">
              {formatCount(event.paidRegistrations)} paid
              {event.pendingPaymentRegistrations > 0
                ? ` · ${formatCount(event.pendingPaymentRegistrations)} awaiting payment`
                : ""}
            </span>
          </dd>
        </div>

        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Checked in</dt>
          <dd className="tabular-nums">
            {formatCount(event.checkedInAttendees)}
            <span className="block text-xs text-muted-foreground">
              {event.hasForecast ? "Forecast cached" : "No forecast yet"}
            </span>
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex items-end justify-between gap-3 pt-2">
        <p className="text-xs text-muted-foreground">
          {event.cancelledRegistrations > 0
            ? `${formatCount(event.cancelledRegistrations)} cancelled registration(s) released their seats.`
            : "No cancelled registrations."}
        </p>

        <div className="flex items-center gap-2">
          <Link
            href={`/organizer/events/${event.id}/checkin`}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium whitespace-nowrap hover:bg-muted"
          >
            Check-in
          </Link>

          <Link
            href={`/organizer/events/${event.id}`}
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium whitespace-nowrap text-brand-foreground hover:opacity-90"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </article>
  );
}