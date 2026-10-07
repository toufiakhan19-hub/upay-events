import type { Metadata } from "next";

import { OrganizerHeader } from "@/components/organizer-header";

export const metadata: Metadata = {
  title: "Organizer dashboard",
};

/**
 * Shell for the organizer dashboard.
 *
 * Wider than the attendee shell because the dashboard is read from a laptop
 * screen during a presentation. No auth guard here: `/organizer` itself is the
 * demo access point, and event pages call `requireOrganizer` individually.
 */
export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OrganizerHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>

      <footer className="border-t">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-muted-foreground sm:px-6">
          Organizer dashboard — demo build. Registration, payment, and check-in figures are read
          from the live database. Organizer access is a demo selector, not an authentication system.
          AI forecasts come from a model trained on synthetic data only.
        </div>
      </footer>
    </>
  );
}