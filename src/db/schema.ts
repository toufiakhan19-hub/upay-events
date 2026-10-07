import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import {
  CHECK_IN_RESULTS,
  CONFIDENCE_LABELS,
  EVENT_CATEGORIES,
  EVENT_STATUSES,
  LOCATION_TYPES,
  NO_SHOW_RISKS,
  ORGANIZER_ACTION_TYPES,
  PAYMENT_STATUSES,
  RECOMMENDATION_ACTION_TYPES,
  REGISTRATION_STATUSES,
  TICKET_STATUSES,
} from "./enums";

/**
 * Storage conventions (Postgres on Supabase):
 *
 * - Primary keys are ULID strings (`text`), not auto-increment integers, so
 *   they are not enumerable by an attacker.
 * - Timestamps are ISO 8601 UTC strings with second precision, `Z` suffix,
 *   stored as `text` so ordering and comparison stay plain string operations.
 * - Money is an integer count of Bangladeshi Taka. Never a float.
 * - Structured values are `jsonb`.
 * - Row-level security is enabled on every table with no policies. The app
 *   connects as the database owner, which bypasses RLS; Supabase's public Data
 *   API (anon / authenticated roles) therefore cannot read or write any row.
 *
 * This file is server-only data. It is never sent to the AI service — the app
 * maps rows into the request shapes defined in `docs/API_CONTRACT.md` §4.3.1
 * and §4.4.1, and exposes no table or column names over the wire.
 */

