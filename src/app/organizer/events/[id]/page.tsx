import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AiPanel, ReasonList } from "@/components/ai-panel";
import { ForecastRefresh } from "@/components/forecast-refresh";
import { RegistrationFunnel } from "@/components/funnel";
import { MessageDrafts } from "@/components/message-drafts";
import { MetricCard, MetricGrid } from "@/components/metric-card";
import {
  categoryLabel,
  confidenceLabelText,
  eventStatusLabel,
  formatCount,
  formatDecimal,
  formatEventDate,
  formatEventTime,
  formatPercent,
  formatTaka,
  formatTimestamp,
  locationTypeLabel,
  recommendationActionLabel,
} from "@/lib/format";
import { messageDrafts } from "@/lib/message-drafts";
import { requireOrganizer } from "@/server/organizers/access";
import { getOrganizerEventDashboard } from "@/server/organizers/queries";

export const metadata: Metadata = {
  title: "Event dashboard",
};

type EventDashboardPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * One event, as its organizer sees it (PRD §10 — event overview, registration and
 * payment funnel, predicted attendance, recommended action, live check-in
 * count).
 *
 * Ownership is enforced inside the query: `getOrganizerEventDashboard` filters
 * on both the event id from the URL and the organizer id from the cookie, so an
 * event belonging to another organizer returns `null` and answers the same 404
 * as an id that does not exist.
 *
 * The two AI panels render persisted `event_forecasts` data only, and rendering
 * this page never calls the AI service (API_CONTRACT.md §7.1). The forecast appears
 * when the organizer presses "Generate/Refresh forecast", which posts to
 * `POST /api/organizer/events/[id]/forecast`; until then the panels show their
 * placeholder text rather than a predicted number nobody produced.
 */
