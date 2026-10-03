/**
 * Enum values for the database schema.
 *
 * Two groups:
 *
 * 1. "Contract-aligned" — these values are also defined by the AI service in
 *    `docs/API_CONTRACT.md`. They MUST stay byte-identical to that document.
 *    Changing one is a contract change requiring sign-off from both owners
 *    (see API_CONTRACT.md §8), not an ordinary app edit.
 *
 * 2. "Application-only" — internal to the UpayEvents app. The AI service never
 *    sees these values.
 */

/* -------------------------------------------------------------------------- */
/* Contract-aligned (docs/API_CONTRACT.md)                                    */
/* -------------------------------------------------------------------------- */

/** API_CONTRACT.md §4.3.1 */
export const EVENT_CATEGORIES = [
  "hackathon",
  "workshop",
  "cultural",
  "career_fair",
  "conference",
  "sports",
  "other",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

/** API_CONTRACT.md §4.3.1 */
export const LOCATION_TYPES = ["campus", "city", "online"] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

/** API_CONTRACT.md §4.3.1 */
export const REMINDER_STATUSES = ["none", "sent", "opened", "confirmed"] as const;
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

/** API_CONTRACT.md §4.3.1, thresholds in §2.3 */
export const NO_SHOW_RISKS = ["low", "medium", "high"] as const;
export type NoShowRisk = (typeof NO_SHOW_RISKS)[number];

/** API_CONTRACT.md §4.4.1 */
export const CONFIDENCE_LABELS = ["low", "medium", "high"] as const;
export type ConfidenceLabel = (typeof CONFIDENCE_LABELS)[number];

/** API_CONTRACT.md §4.4.1 `recommendation.action_type` */
export const RECOMMENDATION_ACTION_TYPES = [
  "open_waitlist",
  "send_reminder",
  "adjust_catering",
  "target_segment",
  "increase_capacity",
  "no_action",
] as const;
export type RecommendationActionType = (typeof RECOMMENDATION_ACTION_TYPES)[number];

/* -------------------------------------------------------------------------- */
/* Application-only                                                           */
/* -------------------------------------------------------------------------- */

/**
 * `paid` is the only status sent to the AI service as a forecast input.
 * `cancelled` rows are excluded from all totals (API_CONTRACT.md §4.4.1).
 */
export const REGISTRATION_STATUSES = [
  "pending_payment",
  "paid",
  "cancelled",
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const PAYMENT_STATUSES = ["pending", "success", "failed"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** PRD §7: ticket status is valid, checked in, or invalid. */
export const TICKET_STATUSES = ["valid", "checked_in", "invalid"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** PRD §10: check-in must report valid, already used, or invalid. */
export const CHECK_IN_RESULTS = ["checked_in", "already_used", "invalid_ticket"] as const;
export type CheckInResult = (typeof CHECK_IN_RESULTS)[number];

export const EVENT_STATUSES = ["draft", "published", "completed", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/**
 * Actions an organizer can take from the dashboard. Recorded so the
 * recommended-action acceptance rate (PRD §13) can be measured later.
 */
export const ORGANIZER_ACTION_TYPES = ["reminder_sent", "waitlist_opened"] as const;
export type OrganizerActionType = (typeof ORGANIZER_ACTION_TYPES)[number];