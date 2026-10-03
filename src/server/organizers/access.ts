import "server-only";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/db/client";
import { organizers } from "@/db/schema";

/**
 * Demo organizer access (PRD §15 Phase 4, hackathon build).
 *
 * This is deliberately the simplest thing that can demo: pick an organization
 * from a server-rendered list and the dashboard opens for it. It is **not** an
 * authentication system, and the code says so where it matters:
 *
 * - The cookie value is an organizer primary key. Editing it switches
 *   organizations, so anyone can view any organization's dashboard. Real
 *   organizer onboarding, verification and settlement are PRD §18 roadmap work,
 *   not this phase.
 * - A submitted organizer id is never trusted on its own: it must resolve to a
 *   row in `organizers` before the cookie is written, so a guessed or stale id
 *   cannot mint access to something that does not exist.
 * - Event data is scoped by organizer id inside every query
 *   (`./queries.ts`), so a dashboard can never render another organizer's
 *   event, whatever the URL says.
 *
 * The attendee session (`src/server/auth/session.ts`) is a separate cookie with
 * its own table and is untouched by this file: organizer access neither reads
 * nor writes attendee sessions, and attendee pages still require one.
 */

export const ORGANIZER_COOKIE_NAME = "upay_organizer";

/** Demo-day length: long enough to survive a restart mid-pitch. */
const ORGANIZER_ACCESS_TTL_DAYS = 7;

export type OrganizerSession = {
  id: string;
  organizationName: string;
  contactName: string;
};

function organizerCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    // `lax` and server-side re-reading on every request: the cookie is a
    // convenience key, never a claim the dashboard trusts on its own.
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

async function readOrganizer(organizerId: string): Promise<OrganizerSession | null> {
  const [row] = await db
    .select({
      id: organizers.id,
      organizationName: organizers.organizationName,
      contactName: organizers.contactName,
    })
    .from(organizers)
    .where(eq(organizers.id, organizerId))
    .limit(1);

  return row ?? null;
}

/**
 * Grants demo access to an organization, after confirming it exists.
 *
 * Returns `null` for an unknown id so the caller can answer with a friendly
 * message instead of writing a cookie for an organizer that is not there.
 */
export async function grantOrganizerAccess(organizerId: string): Promise<OrganizerSession | null> {
  const organizer = await readOrganizer(organizerId);

  if (!organizer) {
    return null;
  }

  const expires = new Date(Date.now() + ORGANIZER_ACCESS_TTL_DAYS * 24 * 60 * 60 * 1000);

  (await cookies()).set(ORGANIZER_COOKIE_NAME, organizer.id, organizerCookieOptions(expires));

  return organizer;
}

/** Drops demo access. There is no server-side organizer session row to delete. */
export async function revokeOrganizerAccess(): Promise<void> {
  (await cookies()).delete(ORGANIZER_COOKIE_NAME);
}

/**
 * The organization the demo is currently acting as, or `null`.
 *
 * Re-read from the database on every request, so deleting an organizer
 * immediately stops their dashboard instead of trusting a stale cookie.
 * Wrapped in React `cache` so the layout, header and page share one query.
 */
export const getCurrentOrganizer = cache(async (): Promise<OrganizerSession | null> => {
  const organizerId = (await cookies()).get(ORGANIZER_COOKIE_NAME)?.value;

  if (!organizerId) {
    return null;
  }

  return readOrganizer(organizerId);
});

/**
 * Guard for organizer pages. `/organizer` stays reachable without access because
 * it is where the demo selector lives.
 */
export async function requireOrganizer(): Promise<OrganizerSession> {
  const organizer = await getCurrentOrganizer();

  if (!organizer) {
    redirect("/organizer");
  }

  return organizer;
}