import type { EventCategory, LocationType, TicketStatus } from "@/db/enums";

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