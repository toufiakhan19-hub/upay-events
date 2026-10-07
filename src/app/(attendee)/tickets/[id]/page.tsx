import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { buttonClass } from "@/components/ui/button-styles";
import { CategoryTile } from "@/components/ui/category-tile";
import { ArrowLeftIcon, ShieldIcon } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
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

  const rows = [
    { label: "Attendee", value: ticket.attendeeName },
    {
      label: "Date and time",
      value: (
        <>
          {formatEventDate(ticket.dateTime)} · {formatEventTime(ticket.dateTime)}{" "}
          <span className="text-xs font-medium text-upay-navy/45">(UTC+06:00)</span>
        </>
      ),
    },
    { label: "Venue", value: ticket.venue },
  ];

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <Link
        href="/tickets"
        className="flex w-fit items-center gap-1 text-xs font-bold text-upay-blue hover:underline"
      >
        <ArrowLeftIcon className="size-4" />
        My tickets
      </Link>

      <section className="event-card overflow-hidden rounded-card shadow-card">
        <CategoryTile category={ticket.eventCategory} className="" iconClassName="size-14">
          <div className="flex flex-col gap-2 p-5 pb-10 text-white">
            <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-white/80 uppercase">
              Your ticket
            </p>
            <h1 className="max-w-[16rem] text-xl leading-tight font-extrabold tracking-tight drop-shadow">
              {ticket.eventTitle}
            </h1>
          </div>
        </CategoryTile>

        <div className="relative -mt-5 flex justify-center px-5">
          <div className="rounded-2xl bg-white p-3 shadow-card">
            <Image
              src={qrDataUrl}
              alt={`QR code for ticket ${ticketReference(ticket.qrToken)}`}
              width={240}
              height={240}
              unoptimized
              className="h-auto w-56 rounded-md"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 px-5 pt-4">
          <p className="font-mono text-base font-bold tracking-wider text-upay-navy">
            {ticketReference(ticket.qrToken)}
          </p>
          <Pill tone={ticket.status === "valid" ? "yellow" : "blue"}>
            {ticketStatusLabel(ticket.status)}
          </Pill>
        </div>

        <div className="relative my-5 border-t border-dashed border-upay-blue/15">
          <span className="absolute -top-3 -left-3 size-6 rounded-full bg-background" />
          <span className="absolute -top-3 -right-3 size-6 rounded-full bg-background" />
        </div>

        <dl className="flex flex-col gap-3 px-5 text-sm">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-[0.6875rem] font-semibold tracking-wide text-upay-navy/45 uppercase">
                {label}
              </dt>
              <dd className="font-bold text-upay-navy">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="m-5 flex gap-2.5 rounded-2xl bg-upay-blue-soft p-3 text-xs font-medium text-upay-navy/65">
          <ShieldIcon className="size-4 shrink-0 text-upay-blue" />
          Show this code at the entrance. The QR carries only a random ticket token — no name, phone
          number, or payment data. Each ticket can be checked in once.
        </p>
      </section>

      <Link href={`/events/${ticket.eventSlug}`} className={buttonClass("light", "md", "w-full")}>
        Event details
      </Link>
    </div>
  );
}
