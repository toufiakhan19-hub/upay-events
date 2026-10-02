import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { newId } from "@/lib/ids";

/**
 * Attendee identity for the mock "Continue with upay" login.
 *
 * The phone number is the identity key: `users_phone_unique` already enforces
 * one row per number, so a repeat login reuses the existing user instead of
 * creating a duplicate (PRD §7 — name, phone, optional interests only, no
 * password).
 */

export type AuthenticatedUser = {
  id: string;
  name: string;
  phone: string;
};

/**
 * Opaque marker for the simulated upay account. Deliberately random rather
 * than derived from the phone number so no identifier can be reversed into a
 * phone number, and it is never sent to the AI service or rendered in the UI.
 */
function newMockUpayReference(): string {
  return `mock_acct_${newId().toLowerCase()}`;
}

async function selectUserByPhone(phone: string): Promise<AuthenticatedUser | undefined> {
  const [user] = await db
    .select({ id: users.id, name: users.name, phone: users.phone })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  return user;
}

/**
 * Returns the user for `phone`, creating the row only when the number is new.
 * `phone` is expected to already be normalized by
 * `validateLoginInput`, so the unique index sees one canonical form.
 */
export async function findOrCreateUserByPhone(input: {
  name: string;
  phone: string;
}): Promise<AuthenticatedUser> {
  const existing = await selectUserByPhone(input.phone);

  if (existing) {
    // The mock upay profile is the source of truth for the display name, so
    // refresh it when the attendee signs in with a different name.
    if (existing.name !== input.name) {
      await db
        .update(users)
        .set({ name: input.name })
        .where(eq(users.id, existing.id));

      return { ...existing, name: input.name };
    }

    return existing;
  }

  const id = newId();

  // `onConflictDoNothing` keeps two parallel first-time logins for the same
  // number from throwing; the re-read below then picks the winning row.
  await db
    .insert(users)
    .values({
      id,
      name: input.name,
      phone: input.phone,
      upayAccountReference: newMockUpayReference(),
    })
    .onConflictDoNothing({ target: users.phone });

  const user = await selectUserByPhone(input.phone);

  if (!user) {
    throw new Error("Could not create or load the user for that phone number.");
  }

  return user;
}