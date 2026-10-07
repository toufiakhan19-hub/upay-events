import Link from "next/link";

import { buttonClass } from "@/components/ui/button-styles";
import { CategoryTile } from "@/components/ui/category-tile";
import { CalendarIcon, PinIcon } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
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
  const href = `/events/${event.slug}`;

  return (
    <article className="event-card flex h-full flex-col overflow-hidden rounded-card p-3 shadow-card">
      <Link href={href} tabIndex={-1} aria-hidden>
        <CategoryTile category={event.category} className="h-40 rounded-2xl">
          <div className="flex items-start justify-between gap-2 p-3">
            <Pill tone="white">{categoryLabel(event.category)}</Pill>
            <Pill tone="white">{locationTypeLabel(event.locationType)}</Pill>
          </div>
        </CategoryTile>
      </Link>

      <div className="flex flex-1 flex-col px-1 pt-4 pb-1">
        <h2 className="text-lg leading-snug font-extrabold tracking-tight text-upay-navy">
          <Link href={href} className="hover:text-upay-blue">
            {event.title}
          </Link>
        </h2>
        <p className="mt-0.5 text-xs font-semibold text-upay-navy/45">by {event.organizerName}</p>

        <div className="mt-3 space-y-2 text-sm font-medium text-upay-navy/60">
          <p className="flex items-center gap-2">
            <CalendarIcon className="size-4 shrink-0 text-upay-blue" />
            <span>
              <time dateTime={event.dateTime}>{formatEventDate(event.dateTime)}</time>
              {", "}
              <time dateTime={event.dateTime}>{formatEventTime(event.dateTime)}</time>
            </span>
          </p>
          <p className="flex items-center gap-2">
            <PinIcon className="size-4 shrink-0 text-upay-blue" />
            <span className="min-w-0">{event.venue}</span>
          </p>
        </div>

        <div className="my-4 h-px bg-upay-blue/8" />

        <div className="mt-auto mb-3.5 flex items-end justify-between">
          <div>
            <p className="text-[0.6875rem] font-semibold tracking-wide text-upay-navy/40 uppercase">
              Entry
            </p>
            <p className="mt-0.5 text-lg font-extrabold text-upay-blue">
              {formatTaka(event.priceTaka)}
            </p>
          </div>
          <p className="pb-0.5 text-xs font-semibold text-upay-navy/45">
            {event.capacity.toLocaleString("en-US")} seats
          </p>
        </div>

        <Link href={href} className={buttonClass("primary", "lg", "w-full font-extrabold")}>
          Register with upay
        </Link>
      </div>
    </article>
  );
}
