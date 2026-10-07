"use client";

import { useActionState } from "react";

import { buttonClass } from "@/components/ui/button-styles";

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
        className={buttonClass("primary", "lg", "w-full font-extrabold")}
      >
        {pending ? "Registering…" : isFree ? "Register (free)" : "Register with upay"}
      </button>

      {state.error ? (
        <p role="alert" className="text-xs font-medium text-red-600">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}