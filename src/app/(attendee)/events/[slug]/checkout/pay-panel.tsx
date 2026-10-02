"use client";

import { useActionState } from "react";

import { payAction, type PayActionState } from "./actions";

const INITIAL_STATE: PayActionState = { error: null };

/**
 * Mock upay checkout controls.
 *
 * "Pay with upay" succeeds; the second button deliberately fails so the demo can
 * show what a declined payment looks like. Both go through the same server
 * action, and neither collects a card, wallet, or OTP — there is no real
 * provider behind it.
 */
export function PayPanel({ eventSlug, amountLabel }: { eventSlug: string; amountLabel: string }) {
  const [state, formAction, pending] = useActionState(payAction, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="slug" value={eventSlug} />

      <button
        type="submit"
        name="outcome"
        value="success"
        disabled={pending}
        className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Contacting upay…" : `Pay ${amountLabel} with upay`}
      </button>

      <button
        type="submit"
        name="outcome"
        value="failure"
        disabled={pending}
        className="w-full rounded-md border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-60"
      >
        Simulate a declined payment
      </button>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}