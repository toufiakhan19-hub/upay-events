import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CheckInConsole } from "@/components/checkin-console";
import { CategoryTile } from "@/components/ui/category-tile";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
import {
  categoryLabel,
  eventStatusLabel,
  formatEventDate,
  formatEventTime,
  locationTypeLabel,
} from "@/lib/format";
import { getCheckInLiveState } from "@/server/checkin/queries";
import { requireOrganizer } from "@/server/organizers/access";

export const metadata: Metadata = {
  title: "Check-in",
};

type CheckInPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Door screen for organizer and event staff (PRD §10 check-in view, §8 staff flow).
 *
 * Reached from the event dashboard, and guarded exactly like it: the event id
 * comes from the URL but every read is scoped by the organizer id in the cookie,
 * so another organizer's event answers the same 404 as one that does not exist.
 *
 * The live counter, the scan history figures, and the forecast panel are all
 * rendered from the same `getOrganizerEventDashboard` read the dashboard uses
 * (`src/server/checkin/queries.ts` adds only the forecast comparison), so the two
 * pages cannot disagree. The AI forecast stays `null` until the AI service writes
 * one — the comparison panel says so instead of inventing a prediction.
 */
export default async function OrganizerEventCheckInPage({ params }: CheckInPageProps) {
  const { id } = await params;

  const organizer = await requireOrganizer();
  const state = await getCheckInLiveState(organizer.id, id);

  if (!state) {
    notFound();
  }

  const { event } = state;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/organizer/events/${event.id}`}
        className="flex w-fit items-center gap-1 text-xs font-bold text-upay-blue hover:underline"
      >
        <ArrowLeftIcon className="size-4" />
        Back to {event.title} dashboard
      </Link>

      <header className="event-card flex flex-wrap items-center gap-4 rounded-card p-3 shadow-card">
        <CategoryTile category={event.category} className="size-20 shrink-0 rounded-2xl" iconClassName="size-8" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill>{categoryLabel(event.category)}</Pill>
            <Pill>{eventStatusLabel(event.status)}</Pill>
            <Pill>{locationTypeLabel(event.locationType)}</Pill>
          </div>
          <h1 className="mt-2 text-xl font-extrabold tracking-tight text-upay-navy sm:text-2xl">
            Check-in · {event.title}
          </h1>
          <p className="text-xs font-medium text-upay-navy/55 sm:text-sm">
            <time dateTime={event.dateTime}>{formatEventDate(event.dateTime)}</time>
            {" · "}
            <time dateTime={event.dateTime}>{formatEventTime(event.dateTime)}</time>
            {" · "}
            {event.venue}
          </p>
        </div>
      </header>

      <CheckInConsole
        eventId={event.id}
        eventTitle={event.title}
        initialState={state}
      />

      <p className="text-xs font-medium text-upay-navy/45">
        {organizer.organizationName} · check-in is scoped to this organization, and each ticket can
        be used once. QR codes carry a random token only — no name, phone number, or payment data —
        and scan results show no attendee information.
      </p>
    </div>
  );
}