import "server-only";

import { and, asc, count, countDistinct, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { checkIns, eventForecasts, events, organizers, registrations, tickets } from "@/db/schema";
import type { StoredRecommendation } from "@/db/schema";
import type {
  ConfidenceLabel,
  EventCategory,
  EventStatus,
  LocationType,
  RegistrationStatus,
} from "@/db/enums";
import { heldSeatCondition } from "@/server/registrations/registrations";

/**
 * Read model for the organizer dashboard.
 *
 * Rules that shape this file:
 *
 * - Every read is scoped by organizer id. `events.organizerId` is the ownership
 *   boundary, so a dashboard can only ever read rows its organizer owns, no
 *   matter what the URL contains. There is no "fetch by event id, check after"
 *   path here.
 * - Counts come from the tables that hold the truth: `registrations` for
 *   demand, `payments`/`tickets` for what was issued, `check_ins` for who
 *   actually turned up. Nothing is estimated.
 * - Attendance and forecasts are never invented. With no check-in rows the
 *   attendance figures are zero, and with no `event_forecasts` row the forecast
 *   is `null` so the page can render a placeholder (API_CONTRACT.md §7.3 —
 *   "no cached forecast exists → dashboard renders counts only").
 * - Aggregates are grouped in SQL and returned as plain numbers, so the work is
 *   three queries regardless of how many events an organizer has.
 */

/** API_CONTRACT.md §7.3: a cached forecast older than this is stale. */
const FORECAST_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

/* -------------------------------------------------------------------------- */
/* Shapes                                                                     */
/* -------------------------------------------------------------------------- */

/** One row in the demo organizer picker. */
export type OrganizerPickerItem = {
  id: string;
  organizationName: string;
  contactName: string;
  eventCount: number;
};

export type OrganizerEventOverview = {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  venue: string;
  locationType: LocationType;
  dateTime: string;
  capacity: number;
  priceTaka: number;
  status: EventStatus;
};

/** One event as the dashboard list shows it. */
export type OrganizerEventSummary = OrganizerEventOverview & {
  totalRegistrations: number;
  paidRegistrations: number;
  pendingPaymentRegistrations: number;
  cancelledRegistrations: number;
  /** Seats taken, using the attendee capacity rule (cancelled releases). */
  seatsHeld: number;
  remainingCapacity: number;
  checkedInAttendees: number;
  /** Whether a cached forecast row exists — never a fabricated value. */
  hasForecast: boolean;
};

export type EventRegistrationMetrics = {
  totalRegistrations: number;
  paidRegistrations: number;
  pendingPaymentRegistrations: number;
  cancelledRegistrations: number;
  seatsHeld: number;
  remainingCapacity: number;
};

export type EventAttendanceMetrics = {
  ticketsIssued: number;
  checkedInAttendees: number;
  duplicateScansRejected: number;
  invalidScansRejected: number;
  lastCheckInAt: string | null;
  /** `null` when there are no paid registrations to divide by. */
  attendanceRate: number | null;
};

/** A forecast exactly as it is persisted in `event_forecasts`. */
export type PersistedEventForecast = {
  id: string;
  generatedAt: string;
  modelVersion: string;
  paidRegistrations: number;
  predictedAttendance: number;
  predictedNoShows: number;
  noShowRate: number;
  recommendedWaitlist: number;
  confidence: number;
  confidenceLabel: ConfidenceLabel;
  topReasons: string[];
  /** Persisted flag, or derived from age. Staleness is application state. */
  isStale: boolean;
  recommendation: StoredRecommendation;
};

export type OrganizerEventDashboard = {
  event: OrganizerEventOverview;
  registrations: EventRegistrationMetrics;
  attendance: EventAttendanceMetrics;
  /** `null` until the AI integration persists a forecast for this event. */
  forecast: PersistedEventForecast | null;
};

/* -------------------------------------------------------------------------- */
/* Query building blocks                                                      */
/* -------------------------------------------------------------------------- */

const overviewColumns = {
  id: events.id,
  slug: events.slug,
  title: events.title,
  category: events.category,
  venue: events.venue,
  locationType: events.locationType,
  dateTime: events.dateTime,
  capacity: events.capacity,
  priceTaka: events.priceTaka,
  status: events.status,
};

const emptyRegistrationMetrics = (capacity: number): EventRegistrationMetrics => ({
  totalRegistrations: 0,
  paidRegistrations: 0,
  pendingPaymentRegistrations: 0,
  cancelledRegistrations: 0,
  seatsHeld: 0,
  remainingCapacity: capacity,
});

const emptyAttendanceMetrics = (): EventAttendanceMetrics => ({
  ticketsIssued: 0,
  checkedInAttendees: 0,
  duplicateScansRejected: 0,
  invalidScansRejected: 0,
  lastCheckInAt: null,
  attendanceRate: null,
});

async function readRegistrationMetrics(
  eventIds: string[],
  capacityByEventId: Map<string, number>,
): Promise<Map<string, EventRegistrationMetrics>> {
  const metrics = new Map<string, EventRegistrationMetrics>();

  if (eventIds.length === 0) {
    return metrics;
  }

  const [statusRows, seatRows] = await Promise.all([
    db
      .select({
        eventId: registrations.eventId,
        status: registrations.status,
        registrations: count(),
      })
      .from(registrations)
      .where(inArray(registrations.eventId, eventIds))
      .groupBy(registrations.eventId, registrations.status),

    // Seats come from the shared rule rather than a re-statement of it here, so
    // the dashboard can never disagree with the attendee checkout about what
    // holds a seat.
    db
      .select({ eventId: registrations.eventId, seatsHeld: count() })
      .from(registrations)
      .where(and(inArray(registrations.eventId, eventIds), heldSeatCondition()))
      .groupBy(registrations.eventId),
  ]);

  const seatsByEvent = new Map(seatRows.map((row) => [row.eventId, row.seatsHeld]));
  const byEvent = new Map<string, Record<RegistrationStatus, number>>();

  for (const row of statusRows) {
    const counts = byEvent.get(row.eventId) ?? {
      pending_payment: 0,
      paid: 0,
      cancelled: 0,
    };

    counts[row.status] = row.registrations;
    byEvent.set(row.eventId, counts);
  }

  for (const eventId of eventIds) {
    const counts = byEvent.get(eventId);
    const capacity = capacityByEventId.get(eventId) ?? 0;

    if (!counts) {
      metrics.set(eventId, emptyRegistrationMetrics(capacity));
      continue;
    }

    const seatsHeld = seatsByEvent.get(eventId) ?? 0;

    metrics.set(eventId, {
      totalRegistrations: counts.pending_payment + counts.paid + counts.cancelled,
      paidRegistrations: counts.paid,
      pendingPaymentRegistrations: counts.pending_payment,
      cancelledRegistrations: counts.cancelled,
      seatsHeld,
      remainingCapacity: Math.max(0, capacity - seatsHeld),
    });
  }

  return metrics;
}

/**
 * Ticket and scan counts per event, joined event → registration → ticket.
 *
 * Both queries are inner joins from the fact table, so an event with no tickets
 * or no scans simply has no row and reads as zero.
 */
async function readAttendanceMetrics(
  eventIds: string[],
): Promise<Map<string, EventAttendanceMetrics>> {
  const metrics = new Map<string, EventAttendanceMetrics>();

  if (eventIds.length === 0) {
    return metrics;
  }

  const ticketRows = await db
    .select({
      eventId: registrations.eventId,
      ticketsIssued: countDistinct(tickets.id),
    })
    .from(tickets)
    .innerJoin(registrations, eq(tickets.registrationId, registrations.id))
    .where(inArray(registrations.eventId, eventIds))
    .groupBy(registrations.eventId);

  const scanRows = await db
    .select({
      eventId: registrations.eventId,
      // Distinct tickets: one attendee is one attendance, and duplicate scans
      // are logged separately with `already_used`.
      checkedInAttendees: sql<number>`count(distinct case when ${checkIns.result} = 'checked_in' then ${checkIns.ticketId} end)`,
      duplicateScansRejected: sql<number>`sum(case when ${checkIns.result} = 'already_used' then 1 else 0 end)`,
      invalidScansRejected: sql<number>`sum(case when ${checkIns.result} = 'invalid_ticket' then 1 else 0 end)`,
      lastCheckInAt: sql<string | null>`max(case when ${checkIns.result} = 'checked_in' then ${checkIns.scannedAt} end)`,
    })
    .from(checkIns)
    .innerJoin(tickets, eq(checkIns.ticketId, tickets.id))
    .innerJoin(registrations, eq(tickets.registrationId, registrations.id))
    .where(inArray(registrations.eventId, eventIds))
    .groupBy(registrations.eventId);

  const scansByEvent = new Map(scanRows.map((row) => [row.eventId, row]));

  for (const row of ticketRows) {
    const scans = scansByEvent.get(row.eventId);

    metrics.set(row.eventId, {
      ticketsIssued: row.ticketsIssued,
      checkedInAttendees: scans?.checkedInAttendees ?? 0,
      duplicateScansRejected: scans?.duplicateScansRejected ?? 0,
      invalidScansRejected: scans?.invalidScansRejected ?? 0,
      lastCheckInAt: scans?.lastCheckInAt ?? null,
      // Left null by `readAttendanceMetrics`; the ratio needs paid registrations.
      attendanceRate: null,
    });
  }

  // Events with scans but no ticket row cannot happen (the join requires a
  // ticket), so nothing is missing here.
  return metrics;
}

/** Attendance rate against paid registrations — `null` when there are none. */
function withAttendanceRate(
  attendance: EventAttendanceMetrics,
  paidRegistrations: number,
): EventAttendanceMetrics {
  return {
    ...attendance,
    attendanceRate:
      paidRegistrations > 0 ? attendance.checkedInAttendees / paidRegistrations : null,
  };
}

function isStaleForecast(createdAt: string, persistedIsStale: boolean): boolean {
  if (persistedIsStale) {
    return true;
  }

  const generatedAt = new Date(createdAt).getTime();

  if (Number.isNaN(generatedAt)) {
    return true;
  }

  return Date.now() - generatedAt > FORECAST_STALE_AFTER_MS;
}

async function readLatestForecasts(
  eventIds: string[],
): Promise<Map<string, PersistedEventForecast>> {
  const latest = new Map<string, PersistedEventForecast>();

  if (eventIds.length === 0) {
    return latest;
  }

  // Newest first, with the id as a tie-break for rows written in the same
  // second (timestamps have second precision).
  const rows = await db
    .select()
    .from(eventForecasts)
    .where(inArray(eventForecasts.eventId, eventIds))
    .orderBy(desc(eventForecasts.createdAt), desc(eventForecasts.id));

  for (const row of rows) {
    if (latest.has(row.eventId)) {
      continue;
    }

    latest.set(row.eventId, {
      id: row.id,
      generatedAt: row.createdAt,
      modelVersion: row.modelVersion,
      paidRegistrations: row.paidRegistrations,
      predictedAttendance: row.predictedAttendance,
      predictedNoShows: row.predictedNoShows,
      noShowRate: row.noShowRate,
      recommendedWaitlist: row.recommendedWaitlist,
      confidence: row.confidence,
      confidenceLabel: row.confidenceLabel,
      topReasons: row.topReasons,
      isStale: isStaleForecast(row.createdAt, row.isStale),
      recommendation: row.recommendation,
    });
  }

  return latest;
}

/* -------------------------------------------------------------------------- */
/* Public reads                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Organizations offered by the demo picker, with how many events each has.
 *
 * Read from `organizers` rather than a hard-coded list, so an organizer added
 * by seeding shows up without a code change. Only name and event count: the
 * contact phone is never rendered and never leaves the server.
 */
export async function listDemoOrganizers(): Promise<OrganizerPickerItem[]> {
  return db
    .select({
      id: organizers.id,
      organizationName: organizers.organizationName,
      contactName: organizers.contactName,
      eventCount: countDistinct(events.id),
    })
    .from(organizers)
    .leftJoin(events, eq(events.organizerId, organizers.id))
    .groupBy(organizers.id)
    .orderBy(asc(organizers.organizationName));
}

/** Every event belonging to one organizer, soonest first, with its metrics. */
export async function listOrganizerEvents(organizerId: string): Promise<OrganizerEventSummary[]> {
  const rows = await db
    .select(overviewColumns)
    .from(events)
    .where(eq(events.organizerId, organizerId))
    .orderBy(asc(events.dateTime), asc(events.title));

  if (rows.length === 0) {
    return [];
  }

  const eventIds = rows.map((row) => row.id);
  const capacityByEventId = new Map(rows.map((row) => [row.id, row.capacity]));

  const [registrationMetrics, attendanceMetrics, forecasts] = await Promise.all([
    readRegistrationMetrics(eventIds, capacityByEventId),
    readAttendanceMetrics(eventIds),
    readLatestForecasts(eventIds),
  ]);

  return rows.map((row) => {
    const registrations = registrationMetrics.get(row.id) ?? emptyRegistrationMetrics(row.capacity);
    const attendance = attendanceMetrics.get(row.id) ?? emptyAttendanceMetrics();

    return {
      ...row,
      ...registrations,
      checkedInAttendees: attendance.checkedInAttendees,
      hasForecast: forecasts.has(row.id),
    };
  });
}

/**
 * Full dashboard for one event.
 *
 * The organizer id is part of the lookup, not a check afterwards: an event owned
 * by somebody else matches no row and returns `null`, exactly like an id that
 * does not exist. The page then answers 404 for both, so the URL cannot be used
 * to discover another organizer's events.
 */
export async function getOrganizerEventDashboard(
  organizerId: string,
  eventId: string,
): Promise<OrganizerEventDashboard | null> {
  const [event] = await db
    .select(overviewColumns)
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.organizerId, organizerId)))
    .limit(1);

  if (!event) {
    return null;
  }

  const capacityByEventId = new Map([[event.id, event.capacity]]);
  const [registrationMetrics, attendanceMetrics, forecasts] = await Promise.all([
    readRegistrationMetrics([event.id], capacityByEventId),
    readAttendanceMetrics([event.id]),
    readLatestForecasts([event.id]),
  ]);

  const registrations = registrationMetrics.get(event.id) ?? emptyRegistrationMetrics(event.capacity);
  const attendance = attendanceMetrics.get(event.id) ?? emptyAttendanceMetrics();

  return {
    event,
    registrations,
    attendance: withAttendanceRate(attendance, registrations.paidRegistrations),
    forecast: forecasts.get(event.id) ?? null,
  };
}