import Link from "next/link";

import { getCurrentUser } from "@/server/auth/session";

/**
 * Landing page (PRD §8 — landing page, then "Continue with upay"). The single
 * callout is the upay sign-in; everything past it is behind the session.
 */
export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-6 py-20">
      <header className="flex flex-col gap-4">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Merchant &amp; Agent Intelligence
        </p>

        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Student events, paid with upay.
        </h1>

        <p className="max-w-xl text-base text-muted-foreground">
          Find hackathons, workshops, career fairs, and cultural nights near you. One account, one
          payment flow, one secure ticket — and organizers who know how many people will actually
          turn up.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        {user ? (
          <>
            <Link
              href="/events"
              className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground hover:opacity-90"
            >
              Browse events
            </Link>
            <span className="text-sm text-muted-foreground">Signed in as {user.name}</span>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground hover:opacity-90"
          >
            Continue with upay
          </Link>
        )}
      </div>

      <section className="flex flex-col gap-3 border-t pt-8">
        <h2 className="text-sm font-semibold tracking-tight uppercase">How it works</h2>
        <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
          <li>1. Continue with upay — no password, just your name and phone number.</li>
          <li>2. Browse published events with venue, time, price, and capacity.</li>
          <li>3. Register and pay with upay, then show your QR ticket at the gate.</li>
        </ol>
      </section>

      <p className="text-xs text-muted-foreground">
        Demo build: upay login and payments are simulated and no real account is created. Payments,
        QR tickets, and AI forecasts ship in later phases.
      </p>
    </main>
  );
}