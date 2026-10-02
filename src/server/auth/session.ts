import "server-only";

import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/db/client";
import { sessions, users } from "@/db/schema";
import { newId } from "@/lib/ids";
import { toUtcTimestamp } from "@/lib/time";

/**
 * Mock "Continue with upay" session layer (PRD §7: upay-linked login, no
 * separate password).
 *
 * - The session id lives only in an HTTP-only cookie, never in page markup, a
 *   client bundle, or a URL.
 * - The row in `sessions` is the source of truth; the cookie carries the key.
 * - Sessions expire and an expired session is treated as signed out.
 *
 * `server-only` plus the absence of any "use client" import in this file is what
 * keeps the database handle out of the browser bundle.
 */

export const SESSION_COOKIE_NAME = "upay_session";

/** MVP-appropriate rolling window: long enough for a demo day, short enough to expire. */
const SESSION_TTL_DAYS = 30;

/** Minimal attendee identity. No wallet, balance, or payment data (PRD §14). */
export type SessionUser = {
  id: string;
  name: string;
  phone: string;
};

function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    // `lax` keeps the cookie on top-level navigations while blocking the
    // cross-site form posts CSRF relies on. The session is also re-checked
    // against the database on every request.
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

/**
 * Creates a session row and writes the HTTP-only cookie.
 *
 * Signing in again from the same browser replaces that browser's session
 * instead of accumulating rows; sessions issued on other devices are untouched.
 */
export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const previousSessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const sessionId = newId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  if (previousSessionId) {
    await db.delete(sessions).where(eq(sessions.id, previousSessionId));
  }

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt: toUtcTimestamp(expiresAt),
  });

  cookieStore.set(SESSION_COOKIE_NAME, sessionId, sessionCookieOptions(expiresAt));
}

/**
 * Current attendee, or `null` when signed out.
 *
 * Wrapped in React `cache` so the header, the page, and any nested component
 * share one query per request.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const sessionId = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(eq(sessions.id, sessionId), gt(sessions.expiresAt, toUtcTimestamp(new Date()))),
    )
    .limit(1);

  return row ?? null;
});

/**
 * Guard for attendee-only pages. Redirects to the mock upay login and returns
 * `never` on that path, so callers get a non-nullable user.
 */
export async function requireCurrentUser(returnTo?: string): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
    redirect(`/login${next}`);
  }

  return user;
}

/** Destroys the session row and clears the cookie. */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}