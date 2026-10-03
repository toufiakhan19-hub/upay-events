import "server-only";

import { resolve } from "node:path";

import { drizzle } from "drizzle-orm/better-sqlite3";

import { env } from "@/lib/env";

import { openSqliteConnection } from "./connection";
import * as schema from "./schema";

/**
 * SQLite connection and Drizzle instance. Server-only: importing this from a
 * Client Component will fail the build, which keeps database access out of the
 * browser bundle (API_CONTRACT.md §1.1 — the AI service is also server-side).
 *
 * The raw handle is created by `./connection`, which the seed script shares.
 */

export type Database_ = ReturnType<typeof drizzle<typeof schema>>;

/** `file:` is a libsql-style URL; better-sqlite3 wants a plain filesystem path. */
function resolveDatabasePath(databaseUrl: string): string {
  // turbopackIgnore: the path is intentionally configurable via DATABASE_URL,
  // so it cannot be statically scoped to a subfolder.
  return resolve(/* turbopackIgnore: true */ process.cwd(), databaseUrl.replace(/^file:/, ""));
}

/**
 * Cached on `globalThis` so Next.js hot reloads in development do not open a
 * new file handle on every recompile.
 */
const globalForDb = globalThis as unknown as { __upaySqlite?: ReturnType<typeof openSqliteConnection> };

const sqlite = globalForDb.__upaySqlite ?? openSqliteConnection(resolveDatabasePath(env.databaseUrl));

if (process.env.NODE_ENV !== "production") {
  globalForDb.__upaySqlite = sqlite;
}

export const db: Database_ = drizzle(sqlite, { schema });
export { schema };

/**
 * The transaction handle passed to a `db.transaction` callback. Exported so
 * multi-step writes (payment + registration + ticket) can share one helper
 * signature. `better-sqlite3` transactions are synchronous, so a callback must
 * use the `.run()` / `.all()` / `.get()` query methods and never `await`.
 */
export type DatabaseTransaction = Parameters<Parameters<Database_["transaction"]>[0]>[0];