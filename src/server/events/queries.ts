import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { events, organizers } from "@/db/schema";
import type { EventCategory, LocationType } from "@/db/enums";

/**
 * Read model for the attendee-facing event pages.
 *
 * Only published events are ever returned here, so draft, completed, and
 * cancelled events cannot leak into discovery or a direct link. Rows are
 * returned as plain serializable objects — no Drizzle table objects cross into
 * a Client Component.
 */

export type EventListItem = {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  venue: string;
  locationType: LocationType;
  dateTime: string;
  capacity: number;
  priceTaka: number;
  organizerName: string;
};

export type EventDetail = EventListItem;

const eventColumns = {
  id: events.id,
  slug: events.slug,
  title: events.title,
  category: events.category,
  venue: events.venue,
  locationType: events.locationType,
  dateTime: events.dateTime,
  capacity: events.capacity,
  priceTaka: events.priceTaka,
  organizerName: organizers.organizationName,
};

/** Discovery list: published events, soonest first. */
export async function listPublishedEvents(): Promise<EventListItem[]> {
  return db
    .select(eventColumns)
    .from(events)
    .innerJoin(organizers, eq(events.organizerId, organizers.id))
    .where(eq(events.status, "published"))
    .orderBy(asc(events.dateTime), asc(events.title));
}

/** Detail lookup by slug. `null` covers both "no such event" and "unpublished". */
export async function getPublishedEventBySlug(slug: string): Promise<EventDetail | null> {
  const [event] = await db
    .select(eventColumns)
    .from(events)
    .innerJoin(organizers, eq(events.organizerId, organizers.id))
    .where(and(eq(events.slug, slug), eq(events.status, "published")))
    .limit(1);

  return event ?? null;
}