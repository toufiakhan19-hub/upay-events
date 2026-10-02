import type { Metadata } from "next";

import { EventCard } from "@/components/event-card";
import { requireCurrentUser } from "@/server/auth/session";
import { listPublishedEvents } from "@/server/events/queries";

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
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Discover events</h1>
        <p className="text-sm text-muted-foreground">
          {events.length === 0
            ? "No events are published right now."
            : `${events.length} published ${events.length === 1 ? "event" : "events"}. Times are shown in Bangladesh Standard Time (UTC+06:00).`}
        </p>
      </header>

      {events.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border p-10 text-center">
          <h2 className="text-base font-semibold">Nothing here yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Published events will appear here as soon as organizers announce them. Run{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run db:seed</code> to load the
            demo events.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </section>
      )}
    </div>
  );
}