import "server-only";

import { env } from "@/lib/env";

import { AI_SERVICE_ERROR_CODES, type AiFailure, type AiServiceErrorCode, type ForecastRequest } from "./types";

/**
 * The HTTP client for the AI service — the only module in the app that opens a
 * connection to it.
 *
 * Calling discipline is fixed by `docs/API_CONTRACT.md` §7.1 and is enforced here
 * rather than left to callers:
 *
 * - **One request per event**, already batched by `./features.ts`.
 * - **3000 ms hard budget, one retry.** The retry exists because §5 tells the client
 *   to retry `TIMEOUT` and `MODEL_NOT_READY` once before falling back to the cached
 *   forecast; it is not a general retry loop, and a `4xx` is never retried because
 *   resending an unchanged payload cannot fix a validation error.
 * - **Server-to-server only.** No CORS, no browser access (§2). The base URL comes
 *   from `AI_SERVICE_URL` so the teammate's service can move without a code change.
 * - **No fabrication.** Every failure path returns an `AiFailure`; nothing here
 *   invents a forecast, a probability, or a partial response.
 */

/** §7.1 and §3: inference must answer inside 3000 ms. */
export const AI_TIMEOUT_MS = 3_000;

/** §3: both sides cap a batch at 2000 rows. */
export const AI_MAX_REGISTRATIONS = 2_000;

/** §2: JSON over the wire, charset stated explicitly. */
const JSON_CONTENT_TYPE = "application/json; charset=utf-8";

/** §3: the one forecast path this milestone calls. */
const FORECAST_PATH = "/predict/forecast";

export type ForecastCallResult =
  | { ok: true; body: unknown }
  | { ok: false; failure: AiFailure };

type AttemptResult = ForecastCallResult;

/** Failure text an organizer can read. No internals, ever. */
const FAILURE_MESSAGES: Record<AiFailure["code"], string> = {
  VALIDATION_ERROR:
    "The AI service rejected the forecast request as invalid. Nothing was saved.",
  MODEL_NOT_READY:
    "The AI model is not ready yet, so no forecast was generated. Nothing was saved.",
  TIMEOUT: "The AI service did not answer in time. Nothing was saved.",
  INTERNAL_ERROR: "The AI service reported an internal error. Nothing was saved.",
  NOT_FOUND: "The AI service has no forecast endpoint at the configured URL.",
  RATE_LIMITED: "The AI service is busy. Wait a moment and refresh again.",
  AI_UNAVAILABLE:
    "Could not reach the AI service. Nothing was saved and the last cached forecast is untouched.",
};

/** §5: the status the application answers with for each service error code. */
const FAILURE_STATUSES: Record<AiFailure["code"], number> = {
  VALIDATION_ERROR: 422,
  MODEL_NOT_READY: 503,
  TIMEOUT: 504,
  INTERNAL_ERROR: 500,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  AI_UNAVAILABLE: 503,
};

/**
 * Transient failures get one more attempt. A refused connection and a warm-up are
 * both worth a second try; a rejected payload and an unknown route are not.
 */
const RETRYABLE_CODES = new Set<AiFailure["code"]>(["TIMEOUT", "MODEL_NOT_READY", "AI_UNAVAILABLE"]);

function isAiServiceErrorCode(value: unknown): value is AiServiceErrorCode {
  return (
    typeof value === "string" &&
    (AI_SERVICE_ERROR_CODES as readonly string[]).includes(value)
  );
}

function failure(code: AiFailure["code"], requestId: string | null): AiFailure {
  return {
    code,
    status: FAILURE_STATUSES[code],
    message: FAILURE_MESSAGES[code],
    requestId,
  };
}

/**
 * `error.request_id` from the §5 envelope, when the body is one.
 *
 * Reading it defensively matters: a proxy, a crash, or a different framework can put
 * something else on the wire, and the app must not throw while handling an error.
 */
