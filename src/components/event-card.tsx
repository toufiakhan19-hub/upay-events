import Link from "next/link";

import {
  categoryLabel,
  formatEventDate,
  formatEventTime,
  formatTaka,
  locationTypeLabel,
} from "@/lib/format";
import type { EventListItem } from "@/server/events/queries";

/**
 * Event card for the discovery grid (PRD §7 — category, date, location, ticket
 * price, seats). Pure presentation: it receives plain data and imports no
 * database code.
 */
export function EventCard({ event }: { event: EventListItem }) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-background p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {categoryLabel(event.category)}
        </span>
        <span className="text-xs text-muted-foreground">{locationTypeLabel(event.locationType)}</span>
      </div>

      <h2 className="mt-3 text-lg font-semibold tracking-tight">
        <Link href={`/events/${event.slug}`} className="hover:underline">
          {event.title}
        </Link>
      </h2>

      <dl className="mt-3 flex flex-col gap-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="text-muted-foreground">When</dt>
          <dd>
            <time dateTime={event.dateTime}>{formatEventDate(event.dateTime)}</time>
            {", "}
            <time dateTime={event.dateTime}>{formatEventTime(event.dateTime)}</time>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Venue</dt>
          <dd className="min-w-0">{event.venue}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Capacity</dt>
          <dd>{event.capacity.toLocaleString("en-US")} seats</dd>
        </div>
      </dl>

      <div className="mt-4 flex items-end justify-between gap-3 pt-2">
        <p className="text-lg font-semibold">{formatTaka(event.priceTaka)}</p>
        <Link
          href={`/events/${event.slug}`}
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          View event
        </Link>
      </div>
    </article>
  );
}