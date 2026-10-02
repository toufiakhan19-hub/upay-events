const FOUNDATION_ITEMS = [
  "Next.js App Router with TypeScript",
  "Tailwind CSS v4",
  "SQLite via Drizzle ORM",
  "MVP database schema and migrations",
] as const;

const UPCOMING_PHASES = [
  "Phase 2 — mock upay login, event discovery, registration, payment, QR ticket",
  "Phase 3 — AI no-show model integration and event forecasts",
  "Phase 4 — organizer dashboard and check-in",
] as const;

/**
 * Foundation placeholder. Deliberately states build status instead of
 * pretending product features exist — the attendee and organizer flows land in
 * later phases.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">UpayEvents Insight</h1>
        <p className="text-sm text-muted-foreground">
          Foundation phase. Payments are simulated and predictions are synthetic.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight uppercase">
          In place
        </h2>
        <ul className="flex flex-col gap-2 text-sm">
          {FOUNDATION_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span aria-hidden className="text-muted-foreground">
                &middot;
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight uppercase">
          Not built yet
        </h2>
        <ul className="flex flex-col gap-2 text-sm">
          {UPCOMING_PHASES.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span aria-hidden className="text-muted-foreground">
                &middot;
              </span>
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="text-sm text-muted-foreground">
        Database connectivity:{" "}
        <a className="underline" href="/api/health">
          GET /api/health
        </a>
      </footer>
    </main>
  );
}