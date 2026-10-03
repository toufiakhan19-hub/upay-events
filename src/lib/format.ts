import type {
  ConfidenceLabel,
  EventCategory,
  EventStatus,
  LocationType,
  RecommendationActionType,
  RegistrationStatus,
  TicketStatus,
} from "@/db/enums";

/**
 * Presentation helpers shared by Server and Client Components.
 *
 * Kept free of database and `server-only` imports so a form can format the same
 * labels without pulling server code into the browser bundle. Every formatter
 * pins its locale and time zone: a `Date` rendered on the server and again on
 * the client must produce the identical string or React reports a hydration
 * mismatch. Events are always shown in Bangladesh Standard Time (UTC+06:00)
 * regardless of where the viewer is.
 */

const DHAKA_TIME_ZONE = "Asia/Dhaka";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DHAKA_TIME_ZONE,
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DHAKA_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** e.g. `Fri, Nov 13, 2026`. Returns the raw value if it is not a date. */
export function formatEventDate(dateTime: string): string {
  const date = new Date(dateTime);

  return Number.isNaN(date.getTime()) ? dateTime : dateFormatter.format(date);
}

/** e.g. `10:00 AM`. Returns the raw value if it is not a date. */
export function formatEventTime(dateTime: string): string {
  const date = new Date(dateTime);

  return Number.isNaN(date.getTime()) ? dateTime : timeFormatter.format(date);
}

/** Single-line variant for cards and metadata rows. */
export function formatEventDateTime(dateTime: string): string {
  return `${formatEventDate(dateTime)} · ${formatEventTime(dateTime)}`;
}

/**
 * Stored UTC timestamp (schema convention) rendered in Bangladesh Standard Time.
 * Used for check-in and forecast times, which are recorded in UTC but read
 * aloud to an organizer in local time.
 */
export function formatTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${formatEventDate(value)} · ${formatEventTime(value)}`;
}

/** Money is an integer count of taka, never a float (`src/db/schema.ts`). */
export function formatTaka(amountTaka: number): string {
  if (amountTaka <= 0) {
    return "Free";
  }

  return `৳${new Intl.NumberFormat("en-US").format(amountTaka)}`;
}

const CATEGORY_LABELS: Record<EventCategory, string> = {
  hackathon: "Hackathon",
  workshop: "Workshop",
  cultural: "Cultural",
  career_fair: "Career fair",
  conference: "Conference",
  sports: "Sports",
  other: "Other",
};

export function categoryLabel(category: EventCategory): string {
  return CATEGORY_LABELS[category];
}

const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  campus: "On campus",
  city: "City venue",
  online: "Online",
};

export function locationTypeLabel(locationType: LocationType): string {
  return LOCATION_TYPE_LABELS[locationType];
}

const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  valid: "Valid",
  checked_in: "Checked in",
  invalid: "Invalid",
};

export function ticketStatusLabel(status: TicketStatus): string {
  return TICKET_STATUS_LABELS[status];
}

const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Draft",
  published: "Published",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** PRD §12 event lifecycle, as shown on the organizer dashboard. */
export function eventStatusLabel(status: EventStatus): string {
  return EVENT_STATUS_LABELS[status];
}

const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  cancelled: "Cancelled",
};

/** Counts of each registration status, for dashboard breakdowns. */
export function registrationStatusLabel(status: RegistrationStatus): string {
  return REGISTRATION_STATUS_LABELS[status];
}

const CONFIDENCE_LABELS_TEXT: Record<ConfidenceLabel, string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

/**
 * API_CONTRACT.md §4.4.1 — `confidence_label` is the only form of `confidence`
 * the dashboard may present, so the label is what gets rendered.
 */
export function confidenceLabelText(label: ConfidenceLabel): string {
  return CONFIDENCE_LABELS_TEXT[label];
}

const RECOMMENDATION_ACTION_LABELS: Record<RecommendationActionType, string> = {
  open_waitlist: "Open waitlist",
  send_reminder: "Send reminder",
  adjust_catering: "Adjust catering",
  target_segment: "Target a segment",
  increase_capacity: "Increase capacity",
  no_action: "No action needed",
};

/** API_CONTRACT.md §4.4.1 action types, as the organizer reads them. */
export function recommendationActionLabel(actionType: RecommendationActionType): string {
  return RECOMMENDATION_ACTION_LABELS[actionType];
}

/** Grouped counts, e.g. `1,200`. Locale-pinned for hydration safety. */
export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/** Fixed-point number, e.g. `408.4`. Locale-pinned for hydration safety. */
export function formatDecimal(value: number, fractionDigits = 1): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/**
 * A stored `0.0`–`1.0` ratio as a percentage, e.g. `18.4%`. Forecast rates come
 * from the AI service already rounded (API_CONTRACT.md §2.2); this only changes
 * the presentation.
 */
export function formatPercent(ratio: number, fractionDigits = 1): string {
  return `${formatDecimal(ratio * 100, fractionDigits)}%`;
}