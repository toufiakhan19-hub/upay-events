import "server-only";

import { createSession } from "./session";
import { findOrCreateUserByPhone, type AuthenticatedUser } from "./users";
import { validateLoginInput, type LoginFieldErrors, type LoginInput } from "./validation";

/**
 * Mock "Continue with upay" sign-in (PRD §7).
 *
 * Sequence: validate → find or create the user by phone → open a session.
 * There is no password and no upay API call; a real integration replaces
 * `validateLoginInput` with an identity assertion and keeps the rest.
 */

export type SignInWithUpayResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; errors: LoginFieldErrors };

export async function signInWithUpay(input: LoginInput): Promise<SignInWithUpayResult> {
  const validated = validateLoginInput(input);

  if (!validated.ok) {
    return { ok: false, errors: validated.errors };
  }

  const user = await findOrCreateUserByPhone({ name: validated.name, phone: validated.phone });

  await createSession(user.id);

  return { ok: true, user };
}