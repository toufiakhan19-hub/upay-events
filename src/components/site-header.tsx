import Link from "next/link";

import { logoutAction } from "@/server/auth/logout-action";
import { getCurrentUser } from "@/server/auth/session";

/**
 * Attendee header: branding, the Events link, and session state.
 *
 * A Server Component on purpose — it reads the session cookie and renders the
 * attendee's name, so nothing about the session reaches the client bundle. The
 * header never renders a session id.
 */
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-baseline gap-1.5 font-semibold tracking-tight">
          <span>UpayEvents</span>
          <span className="text-xs font-normal text-muted-foreground">Insight</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/events"
            className="rounded-md px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Events
          </Link>

          <Link
            href="/organizer"
            className="rounded-md px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Organizer
          </Link>

          {user ? (
            <>
              <Link
                href="/tickets"
                className="rounded-md px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                My tickets
              </Link>
              <span className="max-w-[10rem] truncate text-muted-foreground" title={user.name}>
                {user.name}
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md border border-border px-3 py-1.5 font-medium hover:bg-muted"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-brand px-3 py-1.5 font-medium text-brand-foreground hover:opacity-90"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}