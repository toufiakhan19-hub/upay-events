import Link from "next/link";

import { buttonClass } from "@/components/ui/button-styles";
import { Card } from "@/components/ui/card";
import { HostIcon } from "@/components/ui/icons";

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
    <Card className="event-card flex max-w-lg flex-col items-start gap-4 p-7">
      <span className="grid size-11 place-items-center rounded-full bg-upay-yellow-soft text-upay-blue">
        <HostIcon className="size-5" />
      </span>
      <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-upay-blue/70 uppercase">404</p>
      <h1 className="text-2xl font-extrabold tracking-tight text-upay-navy">
        That event is not on your dashboard
      </h1>
      <p className="text-sm text-upay-navy/55">
        The event does not exist, or it belongs to a different organization. Organizers only ever see
        their own events.
      </p>
      <Link href="/organizer" className={buttonClass("primary")}>
        Back to your events
      </Link>
    </Card>
  );
}
