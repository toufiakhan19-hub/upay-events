import "server-only";

import type { EventCategory, LocationType, ReminderStatus } from "@/db/enums";
import { eventLocalCalendar } from "@/lib/time";

import type { AttendanceInput, ForecastRequest } from "./types";

/**
 * Database rows → `AttendanceInput` (§7.2: "The application owns the mapping from
 * its database rows to `AttendanceInput`").
 *
 * This module is the whole of the app's knowledge about the AI wire format, and it
 * is deliberately the *only* place the two vocabularies meet. It is a pure function
 * of the rows it is given: no database handle, no clock, no environment. That is
 * what makes the mapping reviewable against the contract by reading one file.
 *
 * Three rules govern everything below.
 *
 * 1. **No raw rows cross the boundary.** Column names, table names, user ids,
 *    payment references and QR tokens do not exist in the output types. The AI
 *    service cannot see the schema even if it wanted to (§1.1).
 * 2. **No invented features.** Only the ten features §4.3.1 declares are derived,
 *    each from something the database actually recorded. A value that cannot be
 *    derived is reported as missing rather than filled with a plausible number.
 * 3. **No silent repair.** Where the contract allows `null`, `null` is sent. Where
 *    it does not, a missing value is an error the caller has to surface — not a
 *    default that looks like a measurement.
 */

/** The event columns that become per-registration features. */
export type ForecastEventSource = {
  id: string;
  category: EventCategory;
  locationType: LocationType;
  /** ISO 8601 with explicit offset; Dhaka local time is `+06:00`. */
  dateTime: string;
  capacity: number;
  priceTaka: number;
};

/** The registration, payment and reminder columns that become features. */
export type ForecastRegistrationSource = {
  registrationId: string;
  /** `registrations.created_at`, ISO 8601 UTC. */
  createdAt: string;
  /** `registrations.days_before_event`, nullable in the schema. */
  daysBeforeEvent: number | null;
  /** `payments.paid_at`, ISO 8601 UTC. `null` when there is no successful payment. */
  paidAt: string | null;
  /** Already reduced from the `reminders` row by the read model. */
  reminderStatus: ReminderStatus;
};

/**
 * API_CONTRACT.md §4.3.1: `prior_attendance_count` is a **synthetic** historical
 * count and "must not be derived from real user history in v1.0".
 *
 * The application therefore cannot produce a meaningful value for it: these are
 * real registrations, and the synthetic history the contract describes lives in the
 * AI service's own training data, not in this database. `0` is the one honest
 * number available — "no synthetic history exists for this registrant" — and it is
 * a real statement rather than a stand-in for a statistic that was never computed.
 *
 * The cost is stated plainly rather than hidden: every row carries the same prior,
 * so the model cannot learn anything from this feature in the MVP. If the AI owner
 * wants a synthetic prior per registrant, it has to come from their side of the
 * boundary; inventing one here would be fabricating history.
 */
const SYNTHETIC_PRIOR_ATTENDANCE_COUNT = 0;

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/** Contract §4.3.1: `payment_delay_hours` is `>= 0.0` with 2 decimal places. */
const PAYMENT_DELAY_DECIMALS = 2;

/** `round(x, 2)` without `toFixed`, which returns a string. */
function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;

  // `Number.EPSILON` nudges values such as `1.005` that are stored just below
  // their decimal boundary, so the result matches `round(x, 2)` in the contract's
  // arithmetic check rather than trailing one step low.
  return Math.round((value + Number.EPSILON * Math.sign(value)) * factor) / factor;
}

/**
 * Whole days from registration to the event, matching how
 * `registrations.days_before_event` is written at registration time
 * (`src/server/registrations/registrations.ts`).
 *
 * Used only when the stored column is `NULL`, which happens for rows written
 * before the column existed. Recomputing it is honest: same inputs, same rule.
 */
function daysUntilEvent(eventDateTime: string, createdAt: string): number | null {
  const eventTime = new Date(eventDateTime).getTime();
  const createdTime = new Date(createdAt).getTime();

  if (Number.isNaN(eventTime) || Number.isNaN(createdTime)) {
    return null;
  }

  return Math.max(0, Math.floor((eventTime - createdTime) / MS_PER_DAY));
}

/**
 * Hours between registering and the payment succeeding, or `null`.
 *
 * `null` is the contract's "payment not yet successful" (§4.3.1) and is explicitly
 * **not** `0.0`: the service treats an unpaid registration differently from one that
 * paid immediately. A negative interval — only reachable through clock skew between
 * a payment callback and the stored creation time — is clamped to `0.0` rather than
 * sent as an out-of-range value.
 */
function paymentDelayHours(paidAt: string | null, createdAt: string): number | null {
  if (paidAt === null) {
    return null;
  }

  const paidTime = new Date(paidAt).getTime();
  const createdTime = new Date(createdAt).getTime();

  if (Number.isNaN(paidTime) || Number.isNaN(createdTime)) {
    return null;
  }

  return round(Math.max(0, paidTime - createdTime) / MS_PER_HOUR, PAYMENT_DELAY_DECIMALS);
}

/** One row, in the shape the AI service expects. */
export function toAttendanceInput(input: {
  event: ForecastEventSource;
  registration: ForecastRegistrationSource;
}): AttendanceInput {
  const { event, registration } = input;
  const calendar = eventLocalCalendar(event.dateTime);

  if (!calendar) {
    throw new Error(
      `Event ${event.id} has a date_time that is not a usable date, so its calendar features cannot be derived.`,
    );
  }

  const daysBeforeEventRegistered =
    registration.daysBeforeEvent ?? daysUntilEvent(event.dateTime, registration.createdAt);

  if (daysBeforeEventRegistered === null) {
    throw new Error(
      `Registration ${registration.registrationId} has no usable registration date, so days_before_event_registered cannot be derived.`,
    );
  }

  return {
    // Correlation keys only (§4.3.1). Never model features.
    registration_id: registration.registrationId,
    event_id: event.id,
    event_category: event.category,
    ticket_price_taka: event.priceTaka,
    days_before_event_registered: Math.max(0, Math.trunc(daysBeforeEventRegistered)),
    payment_delay_hours: paymentDelayHours(registration.paidAt, registration.createdAt),
    event_day_of_week: calendar.isoWeekday,
    event_start_hour: calendar.startHour,
    location_type: event.locationType,
    reminder_status: registration.reminderStatus,
    prior_attendance_count: SYNTHETIC_PRIOR_ATTENDANCE_COUNT,
    // Only paid, non-cancelled registrations are ever sent (§4.4.1), so this is
    // always `false`. It is still sent because the field is part of the closed set
    // and the service is required to handle the cancelled case.
    is_cancelled: false,
  };
}

/**
 * The whole request for one event: `event_id`, capacity, the event's own date/time,
 * the evaluation instant, and every paid registration in a single array (§4.4.1,
 * §7.1 — one batched call per event, never one call per registration).
 *
 * `event_id` is repeated on every row by contract, and every row is built from the
 * same event object, so the "all rows share the top-level `event_id`" rule cannot be
 * violated by this code.
 */
export function toForecastRequest(input: {
  event: ForecastEventSource;
  registrations: ForecastRegistrationSource[];
  /** ISO 8601 UTC evaluation instant. Always sent, never defaulted server-side. */
  asOf: string;
}): ForecastRequest {
  return {
    event_id: input.event.id,
    event_capacity: input.event.capacity,
    event_date_time: input.event.dateTime,
    as_of: input.asOf,
    registrations: input.registrations.map((registration) =>
      toAttendanceInput({ event: input.event, registration }),
    ),
  };
}