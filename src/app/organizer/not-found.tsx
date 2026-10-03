import Link from "next/link";

/**
 * 404 inside the organizer segment.
 *
 * Reached for an unknown event id *and* for an event owned by another
 * organizer: `getOrganizerEventDashboard` matches no row in both cases, so the
 * two are indistinguishable from outside and the URL cannot be used to probe for
 * other organizers' events.
 */
export default function OrganizerEventNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">That event is not on your dashboard</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The event does not exist, or it belongs to a different organization. Organizers only ever see
        their own events.
      </p>
      <Link
        href="/organizer"
        className="w-fit rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
      >
        Back to your events
      </Link>
    </div>
  );
}