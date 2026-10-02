"use server";

import { redirect } from "next/navigation";

import { safeInternalPath } from "@/lib/redirect";
import { signInWithUpay } from "@/server/auth/login";
import type { LoginFieldErrors } from "@/server/auth/validation";

/**
 * Server action behind the mock "Continue with upay" form.
 *
 * All validation and the user/session work happen here on the server; the form
 * only renders whatever field errors come back. `redirect` throws, so it stays
 * outside any try/catch.
 */

export type LoginFormState = {
  errors: LoginFieldErrors;
};

export async function loginAction(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const result = await signInWithUpay({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });

  if (!result.ok) {
    return { errors: result.errors };
  }

  redirect(safeInternalPath(formData.get("next")));
}