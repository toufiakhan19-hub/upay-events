import Link from "next/link";

import { switchOrganizerAction } from "@/app/organizer/actions";
import { getCurrentOrganizer } from "@/server/organizers/access";

/**
 * Organizer header: branding, a way back to the attendee site, and which
 * organization the demo is currently acting as.
 *
 * A Server Component, like the attendee header, because it reads the organizer
 * cookie. The cookie value itself is never rendered.
 */
export async function OrganizerHeader() {
  const organizer = await getCurrentOrganizer();

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <div className="flex items-baseline gap-2">
          <Link href="/organizer" className="flex items-baseline gap-1.5 font-semibold tracking-tight">
            <span>UpayEvents</span>
            <span className="text-xs font-normal text-muted-foreground">Organizer</span>
          </Link>
        </div>

        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/events"
            className="rounded-md px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Attendee site
          </Link>

          {organizer ? (
            <>
              <span className="max-w-[14rem] truncate text-muted-foreground" title={organizer.organizationName}>
                {organizer.organizationName}
              </span>
              <form action={switchOrganizerAction}>
                <button
                  type="submit"
                  className="rounded-md border border-border px-3 py-1.5 font-medium hover:bg-muted"
                >
                  Switch organizer
                </button>
              </form>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Demo organizer access</span>
          )}
        </nav>
      </div>
    </header>
  );
}