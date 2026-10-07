import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "UpayEvents Insight",
};

/**
 * Shell for the attendee-facing pages. Authentication is enforced per page with
 * `requireCurrentUser`, not here, because `/` and `/login` live in the same
 * segment and must stay reachable while signed out.
 */
export default function AttendeeLayout({ children }: { children: React.ReactNode }) {
  return <AppShell variant="attendee">{children}</AppShell>;
}