function readRequestId(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const error = (payload as { error?: unknown }).error;

  if (typeof error !== "object" || error === null) {
    return null;
  }

  const requestId = (error as { request_id?: unknown }).request_id;

  return typeof requestId === "string" && requestId.length > 0 ? requestId : null;
}

/**
 * A non-2xx response, classified.
 *
 * The status code is authoritative and the envelope code is a cross-check: an error
 * status without a parseable envelope still becomes a typed failure rather than an
 * exception, so a crashed service cannot take the dashboard down with it.
 */
function classifyErrorResponse(status: number, payload: unknown): AiFailure {
  const code = readCodeFromEnvelope(payload);
  const fallback = statusToCode(status);
  const requestId = readRequestId(payload);

  return failure(code ?? fallback, requestId);
}

function readCodeFromEnvelope(payload: unknown): AiFailure["code"] | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const error = (payload as { error?: unknown }).error;

  if (typeof error !== "object" || error === null) {
    return null;
  }

  const code = (error as { code?: unknown }).code;

  return isAiServiceErrorCode(code) ? code : null;
}

/** §5 statuses mapped to codes, for responses that do not carry the envelope. */
function statusToCode(status: number): AiFailure["code"] {
  switch (status) {
    case 422:
      return "VALIDATION_ERROR";
    case 503:
      return "MODEL_NOT_READY";
    case 504:
      return "TIMEOUT";
    case 429:
      return "RATE_LIMITED";
    case 404:
      return "NOT_FOUND";
    default:
      return "INTERNAL_ERROR";
  }
}

async function attempt(request: ForecastRequest): Promise<AttemptResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(`${env.aiServiceUrl}${FORECAST_PATH}`, {
      method: "POST",
      headers: { "Content-Type": JSON_CONTENT_TYPE, Accept: JSON_CONTENT_TYPE },
      body: JSON.stringify(request),
      signal: controller.signal,
      // The response is unique per call; never let a cache answer a forecast.
      cache: "no-store",
    });
  } catch {
    // `controller.aborted` distinguishes our 3000 ms budget from a refused
    // connection, a DNS failure, or a TLS problem. The underlying error is
    // deliberately not inspected or forwarded: its message can contain a host,
    // port, or stack path, none of which belong in an API response.
    return controller.signal.aborted
      ? { ok: false, failure: failure("TIMEOUT", null) }
      : { ok: false, failure: failure("AI_UNAVAILABLE", null) };
  } finally {
    clearTimeout(timer);
  }

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    // A non-JSON body is not a forecast. For a success status it is handed on as
    // `null` and rejected by the validator; for an error status it simply means
    // there is no envelope to read.
    payload = null;
  }

  if (!response.ok) {
    return { ok: false, failure: classifyErrorResponse(response.status, payload) };
  }

  return { ok: true, body: payload };
}

/**
 * Asks the AI service for one event's forecast.
 *
 * `200` is not treated as success: the body is returned unparsed and
 * `./validate.ts` decides whether it is a forecast the app is willing to persist.
 * Nothing here writes to the database, so a malformed body cannot corrupt the
 * cached forecast the dashboard is showing.
 */
export async function requestForecast(request: ForecastRequest): Promise<ForecastCallResult> {
  const first = await attempt(request);

  if (!first.ok && RETRYABLE_CODES.has(first.failure.code)) {
    const second = await attempt(request);

    if (!second.ok) {
      logFailure(second.failure, request.event_id);
    }

    return second;
  }

  if (!first.ok) {
    logFailure(first.failure, request.event_id);
  }

  return first;
}

/**
 * Server-side breadcrumb for a failed refresh.
 *
 * Only the classification, the AI service's `request_id`, and the event id — never
 * the request or response body, which contain features and correlation keys. This
 * is the line an organizer quotes in a bug report.
 */
function logFailure(failureValue: AiFailure, eventId: string): void {
  console.warn("[ai] forecast refresh failed", {
    code: failureValue.code,
    requestId: failureValue.requestId,
    eventId,
  });
}