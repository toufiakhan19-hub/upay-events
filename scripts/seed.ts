/**
 * Development seed data: three-plus realistic student events for a Bangladesh
 * university audience (PRD §10 — "Browse at least three seeded events").
 *
 * Run with `npm run db:seed`. Safe to run repeatedly:
 * - organizers are looked up by `organization_name`,
 * - events are upserted on the `events_slug_unique` index,
 * so a second run updates the demo rows instead of duplicating them.
 *
 * Only organizers and events are seeded. No fake attendees, registrations,
 * payments, or tickets: those flows are not implemented yet, and inventing
 * payment history here would misrepresent the mock upay adapter. Users are
 * created by actually logging in.
 *
 * This file runs in plain Node (via `tsx`), not inside Next.js, so it opens its
 * own Postgres connection through `src/db/connection.ts` instead of the
 * `server-only` app client.
 */

import "dotenv/config";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";

import { openPostgresConnection } from "../src/db/connection";
import { events, organizers } from "../src/db/schema";
import type { EventCategory, LocationType } from "../src/db/enums";
import { newId } from "../src/lib/ids";

type OrganizerSeed = {
  key: string;
  organizationName: string;
  contactName: string;
  contactPhone: string;
};

type EventSeed = {
  organizerKey: string;
  title: string;
  slug: string;
  category: EventCategory;
  venue: string;
  locationType: LocationType;
  /** ISO 8601 with explicit offset; Bangladesh local time is `+06:00`. */
  dateTime: string;
  capacity: number;
  priceTaka: number;
};

/** Obvious placeholder contact numbers — no real person is described here. */
const ORGANIZERS: OrganizerSeed[] = [
  {
    key: "diu-cse",
    organizationName: "Daffodil International University — CSE Society",
    contactName: "CSE Society Coordinator",
    contactPhone: "01700000001",
  },
  {
    key: "diu-cultural",
    organizationName: "Daffodil International University — Cultural Club",
    contactName: "Cultural Club Coordinator",
    contactPhone: "01700000002",
  },
  {
    key: "basis-student",
    organizationName: "BASIS Student Wing — Dhaka",
    contactName: "BASIS Student Wing Coordinator",
    contactPhone: "01700000003",
  },
];

const EVENTS: EventSeed[] = [
  {
    organizerKey: "diu-cse",
    title: "DIU AI Hackathon 2026",
    slug: "diu-ai-hackathon-2026",
    category: "hackathon",
    venue: "DIU Campus, Bashundhara R/A, Dhaka",
    locationType: "campus",
    dateTime: "2026-11-13T10:00:00+06:00",
    capacity: 500,
    priceTaka: 300,
  },
  {
    organizerKey: "diu-cse",
    title: "Flutter App Development Workshop",
    slug: "flutter-app-development-workshop",
    category: "workshop",
    venue: "DIU Campus Auditorium, Bashundhara R/A, Dhaka",
    locationType: "campus",
    dateTime: "2026-11-27T15:00:00+06:00",
    capacity: 80,
    priceTaka: 100,
  },
  {
    organizerKey: "basis-student",
    title: "Dhaka Tech Career Fair 2026",
    slug: "dhaka-tech-career-fair-2026",
    category: "career_fair",
    venue: "Bangladesh-China Friendship Exhibition Center, Dhaka",
    locationType: "city",
    dateTime: "2026-12-12T10:00:00+06:00",
    capacity: 1200,
    priceTaka: 0,
  },
  {
    organizerKey: "diu-cultural",
    title: "Pohela Boishakh Cultural Night",
    slug: "pohela-boishakh-cultural-night",
    category: "cultural",
    venue: "DIU Campus Open Ground, Bashundhara R/A, Dhaka",
    locationType: "campus",
    dateTime: "2027-04-14T17:00:00+06:00",
    capacity: 600,
    priceTaka: 250,
  },
];

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Missing DATABASE_URL. Copy .env.example to .env and set your Supabase connection string.");
  process.exit(1);
}

const client = openPostgresConnection(databaseUrl, { max: 1 });

function openDatabase() {
  return drizzle(client);
}

async function ensureOrganizer(
  db: ReturnType<typeof openDatabase>,
  seed: OrganizerSeed,
): Promise<string> {
  const [existing] = await db
    .select({ id: organizers.id })
    .from(organizers)
    .where(eq(organizers.organizationName, seed.organizationName))
    .limit(1);

  if (existing) {
    return existing.id;
  }

  const id = newId();

  await db.insert(organizers).values({
    id,
    organizationName: seed.organizationName,
    contactName: seed.contactName,
    contactPhone: seed.contactPhone,
  });

  return id;
}

async function seed() {
  const db = openDatabase();
  const organizerIds = new Map<string, string>();

  for (const organizer of ORGANIZERS) {
    organizerIds.set(organizer.key, await ensureOrganizer(db, organizer));
  }

  for (const event of EVENTS) {
    const organizerId = organizerIds.get(event.organizerKey);

    if (!organizerId) {
      throw new Error(`Seed event "${event.slug}" references unknown organizer "${event.organizerKey}".`);
    }

    // Upsert on the slug index: re-running refreshes the demo copy of the event
    // and never creates a second row for the same slug.
    await db
      .insert(events)
      .values({
        id: newId(),
        organizerId,
        title: event.title,
        slug: event.slug,
        category: event.category,
        venue: event.venue,
        locationType: event.locationType,
        dateTime: event.dateTime,
        capacity: event.capacity,
        priceTaka: event.priceTaka,
        status: "published",
      })
      .onConflictDoUpdate({
        target: events.slug,
        set: {
          organizerId,
          title: event.title,
          category: event.category,
          venue: event.venue,
          locationType: event.locationType,
          dateTime: event.dateTime,
          capacity: event.capacity,
          priceTaka: event.priceTaka,
          status: "published",
        },
      });
  }

  const seededEvents = await db
    .select({ slug: events.slug, title: events.title, priceTaka: events.priceTaka })
    .from(events)
    .orderBy(events.dateTime);

  console.log(`Seeded ${ORGANIZERS.length} organizers and ${EVENTS.length} events.`);
  console.log(`Events table now holds ${seededEvents.length} row(s):`);

  for (const event of seededEvents) {
    console.log(`  - ${event.slug}  (${event.priceTaka === 0 ? "free" : `${event.priceTaka} Taka`})`);
  }
}

seed()
  .then(async () => {
    await client.end();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error("Seed failed.");

    const message = error instanceof Error ? `${error.message} ${String(error.cause ?? "")}` : "";

    if (/does not exist/i.test(message)) {
      console.error("The schema is missing. Run `npm run db:migrate` first.");
    }

    console.error(error);
    await client.end({ timeout: 1 });
    process.exit(1);
  });