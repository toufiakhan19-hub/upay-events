import { formatEventDate, formatEventTime } from "@/lib/format";

/** Date and time in Bangladesh Standard Time, plus the UTC offset spelled out. */
export function EventDateTime({ dateTime }: { dateTime: string }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <time dateTime={dateTime}>{formatEventDate(dateTime)}</time>
      <time dateTime={dateTime}>{formatEventTime(dateTime)}</time>
      <span className="text-xs text-muted-foreground">(UTC+06:00)</span>
    </span>
  );
}