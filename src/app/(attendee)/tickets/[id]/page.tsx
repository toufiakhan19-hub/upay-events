import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { formatEventDate, formatEventTime, ticketStatusLabel } from "@/lib/format";
import { requireCurrentUser } from "@/server/auth/session";
import { getTicketForUser, ticketReference } from "@/server/tickets/tickets";
import { ticketQrDataUrl } from "@/server/tickets/qr";

export const metadata: Metadata = {
  title: "Your ticket",
};

type TicketPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * One ticket, with its QR code.
 *
 * Ownership is resolved in the query, so another attendee's ticket id produces
 * no row and answers 404 rather than rendering someone else's ticket. The QR
 * encodes only the opaque token.
 */
export default async function TicketPage({ params }: TicketPageProps) {
  const { id } = await params;

  const user = await requireCurrentUser(`/tickets/${id}`);

  const ticket = await getTicketForUser(id, user.id);

  if (!ticket) {
    // Unknown ticket, or a ticket owned by somebody else: identical response.
    notFound();
  }

  const qrDataUrl = await ticketQrDataUrl(ticket.qrToken);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Your ticket
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{ticket.eventTitle}</h1>
      </header>

      <section className="flex flex-col gap-5 rounded-xl border border-border p-6">
        <div className="flex justify-center">
          <Image
            src={qrDataUrl}
            alt={`QR code for ticket ${ticketReference(ticket.qrToken)}`}
            width={240}
            height={240}
            unoptimized
            className="h-auto w-60 rounded-md"
          />
        </div>

        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Attendee</dt>
            <dd>{ticket.attendeeName}</dd>
          </div>

          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Date and time</dt>
            <dd>
              {formatEventDate(ticket.dateTime)} · {formatEventTime(ticket.dateTime)}{" "}
              <span className="text-xs text-muted-foreground">(UTC+06:00)</span>
            </dd>
          </div>

          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Venue</dt>
            <dd>{ticket.venue}</dd>
          </div>

          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Ticket reference</dt>
            <dd className="font-mono">{ticketReference(ticket.qrToken)}</dd>
          </div>

          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                {ticketStatusLabel(ticket.status)}
              </span>
            </dd>
          </div>
        </dl>

        <p className="text-xs text-muted-foreground">
          Show this code at the entrance. The QR carries only a random ticket token — no name,
          phone number, or payment data. Each ticket can be checked in once.
        </p>
      </section>

      <div className="flex flex-wrap gap-4 text-xs">
        <Link href="/tickets" className="underline">
          My tickets
        </Link>
        <Link href={`/events/${ticket.eventSlug}`} className="underline">
          Event details
        </Link>
      </div>
    </div>
  );
}