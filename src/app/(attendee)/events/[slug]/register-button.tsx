"use client";

import { useActionState } from "react";

import { registerAction, type RegisterActionState } from "./actions";

const INITIAL_STATE: RegisterActionState = { error: null };

/**
 * The event page's primary call to action.
 *
 * A Client Component only so `useActionState` can re-render with a
 * server-decided message such as "This event is full". It submits the event
 * slug and nothing else; the registration decision is made on the server.
 */
export function RegisterButton({
  eventSlug,
  isFree,
  disabled,
}: {
  eventSlug: string;
  isFree: boolean;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(registerAction, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="slug" value={eventSlug} />

      <button
        type="submit"
        disabled={disabled || pending}
        className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Registering…" : isFree ? "Register (free)" : "Register"}
      </button>

      {state.error ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}