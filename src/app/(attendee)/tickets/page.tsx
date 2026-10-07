import type { Metadata } from "next";
import Link from "next/link";

import { buttonClass } from "@/components/ui/button-styles";
import { Card } from "@/components/ui/card";
import { CategoryTile } from "@/components/ui/category-tile";
import { CalendarIcon, ChevronRightIcon, PinIcon, TicketIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
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
    <div className="flex flex-col">
      <PageHeader
        title="My tickets"
        subtitle={
          tickets.length === 0
            ? "You do not have any tickets yet."
            : `${tickets.length} ${tickets.length === 1 ? "ticket" : "tickets"} for ${user.name}.`
        }
      />

      {tickets.length === 0 ? (
        <Card className="mx-auto w-full max-w-md p-8 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-upay-yellow-soft text-upay-blue">
            <TicketIcon className="size-5" />
          </span>
          <h2 className="mt-3 text-sm font-extrabold text-upay-navy">Your calendar is open</h2>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed font-medium text-upay-navy/50">
            Register for an event and pay with upay. Your QR ticket appears here straight away.
          </p>
          <Link href="/events" className={buttonClass("primary", "md", "mt-5")}>
            Discover events
          </Link>
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/tickets/${ticket.id}`}
                className="event-card group flex items-center gap-4 rounded-card p-3 shadow-card transition-transform hover:-translate-y-0.5"
              >
                <CategoryTile
                  category={ticket.eventCategory}
                  className="size-20 shrink-0 rounded-2xl"
                  iconClassName="size-8"
                />
                <div className="min-w-0 flex-1">
                  <Pill tone={ticket.status === "valid" ? "yellow" : "blue"}>
                    {ticketStatusLabel(ticket.status)}
                  </Pill>
                  <h2 className="mt-2 truncate text-sm font-extrabold text-upay-navy">
                    {ticket.eventTitle}
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-[0.6875rem] font-semibold text-upay-navy/50">
                    <CalendarIcon className="size-3.5 shrink-0 text-upay-blue" />
                    <time dateTime={ticket.dateTime}>
                      {formatEventDate(ticket.dateTime)} · {formatEventTime(ticket.dateTime)}
                    </time>
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[0.6875rem] font-semibold text-upay-navy/50">
                    <PinIcon className="size-3.5 shrink-0 text-upay-blue" />
                    <span className="truncate">{ticket.venue}</span>
                  </p>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-upay-yellow text-upay-blue shadow-button transition-transform group-hover:translate-x-0.5">
                  <ChevronRightIcon className="size-4" />
                  <span className="sr-only">View ticket</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
