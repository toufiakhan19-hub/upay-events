"use client";

import { useActionState } from "react";

import { loginAction, type LoginFormState } from "./actions";

const INITIAL_STATE: LoginFormState = { errors: {} };

/**
 * Mock upay login form. A Client Component only because `useActionState` needs
 * to re-render with the server's field errors — it holds no session state and
 * imports no database or server code.
 */
export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          maxLength={80}
          required
          aria-invalid={state.errors.name ? true : undefined}
          aria-describedby={state.errors.name ? "name-error" : undefined}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand"
          placeholder="e.g. Nusrat Jahan"
        />
        {state.errors.name ? (
          <p id="name-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.errors.name}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-sm font-medium">
          Phone number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          aria-invalid={state.errors.phone ? true : undefined}
          aria-describedby={state.errors.phone ? "phone-error" : "phone-hint"}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand"
          placeholder="01712345678"
        />
        {state.errors.phone ? (
          <p id="phone-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.errors.phone}
          </p>
        ) : (
          <p id="phone-hint" className="text-xs text-muted-foreground">
            Bangladeshi mobile number. Used only to identify your account in this demo.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Continuing…" : "Continue with upay"}
      </button>
    </form>
  );
}