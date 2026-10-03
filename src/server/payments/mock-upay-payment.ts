import { newId } from "@/lib/ids";

import type {
  PaymentCapture,
  PaymentCaptureInput,
  PaymentInitiation,
  PaymentInitiationInput,
  UpayPaymentAdapter,
} from "./payment-adapter";

/**
 * Mock upay provider.
 *
 * Simulates initiation, success, and failure with no network call, no money,
 * and no credentials of any kind. The outcome is deterministic: the checkout
 * screen offers both a successful payment and a declined one so the demo can
 * show both states (PRD §7: payment success/failure state).
 *
 * The reference format is the important part for a future real integration:
 * opaque, prefixed, and carrying no amount, currency, phone, name, or id.
 */
export class MockUpayPaymentAdapter implements UpayPaymentAdapter {
  readonly name = "mock-upay";
  readonly isSimulation = true;

  async initiate(input: PaymentInitiationInput): Promise<PaymentInitiation> {
    // The mock ignores the amount; a real provider would validate it.
    void input;

    return {
      providerReference: `mock_pi_${newId()}`,
      initiatedAt: new Date(),
    };
  }

  async capture(input: PaymentCaptureInput): Promise<PaymentCapture> {
    if (input.simulate === "failure") {
      return {
        status: "failed",
        failureCode: "mock_declined",
        message: "upay declined this payment. No money was taken and no ticket was issued.",
      };
    }

    return {
      status: "success",
      transactionId: `mock_txn_${newId()}`,
      capturedAt: new Date(),
    };
  }
}