export default async function OrganizerEventDashboardPage({ params }: EventDashboardPageProps) {
  const { id } = await params;

  const organizer = await requireOrganizer();
  const dashboard = await getOrganizerEventDashboard(organizer.id, id);

  if (!dashboard) {
    notFound();
  }

  const { event, registrations, attendance, forecast } = dashboard;
  const hasRegistrations = registrations.totalRegistrations > 0;
  const hasPaid = registrations.paidRegistrations > 0;
  const drafts = forecast ? messageDrafts(forecast.recommendation.action_type, event) : null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link href="/organizer" className="text-xs text-muted-foreground underline">
          Back to {organizer.organizationName}
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {categoryLabel(event.category)}
          </span>
          <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {eventStatusLabel(event.status)}
          </span>
          <span className="text-xs text-muted-foreground">{locationTypeLabel(event.locationType)}</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{event.title}</h1>
      </header>

      {/* A. Event overview */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight uppercase">Event overview</h2>

        <dl className="grid gap-4 rounded-xl border border-border p-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Date and time</dt>
            <dd>
              <time dateTime={event.dateTime}>{formatEventDate(event.dateTime)}</time>
              {" · "}
              <time dateTime={event.dateTime}>{formatEventTime(event.dateTime)}</time>
              <span className="block text-xs text-muted-foreground">UTC+06:00</span>
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Location</dt>
            <dd>{event.venue}</dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Status</dt>
            <dd>{eventStatusLabel(event.status)}</dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Capacity</dt>
            <dd className="tabular-nums">{formatCount(event.capacity)} seats</dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Ticket price</dt>
            <dd className="tabular-nums">{formatTaka(event.priceTaka)}</dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Attendee page</dt>
            <dd>
              {event.status === "published" ? (
                <Link href={`/events/${event.slug}`} className="underline">
                  View the public listing
                </Link>
              ) : (
                <span className="text-muted-foreground">
                  Not published, so it is hidden from attendee discovery.
                </span>
              )}
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Check-in</dt>
            <dd>
              <Link
                href={`/organizer/events/${event.id}/checkin`}
                className="inline-block rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground hover:opacity-90"
              >
                Open the check-in screen
              </Link>
              <span className="block text-xs text-muted-foreground">
                Scan QR codes or type a ticket ID at the door.
              </span>
            </dd>
          </div>
        </dl>
      </section>

      {/* B. Registration metrics */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight uppercase">Registration metrics</h2>

        {hasRegistrations ? (
          <MetricGrid>
            <MetricCard label="Total registrations" value={formatCount(registrations.totalRegistrations)} />
            <MetricCard
              label="Paid registrations"
              value={formatCount(registrations.paidRegistrations)}
              hint={hasPaid ? undefined : "Nobody has paid yet"}
            />
            <MetricCard
              label="Awaiting payment"
              value={formatCount(registrations.pendingPaymentRegistrations)}
              hint="Seat held until the attendee completes payment"
              muted={registrations.pendingPaymentRegistrations === 0}
            />
            <MetricCard
              label="Cancelled"
              value={formatCount(registrations.cancelledRegistrations)}
              hint="Cancelled registrations release their seat"
              muted={registrations.cancelledRegistrations === 0}
            />
          </MetricGrid>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No registrations for this event yet. Registration counts appear here as soon as an
            attendee signs up from the{" "}
            <Link href="/events" className="underline">
              attendee site
            </Link>
            .
          </p>
        )}

        <div className="rounded-xl border border-border p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">Capacity</h3>
            <p className="text-sm tabular-nums">
              {formatCount(registrations.seatsHeld)} of {formatCount(event.capacity)} seats taken ·{" "}
              {formatCount(registrations.remainingCapacity)} left
            </p>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand"
              style={{
                width: `${Math.min(100, event.capacity === 0 ? 0 : (registrations.seatsHeld / event.capacity) * 100)}%`,
              }}
            />
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            Seats are held by every non-cancelled registration, matching the rule the attendee
            checkout uses.
          </p>
        </div>
      </section>

      {/* C. Attendance metrics */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight uppercase">Attendance metrics</h2>

        <MetricGrid>
          <MetricCard
            label="Checked-in attendees"
            value={formatCount(attendance.checkedInAttendees)}
            hint={
              attendance.checkedInAttendees === 0
                ? "No tickets scanned yet"
                : `Last scan ${formatTimestamp(attendance.lastCheckInAt ?? event.dateTime)}`
            }
            muted={attendance.checkedInAttendees === 0}
          />
          <MetricCard
            label="Attendance rate"
            value={
              attendance.attendanceRate === null ? "Not available" : formatPercent(attendance.attendanceRate)
            }
            hint={
              attendance.attendanceRate === null
                ? "Needs at least one paid registration"
                : "Checked in ÷ paid registrations"
            }
            muted={attendance.attendanceRate === null}
          />
          <MetricCard label="Tickets issued" value={formatCount(attendance.ticketsIssued)} />
          <MetricCard
            label="Duplicate scans blocked"
            value={formatCount(attendance.duplicateScansRejected)}
            hint="A ticket can only be used once"
            muted={attendance.duplicateScansRejected === 0}
          />
        </MetricGrid>

        <div className="rounded-xl border border-border p-5">
          <h3 className="mb-4 text-sm font-semibold">Registration → attendance funnel</h3>
          <RegistrationFunnel
            stages={[
              { label: "Registrations", count: registrations.totalRegistrations },
              { label: "Paid", count: registrations.paidRegistrations },
              { label: "Tickets issued", count: attendance.ticketsIssued },
              { label: "Checked in", count: attendance.checkedInAttendees },
            ]}
          />

          {attendance.checkedInAttendees === 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">
              No ticket has been scanned yet. Staff check attendees in on the{" "}
              <Link href={`/organizer/events/${event.id}/checkin`} className="underline">
                check-in screen
              </Link>
              , and this count moves the moment they do — nothing here is estimated.
            </p>
          ) : null}
        </div>
      </section>

      {/* D. AI forecast refresh — the only thing on this page that calls the AI service */}
      <ForecastRefresh eventId={event.id} hasForecast={forecast !== null} />

      {/* E. AI prediction */}
      <AiPanel
        title="AI attendance prediction"
        description="Predicted attendance, no-show rate, and the signals behind them."
        badge={forecast ? confidenceLabelText(forecast.confidenceLabel) : undefined}
        emptyMessage="No forecast is cached for this event yet. Use the button above to ask the AI service for one; this dashboard only ever reads cached forecasts and never calls the AI service while rendering a page."
      >
        {forecast ? (
          <div className="flex flex-col gap-4">
            <MetricGrid>
              <MetricCard
                label="Predicted attendance"
                value={`${formatDecimal(forecast.predictedAttendance)} people`}
                hint={`Out of ${formatCount(forecast.paidRegistrations)} paid registrations`}
              />
              <MetricCard label="Predicted no-show rate" value={formatPercent(forecast.noShowRate)} />
              <MetricCard
                label="Predicted no-shows"
                value={`${formatCount(forecast.predictedNoShows)} people`}
              />
              <MetricCard
                label="Recommended waitlist"
                value={`${formatCount(forecast.recommendedWaitlist)} seats`}
              />
            </MetricGrid>

            {forecast.topReasons.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Why the model says this</h3>
                <ReasonList reasons={forecast.topReasons} />
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Cached forecast from {formatTimestamp(forecast.generatedAt)} · model{" "}
              <code className="rounded bg-muted px-1 py-0.5">{forecast.modelVersion}</code>
              {forecast.isStale
                ? " · marked stale: refresh the forecast to get current numbers"
                : " · stored in event_forecasts, not recomputed on this page"}
            </p>
          </div>
        ) : null}
      </AiPanel>

      {/* F. AI recommendation */}
      <AiPanel
        title="AI recommendation"
        description="One recommended operational action, with the reasoning behind it."
        emptyMessage="No recommendation is cached for this event yet. It arrives with the forecast, generated by the AI service from its own numbers; nothing here is written by hand."
      >
        {forecast ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {recommendationActionLabel(forecast.recommendation.action_type)}
              </span>
            </div>

            <p className="text-lg font-semibold tracking-tight">
              {forecast.recommendation.headline}
            </p>
            <p className="text-sm">{forecast.recommendation.detail}</p>

            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Why
              </p>
              <p className="text-sm text-muted-foreground">{forecast.recommendation.rationale}</p>
            </div>

            {forecast.recommendation.suggested_send_at ? (
              <p className="text-xs text-muted-foreground">
                Suggested send time: {formatTimestamp(forecast.recommendation.suggested_send_at)}
              </p>
            ) : null}

            {forecast.recommendation.catering_headcount !== null ? (
              <p className="text-xs text-muted-foreground">
                Suggested catering headcount: {formatCount(forecast.recommendation.catering_headcount)}
              </p>
            ) : null}

            {drafts ? <MessageDrafts drafts={drafts} eventPath={`/events/${event.slug}`} /> : null}
          </div>
        ) : null}
      </AiPanel>
    </div>
  );
}