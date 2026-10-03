import "server-only";

import type {
  EventAttendanceMetrics,
  EventRegistrationMetrics,
  OrganizerEventOverview,
  PersistedEventForecast,
} from "@/server/organizers/queries";
import { getOrganizerEventDashboard } from "@/server/organizers/queries";

/**
 * Read model behind `GET /api/checkin/live` and the check-in screen's first paint.
 *
 * There is deliberately no attendance query of its own here. The organizer
 * dashboard already computes checked-in attendees, rejected duplicates, rejected
 * invalid scans, the last check-in time, and the cached forecast — all scoped by
 * organizer id. A second implementation of the same numbers is how a live counter
 * and a dashboard counter drift apart during a demo, so this module only shapes
 * that one read and adds the forecast comparison the console needs.
 */

/** Live attendance next to the cached forecast, when a forecast exists. */
export type ForecastComparison = {
  predictedAttendance: number;
  checkedInAttendees: number;
  /**
   * `checkedInAttendees - predictedAttendance`. Negative while the event is
   * still ahead of the forecast, zero once actual turnout lands on it, positive
   * when it beats it.
   */
  difference: number;
};

export type CheckInLiveState = {
  event: OrganizerEventOverview;
  attendance: EventAttendanceMetrics;
  registrations: EventRegistrationMetrics;
  /** `null` until the AI integration persists a forecast (API_CONTRACT.md §7.3). */
  forecast: PersistedEventForecast | null;
  /** `null` exactly when `forecast` is `null` — never a fabricated prediction. */
  comparison: ForecastComparison | null;
};

function compareWithForecast(
  attendance: EventAttendanceMetrics,
  forecast: PersistedEventForecast,
): ForecastComparison {
  return {
    predictedAttendance: forecast.predictedAttendance,
    checkedInAttendees: attendance.checkedInAttendees,
    difference: attendance.checkedInAttendees - forecast.predictedAttendance,
  };
}

/**
 * Everything the check-in console shows for one event.
 *
 * Scoped by organizer id inside `getOrganizerEventDashboard`, so an event owned by
 * somebody else returns `null` — identical to an id that does not exist — and the
 * `event_id` supplied in the URL can never be used to read another organizer's
 * attendance.
 */
export async function getCheckInLiveState(
  organizerId: string,
  eventId: string,
): Promise<CheckInLiveState | null> {
  const dashboard = await getOrganizerEventDashboard(organizerId, eventId);

  if (!dashboard) {
    return null;
  }

  return {
    event: dashboard.event,
    attendance: dashboard.attendance,
    registrations: dashboard.registrations,
    forecast: dashboard.forecast,
    comparison: dashboard.forecast
      ? compareWithForecast(dashboard.attendance, dashboard.forecast)
      : null,
  };
}