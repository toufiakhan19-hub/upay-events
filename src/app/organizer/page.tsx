import type { Metadata } from "next";
import Link from "next/link";

import { selectOrganizerAction } from "@/app/organizer/actions";
import { MetricCard, MetricGrid } from "@/components/metric-card";
import { OrganizerEventCard } from "@/components/organizer-event-card";
import { buttonClass } from "@/components/ui/button-styles";
import { Card } from "@/components/ui/card";
import { HostIcon } from "@/components/ui/icons";
import { SectionTitle } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { formatCount } from "@/lib/format";
import { getCurrentOrganizer } from "@/server/organizers/access";
import { listDemoOrganizers, listOrganizerEvents } from "@/server/organizers/queries";

export const metadata: Metadata = {
  title: "Organizer dashboard",
};

/**
 * Organizer dashboard landing page (PRD §10 — event overview, registration and
 * payment funnel, live check-in count).
 *
 * With no organization selected this is the demo access point: a server-rendered
 * list of the organizations in the database, each one a button that asks a
 * server action to resolve the id and write the cookie. No organizer id is read
 * from the URL, so nothing arbitrary can be browsed by typing an address.
 *
 * Once selected, every figure below comes from `listOrganizerEvents`, which
 * scopes its queries to this organizer id.
 */
export default async function OrganizerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ access?: string | string[] }>;
}) {
  const organizer = await getCurrentOrganizer();

  if (!organizer) {
    const params = await searchParams;
    const access = Array.isArray(params.access) ? params.access[0] : params.access;
    const organizers = await listDemoOrganizers();

    return (
      <div className="flex flex-col gap-6">
        <section className="hero-banner relative overflow-hidden rounded-hero p-6 text-white shadow-hero lg:p-9">
          <div className="pointer-events-none absolute -top-8 -right-8 size-40 rounded-full border-[2.5rem] border-white/10" />
          <div className="relative z-[1] max-w-2xl">
            <p className="mb-2 text-[0.6875rem] font-bold tracking-[0.12em] text-white/75 uppercase">
              Organizer demo access
            </p>
            <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-tight lg:text-4xl">
              Choose an organization
            </h1>
            <p className="mt-3 text-sm font-medium text-white/80">
              This is a hackathon demo shortcut, not an authentication system: pick an organization
              and its dashboard opens. Real organizer onboarding and verification come later.
              Attendee accounts keep working exactly as before — this does not touch attendee
              sessions.
            </p>
          </div>
          <div className="hero-wave absolute inset-x-0 bottom-0 h-14" />
        </section>

        {access === "unknown" ? (
          <p className="rounded-card border border-upay-yellow/50 bg-upay-yellow-soft p-4 text-sm font-medium text-upay-navy">
            That organization is no longer in the database. Pick one of the organizations below.
          </p>
        ) : null}

        {organizers.length === 0 ? (
          <Card as="section" className="p-10 text-center">
            <h2 className="text-base font-extrabold text-upay-navy">No organizations in the database</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-upay-navy/55">
              Run <code className="rounded bg-upay-blue-soft px-1 py-0.5 text-xs">npm run db:seed</code>{" "}
              to load the demo organizers and events, then reload this page.
            </p>
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {organizers.map((item) => (
              <li
                key={item.id}
                className="event-card flex flex-col justify-between gap-5 rounded-card p-5 shadow-card"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-logo bg-upay-yellow text-upay-blue shadow-logo">
                    <HostIcon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-extrabold tracking-tight text-upay-navy">
                      {item.organizationName}
                    </p>
                    <p className="text-xs font-medium text-upay-navy/50">{item.contactName}</p>
                    <p className="mt-2">
                      <Pill>
                        {item.eventCount === 0
                          ? "No events yet"
                          : `${formatCount(item.eventCount)} ${item.eventCount === 1 ? "event" : "events"}`}
                      </Pill>
                    </p>
                  </div>
                </div>

                <form action={selectOrganizerAction}>
                  <input type="hidden" name="organizerId" value={item.id} />
                  <button type="submit" className={buttonClass("primary", "md", "w-full")}>
                    Open dashboard
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs font-medium text-upay-navy/50">
          Looking for the attendee experience?{" "}
          <Link href="/events" className="font-bold text-upay-blue hover:underline">
            Browse events
          </Link>
        </p>
      </div>
    );
  }

  const events = await listOrganizerEvents(organizer.id);

  const totals = events.reduce(
    (sum, event) => ({
      registrations: sum.registrations + event.totalRegistrations,
      paid: sum.paid + event.paidRegistrations,
      checkedIn: sum.checkedIn + event.checkedInAttendees,
    }),
    { registrations: 0, paid: 0, checkedIn: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="hero-banner relative overflow-hidden rounded-hero p-6 text-white shadow-hero lg:p-8">
        <div className="pointer-events-none absolute -top-8 -right-8 size-40 rounded-full border-[2.5rem] border-white/10" />
        <div className="relative z-[1]">
          <p className="mb-2 text-[0.6875rem] font-bold tracking-[0.12em] text-white/75 uppercase">
            Organizer dashboard
          </p>
          <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-tight lg:text-4xl">
            {organizer.organizationName}
          </h1>
          <p className="mt-2 text-sm font-medium text-white/80">
            {organizer.contactName} · {events.length} {events.length === 1 ? "event" : "events"} ·
            times shown in Bangladesh Standard Time (UTC+06:00)
          </p>
        </div>
        <div className="hero-wave absolute inset-x-0 bottom-0 h-14" />
      </section>

      <section>
        <SectionTitle>Across all your events</SectionTitle>
        <MetricGrid>
          <MetricCard label="Events" value={formatCount(events.length)} />
          <MetricCard label="Registrations" value={formatCount(totals.registrations)} tone="blue" />
          <MetricCard label="Paid registrations" value={formatCount(totals.paid)} />
          <MetricCard
            label="Checked in"
            value={formatCount(totals.checkedIn)}
            hint="Counted from ticket scans"
            muted={totals.checkedIn === 0}
            tone="blue"
          />
        </MetricGrid>
      </section>

      <section>
        <SectionTitle>Your events</SectionTitle>

        {events.length === 0 ? (
          <Card className="p-10 text-center">
            <h3 className="text-base font-extrabold text-upay-navy">No events yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-upay-navy/55">
              This organization has no events in the database, so there is nothing to report yet.
              Attendance and forecast panels fill in automatically once an event exists.
            </p>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {events.map((event) => (
              <OrganizerEventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      <p className="text-xs font-medium text-upay-navy/45">
        Every number on this page comes from the database: registrations from{" "}
        <code className="rounded bg-upay-blue-soft px-1 py-0.5">registrations</code>, attendance from{" "}
        <code className="rounded bg-upay-blue-soft px-1 py-0.5">check_ins</code>. Nothing is
        estimated. The AI prediction and recommendation panels live on each event page and stay
        empty until a forecast is generated there.
      </p>
    </div>
  );
}