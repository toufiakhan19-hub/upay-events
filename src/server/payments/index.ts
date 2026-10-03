import "server-only";

import { MockUpayPaymentAdapter } from "./mock-upay-payment";
import type { UpayPaymentAdapter } from "./payment-adapter";

/**
 * The single place that decides which payment provider the app talks to.
 *
 * Everything else depends on `UpayPaymentAdapter`. To integrate a real upay
 * merchant API later, implement the interface in a new module and return it
 * here; no registration, checkout, or ticket code changes (PRD §18).
 */

let adapter: UpayPaymentAdapter | undefined;

export function getPaymentAdapter(): UpayPaymentAdapter {
  adapter ??= new MockUpayPaymentAdapter();

  return adapter;
}

export type {
  PaymentCapture,
  PaymentCaptureInput,
  PaymentInitiation,
  PaymentInitiationInput,
  PaymentSimulation,
  UpayPaymentAdapter,
} from "./payment-adapter";