/** Fresh builder per call: drizzle column builders are stateful. */
const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`);

/** Shape of `event_forecasts.recommendation`, mirroring API_CONTRACT.md §4.4.1. */
export type StoredRecommendation = {
  action_type: (typeof RECOMMENDATION_ACTION_TYPES)[number];
  headline: string;
  detail: string;
  rationale: string;
  suggested_send_at: string | null;
  catering_headcount: number | null;
};

/* -------------------------------------------------------------------------- */
/* Identity                                                                   */
/* -------------------------------------------------------------------------- */

/** PRD §12. Deliberately minimal: name, phone, optional interests (PRD §7). */
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    interests: jsonb("interests").$type<string[]>().notNull().default([]),
    /**
     * Opaque reference to the mock upay account. Never a real wallet, balance,
     * or transaction identifier (PRD §14). Not exposed to the AI service.
     */
    upayAccountReference: text("upay_account_reference"),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("users_phone_unique").on(table.phone)],
).enableRLS();

/** PRD §12. Session storage for the mock "Continue with upay" login. */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
).enableRLS();

/** PRD §12. */
export const organizers = pgTable("organizers", {
  id: text("id").primaryKey(),
  organizationName: text("organization_name").notNull(),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  createdAt: createdAt(),
}).enableRLS();

/** PRD §12. `locationType` is an AI feature (API_CONTRACT.md §4.3.1). */
export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    organizerId: text("organizer_id")
      .notNull()
      .references(() => organizers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    category: text("category", { enum: EVENT_CATEGORIES }).notNull(),
    venue: text("venue").notNull(),
    locationType: text("location_type", { enum: LOCATION_TYPES }).notNull(),
    /** ISO 8601 with explicit offset; Bangladesh local time is `+06:00`. */
    dateTime: text("date_time").notNull(),
    capacity: integer("capacity").notNull(),
    priceTaka: integer("price_taka").notNull().default(0),
    status: text("status", { enum: EVENT_STATUSES }).notNull().default("draft"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("events_slug_unique").on(table.slug),
    index("events_organizer_idx").on(table.organizerId),
  ],
).enableRLS();

/* -------------------------------------------------------------------------- */
/* Registration and payment                                                   */
/* -------------------------------------------------------------------------- */

/** PRD §12. */
export const registrations = pgTable(
  "registrations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    status: text("status", { enum: REGISTRATION_STATUSES })
      .notNull()
      .default("pending_payment"),
    /** Days between registration and the event; an AI feature (contract §4.3.1). */
    daysBeforeEvent: integer("days_before_event"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("registrations_user_event_unique").on(table.userId, table.eventId),
    index("registrations_event_status_idx").on(table.eventId, table.status),
  ],
).enableRLS();

/**
 * PRD §12. A ticket is issued only when a payment reaches `success` (PRD §7),
 * which the unique index on `registrationId` helps enforce.
 */
export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    registrationId: text("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    amountTaka: integer("amount_taka").notNull(),
    status: text("status", { enum: PAYMENT_STATUSES }).notNull().default("pending"),
    /** Simulated identifier from the mock upay adapter (PRD §7). */
    mockTransactionId: text("mock_transaction_id"),
    createdAt: createdAt(),
    paidAt: text("paid_at"),
  },
  (table) => [
    uniqueIndex("payments_registration_unique").on(table.registrationId),
    uniqueIndex("payments_mock_transaction_unique").on(table.mockTransactionId),
  ],
).enableRLS();

/* -------------------------------------------------------------------------- */
/* Tickets and check-in                                                       */
/* -------------------------------------------------------------------------- */

/**
 * PRD §12. `qrToken` carries no name, phone, or payment data (PRD §14) — it is
 * an opaque random value, optionally HMAC-signed when the ticket service is
 * implemented.
 */
export const tickets = pgTable(
  "tickets",
  {
    id: text("id").primaryKey(),
    registrationId: text("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    qrToken: text("qr_token").notNull(),
    status: text("status", { enum: TICKET_STATUSES }).notNull().default("valid"),
    issuedAt: createdAt(),
    checkedInAt: text("checked_in_at"),
  },
  (table) => [
    uniqueIndex("tickets_registration_unique").on(table.registrationId),
    uniqueIndex("tickets_qr_token_unique").on(table.qrToken),
  ],
).enableRLS();

/** PRD §14: every ticket scan is logged, including rejected duplicate scans. */
export const checkIns = pgTable(
  "check_ins",
  {
    id: text("id").primaryKey(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    scannedBy: text("scanned_by"),
    result: text("result", { enum: CHECK_IN_RESULTS }).notNull(),
    scannedAt: createdAt(),
  },
  (table) => [index("check_ins_ticket_idx").on(table.ticketId)],
).enableRLS();

/* -------------------------------------------------------------------------- */
/* Reminders                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * PRD §12. The most advanced reminder state reached becomes the
 * `reminder_status` AI feature (API_CONTRACT.md §4.3.1).
 */
export const reminders = pgTable(
  "reminders",
  {
    id: text("id").primaryKey(),
    registrationId: text("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    sentAt: text("sent_at"),
    openedAt: text("opened_at"),
    confirmedAt: text("confirmed_at"),
  },
  (table) => [index("reminders_registration_idx").on(table.registrationId)],
).enableRLS();

/* -------------------------------------------------------------------------- */
/* AI output, persisted by the app                                            */
/* -------------------------------------------------------------------------- */

/**
 * PRD §12. Cached output of `POST /predict/attendance`, keyed by registration.
 * The dashboard reads this table and never calls the AI service during a render
 * (API_CONTRACT.md §7.1).
 */
export const predictions = pgTable(
  "predictions",
  {
    id: text("id").primaryKey(),
    registrationId: text("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    attendanceProbability: doublePrecision("attendance_probability").notNull(),
    noShowRisk: text("no_show_risk", { enum: NO_SHOW_RISKS }).notNull(),
    topReasons: jsonb("top_reasons").$type<string[]>().notNull().default([]),
    modelVersion: text("model_version").notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("predictions_registration_idx").on(table.registrationId)],
).enableRLS();

/**
 * PRD §12. Cached output of `POST /predict/forecast`. `isStale` is
 * application-owned state: the AI service never returns it
 * (API_CONTRACT.md §7.3).
 */
export const eventForecasts = pgTable(
  "event_forecasts",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    paidRegistrations: integer("paid_registrations").notNull(),
    predictedAttendance: doublePrecision("predicted_attendance").notNull(),
    predictedNoShows: integer("predicted_no_shows").notNull(),
    noShowRate: doublePrecision("no_show_rate").notNull(),
    recommendedWaitlist: integer("recommended_waitlist").notNull(),
    confidence: doublePrecision("confidence").notNull(),
    confidenceLabel: text("confidence_label", { enum: CONFIDENCE_LABELS }).notNull(),
    topReasons: jsonb("top_reasons").$type<string[]>().notNull().default([]),
    recommendation: jsonb("recommendation").$type<StoredRecommendation>().notNull(),
    modelVersion: text("model_version").notNull(),
    isStale: boolean("is_stale").notNull().default(false),
    createdAt: createdAt(),
  },
  (table) => [index("event_forecasts_event_idx").on(table.eventId, table.createdAt)],
).enableRLS();

/**
 * Organizer decisions taken from a recommendation. Recorded so the
 * recommended-action acceptance rate (PRD §13) can be reported later.
 */
export const organizerActions = pgTable(
  "organizer_actions",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    actionType: text("action_type", { enum: ORGANIZER_ACTION_TYPES }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [index("organizer_actions_event_idx").on(table.eventId)],
).enableRLS();

/* -------------------------------------------------------------------------- */
/* Relations (Drizzle relational query API)                                   */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ many }) => ({
  registrations: many(registrations),
  sessions: many(sessions),
}));

export const organizersRelations = relations(organizers, ({ many }) => ({
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organizer: one(organizers, {
    fields: [events.organizerId],
    references: [organizers.id],
  }),
  registrations: many(registrations),
  forecasts: many(eventForecasts),
  organizerActions: many(organizerActions),
}));

export const registrationsRelations = relations(
  registrations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [registrations.userId],
      references: [users.id],
    }),
    event: one(events, {
      fields: [registrations.eventId],
      references: [events.id],
    }),
    payments: many(payments),
    tickets: many(tickets),
    reminders: many(reminders),
    predictions: many(predictions),
  }),
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  registration: one(registrations, {
    fields: [payments.registrationId],
    references: [registrations.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  registration: one(registrations, {
    fields: [tickets.registrationId],
    references: [registrations.id],
  }),
  checkIns: many(checkIns),
}));

export const checkInsRelations = relations(checkIns, ({ one }) => ({
  ticket: one(tickets, {
    fields: [checkIns.ticketId],
    references: [tickets.id],
  }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  registration: one(registrations, {
    fields: [reminders.registrationId],
    references: [registrations.id],
  }),
}));

export const predictionsRelations = relations(predictions, ({ one }) => ({
  registration: one(registrations, {
    fields: [predictions.registrationId],
    references: [registrations.id],
  }),
}));

export const eventForecastsRelations = relations(eventForecasts, ({ one }) => ({
  event: one(events, {
    fields: [eventForecasts.eventId],
    references: [events.id],
  }),
}));

export const organizerActionsRelations = relations(
  organizerActions,
  ({ one }) => ({
    event: one(events, {
      fields: [organizerActions.eventId],
      references: [events.id],
    }),
  }),
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));