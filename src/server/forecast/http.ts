import "server-only";

import { NextResponse } from "next/server";

import { newId } from "@/lib/ids";
import type { AiFailure } from "@/server/ai/types";

/**
 * The forecast endpoint's HTTP surface.
 *
 * The envelope is the same one `src/server/checkin/http.ts` uses and the one
 * `docs/API_CONTRACT.md` §5 documents — `{ error: { code, message, details,
 * request_id } }` with a ULID `request_id`. It is a separate module because the
 * *codes* are not the same: this endpoint is mostly a window onto somebody else's
 * failures, so it speaks the AI service's vocabulary (`MODEL_NOT_READY`, `TIMEOUT`,
 * `RATE_LIMITED`, …) rather than the check-in screen's.
 *
 * Two rules hold for every response built here:
 *
 * - `message` is written for the organizer. No stack traces, no exception names, no
 *   filesystem paths, no environment values, no raw response bodies.
 * - `request_id` is the handle to quote in a bug report. When the AI service supplied
 *   its own, that id is preserved (§5) so a failure can be traced straight to its
 *   logs; otherwise the app mints one.
 */

export type ForecastErrorCode =
  /** No organizer session — the app's own condition, same as the check-in routes. */
  | "UNAUTHORIZED"
  /** The event does not exist for this organization, which is also the answer for
   *   an event owned by somebody else. */
  | "NOT_FOUND"
  /** The request this app built breaks the contract (batch too large), or the AI
   *   service rejected it. */
  | "VALIDATION_ERROR"
  /** Passed through from the AI service's §5 codes. */
  | "MODEL_NOT_READY"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  /** The request never reached the service: refused connection, DNS, TLS. */
  | "AI_UNAVAILABLE"
  /** A `200` body that is not a forecast this app will store. */
  | "AI_INVALID_RESPONSE";

export type ForecastErrorDetail = {
  field: string;
  issue: string;
};

export function forecastOk<TBody>(body: TBody): NextResponse<TBody> {
  return NextResponse.json(body);
}

export function forecastError(
  code: ForecastErrorCode,
  message: string,
  status: number,
  details: ForecastErrorDetail[] | null = null,
  /** The AI service's own `request_id`, when it sent one (§5). */
  requestId?: string | null,
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
        request_id: requestId ?? newId(),
      },
    },
    { status },
  );
}

/**
 * `401` without an organizer session.
 *
 * `requireOrganizer()` redirects, which is right for a page and the wrong shape for
 * JSON, so this endpoint reads the same session and answers with a status code. The
 * wording is specific to this endpoint on purpose.
 */
export function unauthorized(): NextResponse {
  return forecastError(
    "UNAUTHORIZED",
    "Select an organization before refreshing a forecast.",
    401,
  );
}

/**
 * `404` for an event that is not this organizer's — the same answer as an id that
 * does not exist, so the endpoint cannot be used to discover other organizers' events.
 */
export function eventNotFound(): NextResponse {
  return forecastError(
    "NOT_FOUND",
    "That event does not exist for this organization.",
    404,
  );
}

/**
 * Turns an AI failure into the status the contract's §5 table prescribes.
 *
 * `MODEL_NOT_READY` → `503`, `TIMEOUT` → `504`, `INTERNAL_ERROR` → `500`,
 * `NOT_FOUND` → `404`, `RATE_LIMITED` → `429`, `VALIDATION_ERROR` → `422`, and an
 * unreachable service → `503` under its own code so the two "come back later" cases
 * are distinguishable in the dashboard's error copy.
 */
export function aiFailure(failure: AiFailure): NextResponse {
  return forecastError(failure.code, failure.message, failure.status, null, failure.requestId);
}