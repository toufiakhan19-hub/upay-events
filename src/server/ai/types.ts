import "server-only";

import type {
  ConfidenceLabel,
  EventCategory,
  LocationType,
  RecommendationActionType,
  ReminderStatus,
} from "@/db/enums";
import type { StoredRecommendation } from "@/db/schema";

/**
 * The application side of the AI boundary, typed.
 *
 * Every type here is a transcription of `docs/API_CONTRACT.md` and nothing else:
 * snake_case field names exactly as they go on the wire, because the AI service is
 * Python and does not know this file exists. The wire contract is frozen at v1.0
 * (§8), so changing a field name, type, or enum here is a contract change that
 * needs both owners' agreement — not an ordinary refactor.
 *
 * These are *request and response* types only. The database schema is never
 * referenced from an AI payload (API_CONTRACT.md §1.1): the mapping from rows to
 * features lives in `./features.ts` and is the only place the two vocabularies
 * meet.
 */

/**
 * The closed set of features for one registration (§4.3.1).
 *
 * `registration_id` and `event_id` are correlation keys — the service echoes them
 * so a prediction can be joined back to a row, and MUST NOT feed them to the model.
 * The remaining ten are the model features, matching PRD §9.2.
 *
 * Nothing here may be added "because it would help the model". New features are a
 * contract change, and the fields §1.2 prohibits (name, phone, wallet balance,
 * transaction history, location history, credit or income inferences) are not
 * available under any circumstances.
 */
export type AttendanceInput = {
  registration_id: string;
  event_id: string;
  event_category: EventCategory;
  ticket_price_taka: number;
  days_before_event_registered: number;
  /** `null` when the payment has not succeeded; never the same as `0.0`. */
  payment_delay_hours: number | null;
  event_day_of_week: number;
  event_start_hour: number;
  location_type: LocationType;
  reminder_status: ReminderStatus;
  /** Synthetic historical count only — see `./features.ts` for why this is `0`. */
  prior_attendance_count: number;
  is_cancelled: boolean;
};

/** `POST /predict/forecast` request body (§4.4.1). One batch per event. */
export type ForecastRequest = {
  event_id: string;
  event_capacity: number;
  /** ISO 8601 with explicit offset, e.g. `2026-03-14T09:00:00+06:00`. */
  event_date_time: string;
  /** ISO 8601 UTC, always sent so the response is deterministic (§4.3.1). */
  as_of: string;
  /** Paid, non-cancelled registrations only. Empty is valid and not an error. */
  registrations: AttendanceInput[];
};

/**
 * `POST /predict/forecast` response body (§4.4.1).
 *
 * A validated instance of this is what gets persisted: the app stores the numbers
 * the AI service produced and never recomputes them (§2.3).
 */
export type ForecastOutput = {
  event_id: string;
  model_version: string;
  generated_at: string;
  as_of: string;
  synthetic_data_only: true;
  event_capacity: number;
  paid_registrations: number;
  predicted_attendance: number;
  predicted_no_shows: number;
  no_show_rate: number;
  recommended_waitlist: number;
  confidence: number;
  confidence_label: ConfidenceLabel;
  top_reasons: string[];
  recommendation: {
    action_type: RecommendationActionType;
    headline: string;
    detail: string;
    rationale: string;
    suggested_send_at: string | null;
    catering_headcount: number | null;
  };
};

/**
 * Persisted form of the recommendation. Structurally the same object as
 * `ForecastOutput["recommendation"]`; the alias exists because `event_forecasts`
 * stores it as JSON and the schema declares its own name for that shape.
 */
export type ForecastRecommendation = StoredRecommendation;

/** Error envelope codes the AI service may return (§5). */
export const AI_SERVICE_ERROR_CODES = [
  "VALIDATION_ERROR",
  "MODEL_NOT_READY",
  "TIMEOUT",
  "INTERNAL_ERROR",
  "NOT_FOUND",
  "RATE_LIMITED",
] as const;

export type AiServiceErrorCode = (typeof AI_SERVICE_ERROR_CODES)[number];

/**
 * Why a forecast call did not produce a forecast.
 *
 * The code is the AI service's own when it answered with an error envelope, and an
 * app-side transport code (`AI_UNAVAILABLE`) when the request never completed.
 * `status` is the HTTP status this application's route should answer with, decided
 * from the §5 table, so the mapping lives with the failure instead of being
 * re-derived in the route.
 *
 * `message` is written for an organizer: no stack traces, no exception names, no
 * filesystem paths, no configuration values. `requestId` is the AI service's own
 * ULID when it supplied one, kept for logs and bug reports (§5) — it is a handle,
 * not a secret.
 */
export type AiFailure = {
  code: AiServiceErrorCode | "AI_UNAVAILABLE";
  status: number;
  message: string;
  requestId: string | null;
};