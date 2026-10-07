import Link from "next/link";

import { buttonClass } from "@/components/ui/button-styles";
import { Card } from "@/components/ui/card";
import { CompassIcon, ShieldIcon, SparkleIcon, TicketIcon } from "@/components/ui/icons";
import { getCurrentUser } from "@/server/auth/session";

const STEPS = [
  {
    icon: ShieldIcon,
    title: "Continue with upay",
    body: "No password, just your name and phone number.",
  },
  {
    icon: CompassIcon,
    title: "Find an event",
    body: "Browse published events with venue, time, price, and capacity.",
  },
  {
    icon: TicketIcon,
    title: "Pay and show your QR",
    body: "Register and pay with upay, then show your QR ticket at the gate.",
  },
];

/**
 * Landing page (PRD §8 — landing page, then "Continue with upay"). The single
 * callout is the upay sign-in; everything past it is behind the session.
 */
export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xl font-extrabold tracking-tight text-upay-navy lg:text-2xl">
          {user ? `Hello, ${user.name.split(" ")[0]}` : "Welcome to UpayEvents"}
        </p>
        <p className="mt-1 text-xs font-medium text-upay-navy/50 sm:text-sm">
          Merchant &amp; Agent Intelligence
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <section className="hero-banner relative overflow-hidden rounded-hero p-6 text-white shadow-hero lg:min-h-80 lg:p-9">
          <div className="pointer-events-none absolute -top-8 -right-8 size-40 rounded-full border-[2.5rem] border-white/10" />
          <div className="pointer-events-none absolute right-6 bottom-5 size-12 rounded-full bg-upay-yellow/25 blur-xl" />
          <div className="relative z-[1] max-w-md">
            <p className="mb-2 text-[0.6875rem] font-bold tracking-[0.12em] text-white/75 uppercase">
              Your event hub
            </p>
            <h1 className="text-[1.75rem] leading-[1.12] font-extrabold tracking-tight lg:text-[2.6rem]">
              Student events,
              <br />
              paid with upay.
            </h1>
            <p className="mt-3 max-w-sm text-sm font-medium text-white/80">
              Hackathons, workshops, career fairs, and cultural nights. One account, one payment
              flow, one secure ticket.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {user ? (
                <Link href="/events" className={buttonClass("light")}>
                  Browse events
                </Link>
              ) : (
                <Link href="/login" className={buttonClass("primary")}>
                  Continue with upay
                </Link>
              )}
            </div>
          </div>
          <div className="hero-wave absolute inset-x-0 bottom-0 h-14" />
        </section>

        <Link
          href="/organizer"
          className="recommendation-card flex flex-col justify-between gap-4 rounded-card border border-upay-yellow/45 p-5 shadow-card transition-transform hover:-translate-y-0.5"
        >
          <span className="grid size-10 place-items-center rounded-full bg-upay-yellow text-upay-blue shadow-active">
            <SparkleIcon className="size-5" />
          </span>
          <span>
            <span className="block text-[0.625rem] font-bold tracking-[0.12em] text-upay-navy/55 uppercase">
              For organizers
            </span>
            <span className="mt-1 block text-lg font-extrabold text-upay-navy">
              Know how many people will actually turn up.
            </span>
            <span className="mt-1 block text-xs font-medium text-upay-navy/55">
              AI attendance forecasts, no-show risk, and a recommended next action for every event.
            </span>
          </span>
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-extrabold text-upay-navy">How it works</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map(({ icon: StepIcon, title, body }, index) => (
            <Card as="li" key={title} className="p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-upay-yellow-soft text-upay-blue">
                  <StepIcon className="size-4" />
                </span>
                <span className="text-[0.6875rem] font-bold text-upay-navy/40">Step {index + 1}</span>
              </div>
              <p className="mt-3 text-sm font-extrabold text-upay-navy">{title}</p>
              <p className="mt-1 text-xs font-medium text-upay-navy/55">{body}</p>
            </Card>
          ))}
        </ol>
      </section>

      <p className="text-xs font-medium text-upay-navy/45">
        Demo build: upay login and payments are simulated and no real account is created. AI
        forecasts come from a model trained on synthetic data only.
      </p>
    </div>
  );
}
