import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-24">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">We could not find that event</h1>
      <p className="text-sm text-muted-foreground">
        The link may be wrong, or the event may no longer be published.
      </p>
      <Link
        href="/events"
        className="w-fit rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
      >
        Browse events
      </Link>
    </main>
  );
}