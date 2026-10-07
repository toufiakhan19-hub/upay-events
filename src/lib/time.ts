/**
 * Timestamps are stored as ISO 8601 UTC strings with second precision and a `Z`
 * suffix (`src/db/schema.ts` convention). The `created_at` column default
 * (`to_char(... 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`) produces exactly this shape, so code that writes a timestamp itself
 * has to match it or string comparisons in queries would be inconsistent.
 */

export function toUtcTimestamp(date: Date): string {
  return `${date.toISOString().slice(0, 19)}Z`;
}

/**
 * Event-local calendar fields, read in Bangladesh Standard Time.
 *
 * `events.date_time` is stored with an explicit offset (usually `+06:00`), but the
 * two features derived from it for the AI service are defined in *Dhaka local
 * time*, not in whatever offset the row happens to carry (API_CONTRACT.md §2.1):
 * `event_day_of_week` (ISO weekday, `1` = Monday) and `event_start_hour` (`0`–`23`).
 * Both are resolved through `Intl` with a pinned time zone rather than
 * `Date#getHours`, so the same event always produces the same feature regardless of
 * where the Node process or the organizer's browser happens to be.
 *
 * `null` means the stored value is not a usable date. That is deliberately not
 * silently repaired into "today" or hour 0 — see `src/server/ai/features.ts`.
 */

const DHAKA_TIME_ZONE = "Asia/Dhaka";

/** `en-US` short weekday names mapped to ISO 8601 numbering (Sunday is 7). */
const ISO_WEEKDAYS: Record<string, number> = {
  Sun: 7,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DHAKA_TIME_ZONE,
  weekday: "short",
});

const hourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DHAKA_TIME_ZONE,
  hour: "2-digit",
  hourCycle: "h23",
});

export type EventLocalCalendar = {
  /** ISO 8601 weekday: `1` = Monday … `7` = Sunday. */
  isoWeekday: number;
  /** Hour of day in Dhaka local time, `0`–`23`. */
  startHour: number;
};

export function eventLocalCalendar(dateTime: string): EventLocalCalendar | null {
  const date = new Date(dateTime);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const isoWeekday = ISO_WEEKDAYS[weekdayFormatter.format(date)];
  const startHour = Number(hourFormatter.format(date));

  if (isoWeekday === undefined || !Number.isInteger(startHour)) {
    return null;
  }

  return { isoWeekday, startHour };
}