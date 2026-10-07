import Link from "next/link";

import { buttonClass } from "@/components/ui/button-styles";
import { CategoryTile } from "@/components/ui/category-tile";
import { CalendarIcon, PinIcon, ScanIcon, SparkleIcon } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
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
  const stats = [
    {
      label: "Capacity",
      value: `${formatCount(event.capacity)} seats`,
      hint: `${formatCount(event.remainingCapacity)} left`,
    },
    { label: "Ticket price", value: formatTaka(event.priceTaka) },
    {
      label: "Registrations",
      value: formatCount(event.totalRegistrations),
      hint: `${formatCount(event.paidRegistrations)} paid${
        event.pendingPaymentRegistrations > 0
          ? ` · ${formatCount(event.pendingPaymentRegistrations)} awaiting payment`
          : ""
      }`,
    },
    {
      label: "Checked in",
      value: formatCount(event.checkedInAttendees),
      hint: event.hasForecast ? "Forecast cached" : "No forecast yet",
    },
  ];

  return (
    <article className="event-card flex h-full flex-col gap-4 rounded-card p-3 shadow-card">
      <CategoryTile category={event.category} className="h-28 rounded-2xl" iconClassName="size-10">
        <div className="flex flex-wrap items-start gap-2 p-3">
          <Pill tone="white">{categoryLabel(event.category)}</Pill>
          <Pill tone="white">{eventStatusLabel(event.status)}</Pill>
          <Pill tone="white">{locationTypeLabel(event.locationType)}</Pill>
        </div>
      </CategoryTile>

      <header className="flex flex-col gap-2 px-1">
        <h2 className="text-lg leading-snug font-extrabold tracking-tight text-upay-navy">
          <Link href={`/organizer/events/${event.id}`} className="hover:text-upay-blue">
            {event.title}
          </Link>
        </h2>

        <div className="space-y-1.5 text-sm font-medium text-upay-navy/60">
          <p className="flex items-center gap-2">
            <CalendarIcon className="size-4 shrink-0 text-upay-blue" />
            <span>
              <time dateTime={event.dateTime}>{formatEventDate(event.dateTime)}</time>
              {" · "}
              <time dateTime={event.dateTime}>{formatEventTime(event.dateTime)}</time>
            </span>
          </p>
          <p className="flex items-center gap-2">
            <PinIcon className="size-4 shrink-0 text-upay-blue" />
            <span className="min-w-0">{event.venue}</span>
          </p>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-2 px-1">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-upay-blue-soft/70 px-3 py-2.5">
            <dt className="text-[0.625rem] font-semibold tracking-wide text-upay-navy/45 uppercase">
              {stat.label}
            </dt>
            <dd className="text-base font-extrabold text-upay-navy tabular-nums">
              {stat.value}
              {stat.hint ? (
                <span className="block text-[0.6875rem] font-medium text-upay-navy/50">
                  {stat.hint}
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      <p className="px-1 text-[0.6875rem] font-medium text-upay-navy/45">
        {event.cancelledRegistrations > 0
          ? `${formatCount(event.cancelledRegistrations)} cancelled registration(s) released their seats.`
          : "No cancelled registrations."}
      </p>

      <div className="mt-auto grid grid-cols-2 gap-2 px-1 pb-1">
        <Link href={`/organizer/events/${event.id}/checkin`} className={buttonClass("outline", "md")}>
          <ScanIcon className="size-4" />
          Check-in
        </Link>
        <Link href={`/organizer/events/${event.id}`} className={buttonClass("primary", "md")}>
          <SparkleIcon className="size-4" />
          AI dashboard
        </Link>
      </div>
    </article>
  );
}
