import type { Metadata } from "next";
import Link from "next/link";

import { formatEventDate, formatEventTime, ticketStatusLabel } from "@/lib/format";
import { requireCurrentUser } from "@/server/auth/session";
import { listTicketsForUser } from "@/server/tickets/tickets";

export const metadata: Metadata = {
  title: "My tickets",
};

/** Every ticket belonging to the signed-in attendee, soonest event first. */
export default async function TicketsPage() {
  const user = await requireCurrentUser("/tickets");

  const tickets = await listTicketsForUser(user.id);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">My tickets</h1>
        <p className="text-sm text-muted-foreground">
          {tickets.length === 0
            ? "You do not have any tickets yet."
            : `${tickets.length} ${tickets.length === 1 ? "ticket" : "tickets"} for ${user.name}.`}
        </p>
      </header>

      {tickets.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border p-10 text-center">
          <h2 className="text-base font-semibold">No tickets yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Register for an event and pay with upay — your QR ticket appears here straight away.
          </p>
          <Link
            href="/events"
            className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:opacity-90"
          >
            Discover events
          </Link>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {tickets.map((ticket) => (
            <li
              key={ticket.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-5"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="font-semibold tracking-tight">
                  <Link href={`/tickets/${ticket.id}`} className="hover:underline">
                    {ticket.eventTitle}
                  </Link>
                </h2>
                <p className="text-sm text-muted-foreground">
                  <time dateTime={ticket.dateTime}>
                    {formatEventDate(ticket.dateTime)} · {formatEventTime(ticket.dateTime)}
                  </time>{" "}
                  · {ticket.venue}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                  {ticketStatusLabel(ticket.status)}
                </span>
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                >
                  View ticket
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}