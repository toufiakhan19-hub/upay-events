import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import type { ReminderStatus } from "@/db/enums";
import { events, payments, registrations, reminders } from "@/db/schema";

import type { ForecastEventSource, ForecastRegistrationSource } from "@/server/ai/features";

/**
 * Read model for `POST /api/organizer/events/[id]/forecast`.
 *
 * It exists to answer one question honestly: *what does the AI service get to see?*
 * The answer is "the paid registrations of one event this organizer owns", and every
 * query below is chosen to make that literally true.
 *
 * - **Ownership is part of the lookup, not a check afterwards.** The event query
 *   filters on `events.organizerId` as well as the id from the URL, so an event
 *   belonging to another organizer matches no row and is reported exactly like an id
 *   that does not exist (`null` → `404`). This is the same rule
 *   `getOrganizerEventDashboard` and `scanTicket` already use.
 * - **Only `paid` registrations are selected.** §4.4.1 asks for paid, non-cancelled
 *   rows; `pending_payment` attendees hold a seat but have not bought anything, so
 *   they are not forecast inputs. Cancelled rows are excluded by the same filter,
 *   which is why `is_cancelled` is always `false` downstream.
 * - **Nothing is joined that the AI service does not need.** Reminders and payment
 *   timestamps are read as feature values, never as rows. `users`, `tickets`, and
 *   every QR token are never queried here at all, so no PII can leak into a forecast
 *   request by accident (§1.1, §1.2).
 */

/** The `events` columns that become features or echoed request fields. */
const eventColumns = {
  id: events.id,
  category: events.category,
  locationType: events.locationType,
  dateTime: events.dateTime,
  capacity: events.capacity,
  priceTaka: events.priceTaka,
};

export type ForecastSource = {
  event: ForecastEventSource;
  /**
   * Paid registrations, oldest id first so two refreshes over unchanged data produce
   * the same request. Never cancelled, never awaiting payment.
   */
  registrations: ForecastRegistrationSource[];
};

/** One row of the `reminders` table, reduced to the three progress timestamps. */
type ReminderProgress = {
  sentAt: string | null;
  openedAt: string | null;
  confirmedAt: string | null;
};

/**
 * §4.3.1: the most advanced reminder state reached becomes `reminder_status`.
 *
 * The schema records progress as three timestamps, and this is the only definition of
 * which state wins, so the rule lives in the read model rather than being restated in
 * the feature mapper.
 */
function reminderStatusFrom(row: ReminderProgress): ReminderStatus {
  if (row.confirmedAt) {
    return "confirmed";
  }

  if (row.openedAt) {
    return "opened";
  }

  if (row.sentAt) {
    return "sent";
  }

  return "none";
}

const REMINDER_RANK: Record<ReminderStatus, number> = {
  none: 0,
  sent: 1,
  opened: 2,
  confirmed: 3,
};

/**
 * `reminders_registration_idx` is a plain index rather than a unique one, so a
 * registration could hold several reminder rows. The most advanced state wins, which
 * is the same answer a single row would give.
 */
function mostAdvancedReminderStatus(rows: ReminderProgress[]): ReminderStatus {
  return rows.reduce<ReminderStatus>((best, row) => {
    const status = reminderStatusFrom(row);

    return REMINDER_RANK[status] > REMINDER_RANK[best] ? status : best;
  }, "none");
}

/** Event plus its paid registrations, or `null` when this organizer does not own it. */
export async function readForecastSource(
  organizerId: string,
  eventId: string,
): Promise<ForecastSource | null> {
  const [event] = await db
    .select(eventColumns)
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.organizerId, organizerId)))
    .limit(1);

  if (!event) {
    return null;
  }

  const [paidRows, reminderRows] = await Promise.all([
    db
      .select({
        registrationId: registrations.id,
        createdAt: registrations.createdAt,
        daysBeforeEvent: registrations.daysBeforeEvent,
        // A free event still records a zero-value successful payment, so `paid_at` is
        // set for every paid registration. The join is a left join regardless: a
        // missing payment row must produce `payment_delay_hours: null` per §4.3.1,
        // not a crash.
        paidAt: payments.paidAt,
      })
      .from(registrations)
      .leftJoin(payments, eq(payments.registrationId, registrations.id))
      .where(and(eq(registrations.eventId, event.id), eq(registrations.status, "paid")))
      .orderBy(asc(registrations.id)),

    db
      .select({
        registrationId: reminders.registrationId,
        sentAt: reminders.sentAt,
        openedAt: reminders.openedAt,
        confirmedAt: reminders.confirmedAt,
      })
      .from(reminders)
      .where(
        inArray(
          reminders.registrationId,
          db
            .select({ id: registrations.id })
            .from(registrations)
            .where(
              and(eq(registrations.eventId, event.id), eq(registrations.status, "paid")),
            ),
        ),
      ),
  ]);

  const progressByRegistrationId = new Map<string, ReminderProgress[]>();

  for (const row of reminderRows) {
    const progress = progressByRegistrationId.get(row.registrationId);

    if (progress) {
      progress.push(row);
      continue;
    }

    progressByRegistrationId.set(row.registrationId, [row]);
  }

  return {
    event,
    registrations: paidRows.map((row) => ({
      registrationId: row.registrationId,
      createdAt: row.createdAt,
      daysBeforeEvent: row.daysBeforeEvent,
      paidAt: row.paidAt,
      // No reminder rows yet is the normal state in this phase, and `none` is the
      // honest feature value for it — not a fabricated "sent".
      reminderStatus: mostAdvancedReminderStatus(
        progressByRegistrationId.get(row.registrationId) ?? [],
      ),
    })),
  };
}