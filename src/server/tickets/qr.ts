import "server-only";

import QRCode from "qrcode";

import { ticketQrPayload } from "./tickets";

/**
 * Renders a ticket QR code as an inline data URI.
 *
 * The encoded string is a version tag plus the opaque ticket token and nothing
 * else — no name, phone, price, or database id (PRD §14). A scanner in a later
 * phase resolves the token against `tickets.qr_token`, so revoking or checking
 * in a ticket stays a database decision rather than a claim inside the image.
 *
 * `toDataURL` is used instead of SVG markup so the ticket page needs no
 * `dangerouslySetInnerHTML`.
 */
export async function ticketQrDataUrl(qrToken: string): Promise<string> {
  return QRCode.toDataURL(ticketQrPayload(qrToken), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 480,
  });
}