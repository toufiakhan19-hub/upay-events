import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "UpayEvents Insight",
};

/**
 * Shell for the attendee-facing pages. Authentication is enforced per page with
 * `requireCurrentUser`, not here, because `/login` lives in the same segment and
 * must stay reachable while signed out.
 */
export default function AttendeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>

      <footer className="border-t">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 text-xs text-muted-foreground sm:px-6">
          UpayEvents Insight — demo build. upay login and payments are simulated; no real
          account is created and no money moves.
        </div>
      </footer>
    </>
  );
}