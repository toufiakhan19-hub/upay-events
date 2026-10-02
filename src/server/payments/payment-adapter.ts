/**
 * Payment provider abstraction (PRD §11 — "Mock UpayPaymentAdapter", PRD §18 —
 * a real integration replaces the mock).
 *
 * The application depends on this interface, never on a concrete provider, so
 * swapping the mock for a real upay client is a one-line change in
 * `src/server/payments/index.ts`. Nothing above this boundary knows that
 * payments are simulated, and no provider here may touch the database:
 * adapters translate a request into a provider result, callers persist it.
 *
 * Deliberately no card, bank, wallet, OTP, or KYC fields anywhere in these
 * types (PRD §5: no real KYC, no wallet account creation, no real-money
 * processing).
 */

/** Amounts are integer Taka, never floats (`src/db/schema.ts` conventions). */
export type PaymentInitiationInput = {
  /** Integer Taka to charge, always read from the database. */
  amountTaka: number;
  /**
   * Idempotency key supplied by the caller (the registration id). A real
   * provider must treat a repeated key as the same payment attempt so a
   * double-clicked button cannot charge twice.
   */
  reference: string;
};

export type PaymentInitiation = {
  /** Provider-side handle for this attempt; stored as `mock_transaction_id`. */
  providerReference: string;
  initiatedAt: Date;
};

export type PaymentCaptureInput = {
  amountTaka: number;
  /** The `providerReference` returned by `initiate`. */
  providerReference: string;
  reference: string;
  /**
   * Requested outcome for the mock provider. A real adapter ignores this and
   * reports whatever the provider decided; it exists so the demo can show both
   * the success and the failure state from the same screen.
   */
  simulate?: PaymentSimulation;
};

export type PaymentSimulation = "success" | "failure";

export type PaymentCapture =
  | {
      status: "success";
      /** Provider transaction id. Must not embed any financial or personal data. */
      transactionId: string;
      capturedAt: Date;
    }
  | {
      status: "failed";
      failureCode: string;
      /** Attendee-safe explanation. Never a raw provider or stack error. */
      message: string;
    };

export interface UpayPaymentAdapter {
  /** Identifies the active provider in server logs and on the checkout page. */
  readonly name: string;
  /** True while no real money can move; the UI labels the flow as a demo. */
  readonly isSimulation: boolean;

  /** Opens a payment attempt and returns the handle used by `capture`. */
  initiate(input: PaymentInitiationInput): Promise<PaymentInitiation>;

  /** Completes an attempt: the only path to a successful payment. */
  capture(input: PaymentCaptureInput): Promise<PaymentCapture>;
}