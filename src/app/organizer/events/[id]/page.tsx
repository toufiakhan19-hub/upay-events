import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AiPanel, ReasonList } from "@/components/ai-panel";
import { ForecastRefresh } from "@/components/forecast-refresh";
import { RegistrationFunnel } from "@/components/funnel";
import { MessageDrafts } from "@/components/message-drafts";
import { MetricCard, MetricGrid } from "@/components/metric-card";
import { buttonClass } from "@/components/ui/button-styles";
import { Card } from "@/components/ui/card";
import { CategoryTile } from "@/components/ui/category-tile";
import {
  ArrowLeftIcon,
  BulbIcon,
  CalendarIcon,
  CompassIcon,
  PinIcon,
  ScanIcon,
  ShieldIcon,
  SparkleIcon,
  TicketIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { SectionTitle } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
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

function percentOf(part: number, whole: number): number {
  return whole <= 0 ? 0 : Math.min(100, (part / whole) * 100);
}

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
  const checkinHref = `/organizer/events/${event.id}/checkin`;

  const overview = [
    {
      icon: CalendarIcon,
      label: "Date and time",
      value: (
        <>
          <time dateTime={event.dateTime}>{formatEventDate(event.dateTime)}</time>
          {" · "}
          <time dateTime={event.dateTime}>{formatEventTime(event.dateTime)}</time>
          <span className="block text-xs font-medium text-upay-navy/45">UTC+06:00</span>
        </>
      ),
    },
    { icon: PinIcon, label: "Location", value: event.venue },
    { icon: ShieldIcon, label: "Status", value: eventStatusLabel(event.status) },
    { icon: UsersIcon, label: "Capacity", value: `${formatCount(event.capacity)} seats` },
    { icon: TicketIcon, label: "Ticket price", value: formatTaka(event.priceTaka) },
    {
      icon: CompassIcon,
      label: "Attendee page",
      value:
        event.status === "published" ? (
          <Link href={`/events/${event.slug}`} className="text-upay-blue hover:underline">
            View the public listing
          </Link>
        ) : (
          <span className="font-medium text-upay-navy/50">
            Not published, so it is hidden from attendee discovery.
          </span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/organizer"
        className="flex w-fit items-center gap-1 text-xs font-bold text-upay-blue hover:underline"
      >
        <ArrowLeftIcon className="size-4" />
        Back to {organizer.organizationName}
      </Link>

      <CategoryTile
        category={event.category}
        className="rounded-hero shadow-hero"
        iconClassName="size-20 lg:size-24"
      >
        <div className="flex min-h-44 flex-col justify-end gap-3 p-6 pr-24 text-white lg:min-h-52 lg:p-8 lg:pr-36">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="white">{categoryLabel(event.category)}</Pill>
            <Pill tone="white">{eventStatusLabel(event.status)}</Pill>
            <Pill tone="white">{locationTypeLabel(event.locationType)}</Pill>
          </div>
          <h1 className="max-w-2xl text-2xl leading-tight font-extrabold tracking-tight drop-shadow sm:text-3xl">
            {event.title}
          </h1>
        </div>
      </CategoryTile>

      {/* A. Event overview */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="p-5 lg:p-6">
          <SectionTitle>Event overview</SectionTitle>
          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {overview.map(({ icon: RowIcon, label, value }) => (
              <div key={label} className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-upay-blue-soft text-upay-blue">
                  <RowIcon className="size-4" />
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

        <Card className="flex flex-col justify-between gap-4 p-5">
          <div>
            <span className="grid size-10 place-items-center rounded-xl bg-upay-yellow-soft text-upay-blue">
              <ScanIcon className="size-5" />
            </span>
            <p className="mt-3 text-sm font-extrabold text-upay-navy">Check-in</p>
            <p className="mt-1 text-xs font-medium text-upay-navy/50">
              Scan QR codes or type a ticket ID at the door.
            </p>
          </div>
          <Link href={checkinHref} className={buttonClass("primary", "md", "w-full")}>
            Open the check-in screen
          </Link>
        </Card>
      </section>

      {/* B. Registration metrics */}
      <section className="flex flex-col gap-4">
        <SectionTitle>Registration metrics</SectionTitle>

        {hasRegistrations ? (
          <MetricGrid>
            <MetricCard
              label="Total registrations"
              value={formatCount(registrations.totalRegistrations)}
            />
            <MetricCard
              label="Paid registrations"
              value={formatCount(registrations.paidRegistrations)}
              hint={hasPaid ? undefined : "Nobody has paid yet"}
              tone="blue"
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
              tone="blue"
            />
          </MetricGrid>
        ) : (
          <Card className="p-6 text-sm font-medium text-upay-navy/60">
            No registrations for this event yet. Registration counts appear here as soon as an
            attendee signs up from the{" "}
            <Link href="/events" className="font-bold text-upay-blue hover:underline">
              attendee site
            </Link>
            .
          </Card>
        )}

        <Card className="p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-extrabold text-upay-navy">Capacity</h3>
            <p className="text-sm font-bold text-upay-navy tabular-nums">
              {formatCount(registrations.seatsHeld)} of {formatCount(event.capacity)} seats taken ·{" "}
              {formatCount(registrations.remainingCapacity)} left
            </p>
          </div>

          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-upay-blue/8">
            <div
              className="forecast-progress h-full rounded-full"
              style={{ width: `${percentOf(registrations.seatsHeld, event.capacity)}%` }}
            />
          </div>

          <p className="mt-2 text-xs font-medium text-upay-navy/45">
            Seats are held by every non-cancelled registration, matching the rule the attendee
            checkout uses.
          </p>
        </Card>
      </section>

      {/* C. Attendance metrics */}
      <section className="flex flex-col gap-4">
        <SectionTitle>Attendance metrics</SectionTitle>

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
              attendance.attendanceRate === null
                ? "Not available"
                : formatPercent(attendance.attendanceRate)
            }
            hint={
              attendance.attendanceRate === null
                ? "Needs at least one paid registration"
                : "Checked in ÷ paid registrations"
            }
            muted={attendance.attendanceRate === null}
            tone="blue"
          />
          <MetricCard label="Tickets issued" value={formatCount(attendance.ticketsIssued)} />
          <MetricCard
            label="Duplicate scans blocked"
            value={formatCount(attendance.duplicateScansRejected)}
            hint="A ticket can only be used once"
            muted={attendance.duplicateScansRejected === 0}
            tone="blue"
          />
        </MetricGrid>

        <Card className="p-5 lg:p-6">
          <h3 className="mb-4 text-sm font-extrabold text-upay-navy">
            Registration → attendance funnel
          </h3>
          <RegistrationFunnel
            stages={[
              { label: "Registrations", count: registrations.totalRegistrations },
              { label: "Paid", count: registrations.paidRegistrations },
              { label: "Tickets issued", count: attendance.ticketsIssued },
              { label: "Checked in", count: attendance.checkedInAttendees },
            ]}
          />

          {attendance.checkedInAttendees === 0 ? (
            <p className="mt-4 text-xs font-medium text-upay-navy/50">
              No ticket has been scanned yet. Staff check attendees in on the{" "}
              <Link href={checkinHref} className="font-bold text-upay-blue hover:underline">
                check-in screen
              </Link>
              , and this count moves the moment they do — nothing here is estimated.
            </p>
          ) : null}
        </Card>
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
          <div className="flex flex-col gap-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="forecast-glow relative lg:col-span-2">
                <div className="relative overflow-hidden rounded-card border border-white/80 bg-white px-5 py-6 text-center shadow-card">
                  <div className="absolute -top-12 -right-10 size-32 rounded-full bg-upay-blue/5" />
                  <div className="absolute -bottom-12 -left-8 size-28 rounded-full bg-upay-yellow/15" />
                  <div className="relative">
                    <Pill tone="yellow">
                      <SparkleIcon className="size-3.5" />
                      AI forecast
                    </Pill>
                    <p className="mt-4 text-[1.7rem] leading-tight font-extrabold tracking-tight text-upay-navy">
                      {formatDecimal(forecast.predictedAttendance)} predicted attendees
                    </p>
                    <p className="mt-1.5 text-xs font-medium text-upay-navy/45">
                      out of {formatCount(forecast.paidRegistrations)} paid registrations
                    </p>
                    <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-upay-blue/8">
                      <div
                        className="forecast-progress h-full rounded-full"
                        style={{
                          width: `${percentOf(forecast.predictedAttendance, forecast.paidRegistrations)}%`,
                        }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-[0.625rem] font-bold text-upay-navy/40">
                      <span>0</span>
                      <span>{formatPercent(1 - forecast.noShowRate)} expected</span>
                      <span>{formatCount(forecast.paidRegistrations)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="confidence-card flex flex-col justify-between gap-3 rounded-card p-5 shadow-card">
                <div>
                  <p className="text-[0.625rem] font-bold tracking-wide text-upay-navy/45 uppercase">
                    Prediction confidence
                  </p>
                  <p className="mt-2 text-xl font-extrabold text-upay-navy">
                    {confidenceLabelText(forecast.confidenceLabel)}
                  </p>
                </div>
                <p className="text-[0.6875rem] font-medium text-upay-navy/45">
                  Model{" "}
                  <code className="rounded bg-upay-blue-soft px-1 py-0.5">
                    {forecast.modelVersion}
                  </code>
                </p>
              </div>
            </div>

            <MetricGrid>
              <MetricCard
                label="Predicted attendance"
                value={`${formatDecimal(forecast.predictedAttendance)} people`}
                hint={`Out of ${formatCount(forecast.paidRegistrations)} paid registrations`}
              />
              <MetricCard
                label="Predicted no-show rate"
                value={formatPercent(forecast.noShowRate)}
                tone="blue"
              />
              <MetricCard
                label="Predicted no-shows"
                value={`${formatCount(forecast.predictedNoShows)} people`}
              />
              <MetricCard
                label="Recommended waitlist"
                value={`${formatCount(forecast.recommendedWaitlist)} seats`}
                tone="blue"
              />
            </MetricGrid>

            {forecast.topReasons.length > 0 ? (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-extrabold text-upay-navy">Why this prediction?</h3>
                <ReasonList reasons={forecast.topReasons} />
              </div>
            ) : null}

            <p className="text-xs font-medium text-upay-navy/45">
              Cached forecast from {formatTimestamp(forecast.generatedAt)} · model{" "}
              <code className="rounded bg-upay-blue-soft px-1 py-0.5">{forecast.modelVersion}</code>
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
        className={forecast ? "recommendation-card border border-upay-yellow/45" : "bg-white"}
      >
        {forecast ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-upay-yellow text-upay-blue shadow-active">
                <BulbIcon className="size-4" />
              </span>
              <span className="text-[0.625rem] font-extrabold tracking-wide text-upay-navy uppercase">
                {recommendationActionLabel(forecast.recommendation.action_type)}
              </span>
            </div>

            <p className="text-lg font-extrabold tracking-tight text-upay-navy">
              {forecast.recommendation.headline}
            </p>
            <p className="text-sm font-medium text-upay-navy/80">
              {forecast.recommendation.detail}
            </p>

            <div className="flex flex-col gap-1 rounded-2xl bg-white/70 p-3.5">
              <p className="text-[0.625rem] font-bold tracking-wide text-upay-navy/50 uppercase">
                Why
              </p>
              <p className="text-sm font-medium text-upay-navy/70">
                {forecast.recommendation.rationale}
              </p>
            </div>

            {forecast.recommendation.suggested_send_at ? (
              <p className="text-xs font-medium text-upay-navy/55">
                Suggested send time: {formatTimestamp(forecast.recommendation.suggested_send_at)}
              </p>
            ) : null}

            {forecast.recommendation.catering_headcount !== null ? (
              <p className="text-xs font-medium text-upay-navy/55">
                Suggested catering headcount:{" "}
                {formatCount(forecast.recommendation.catering_headcount)}
              </p>
            ) : null}

            {drafts ? <MessageDrafts drafts={drafts} eventPath={`/events/${event.slug}`} /> : null}
          </div>
        ) : null}
      </AiPanel>

      {/* G. Live check-ins against the forecast */}
      <article className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-upay-blue/8 bg-white/75 px-5 py-4 shadow-chip backdrop-blur-xl">
        <div>
          <p className="text-[0.625rem] font-bold tracking-wide text-upay-navy/45 uppercase">
            Live check-ins
          </p>
          <p className="mt-1 text-lg font-extrabold text-upay-navy tabular-nums">
            {formatCount(attendance.checkedInAttendees)}{" "}
            <span className="text-sm text-upay-navy/35">
              / {forecast ? formatDecimal(forecast.predictedAttendance) : formatCount(registrations.paidRegistrations)}
            </span>
          </p>
        </div>
        <div className="text-right">
          <Link
            href={checkinHref}
            className="inline-flex items-center gap-1 text-[0.6875rem] font-bold text-upay-blue hover:underline"
          >
            <span className="size-1.5 rounded-full bg-upay-yellow shadow-active" />
            Open check-in
          </Link>
          <p className="mt-1 text-[0.6875rem] font-medium text-upay-navy/45">
            {forecast
              ? `Compared with the ${formatDecimal(forecast.predictedAttendance)} attendees the AI predicted.`
              : "Compared with paid registrations until a forecast is cached."}
          </p>
        </div>
      </article>
    </div>
  );
}
