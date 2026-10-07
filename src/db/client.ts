import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";

import { env } from "@/lib/env";

import { openPostgresConnection } from "./connection";
import * as schema from "./schema";

/**
 * Postgres (Supabase) connection and Drizzle instance. Server-only: importing
 * this from a Client Component will fail the build, which keeps database access
 * out of the browser bundle (API_CONTRACT.md §1.1 — the AI service is also
 * server-side).
 *
 * The raw client is created by `./connection`, which the seed script shares.
 */

export type Database_ = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Cached on `globalThis` so Next.js hot reloads in development do not open a
 * new connection pool on every recompile.
 */
const globalForDb = globalThis as unknown as {
  __upayPostgres?: ReturnType<typeof openPostgresConnection>;
};

const client = globalForDb.__upayPostgres ?? openPostgresConnection(env.databaseUrl);

if (process.env.NODE_ENV !== "production") {
  globalForDb.__upayPostgres = client;
}

export const db: Database_ = drizzle(client, { schema });
export { schema };

/**
 * The transaction handle passed to a `db.transaction` callback. Exported so
 * multi-step writes (payment + registration + ticket) can share one helper
 * signature.
 */
export type DatabaseTransaction = Parameters<Parameters<Database_["transaction"]>[0]>[0];
