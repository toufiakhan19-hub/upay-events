import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Organizer dashboard",
};

/**
 * Shell for the organizer dashboard. No auth guard here: `/organizer` itself is
 * the demo access point, and event pages call `requireOrganizer` individually.
 */
export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell variant="organizer">{children}</AppShell>;
}
