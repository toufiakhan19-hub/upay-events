import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { CompassIcon } from "@/components/ui/icons";
import { requireCurrentUser } from "@/server/auth/session";
import { listPublishedEvents } from "@/server/events/queries";

import { EventBrowser } from "./event-browser";

export const metadata: Metadata = {
  title: "Discover events",
};

/**
 * Event discovery (PRD §7 — event card with category, date, location, ticket
 * price, seats left). Attendee-only: signed-out visitors are redirected to the
 * mock upay login and returned here afterwards.
 */
export default async function EventsPage() {
  await requireCurrentUser("/events");

  const events = await listPublishedEvents();

  return (
    <div className="flex flex-col gap-7">
      <section className="hero-banner relative min-h-48 overflow-hidden rounded-hero p-6 text-white shadow-hero lg:min-h-60 lg:p-9">
        <div className="pointer-events-none absolute -top-8 -right-8 size-40 rounded-full border-[2.5rem] border-white/10" />
        <div className="pointer-events-none absolute top-8 right-16 size-12 rounded-full bg-upay-yellow/25 blur-xl" />
        <div className="relative z-[1] max-w-md">
          <p className="mb-2 text-[0.6875rem] font-bold tracking-[0.12em] text-white/75 uppercase">
            Powered by upay
          </p>
          <h1 className="text-[1.75rem] leading-[1.12] font-extrabold tracking-tight lg:text-4xl">
            Discover events.
            <br />
            Register with upay.
          </h1>
          <p className="mt-3 text-xs font-medium text-white/75 sm:text-sm">
            {events.length === 0
              ? "No events are published right now."
              : `${events.length} published ${events.length === 1 ? "event" : "events"}. Times are in Bangladesh Standard Time (UTC+06:00).`}
          </p>
        </div>
        <div className="hero-wave absolute inset-x-0 bottom-0 h-14" />
      </section>

      {events.length === 0 ? (
        <Card className="p-10 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-upay-yellow-soft text-upay-blue">
            <CompassIcon className="size-5" />
          </span>
          <h2 className="mt-3 text-base font-extrabold text-upay-navy">Nothing here yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-upay-navy/55">
            Published events will appear here as soon as organizers announce them. Run{" "}
            <code className="rounded bg-upay-blue-soft px-1 py-0.5 text-xs">npm run db:seed</code> to
            load the demo events.
          </p>
        </Card>
      ) : (
        <EventBrowser events={events} />
      )}
    </div>
  );
}
