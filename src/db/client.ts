import "server-only";

import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { env } from "@/lib/env";

import * as schema from "./schema";

/**
 * SQLite connection and Drizzle instance. Server-only: importing this from a
 * Client Component will fail the build, which keeps database access out of the
 * browser bundle (API_CONTRACT.md §1.1 — the AI service is also server-side).
 */

export type Database_ = ReturnType<typeof drizzle<typeof schema>>;

/** `file:` is a libsql-style URL; better-sqlite3 wants a plain filesystem path. */
function resolveDatabasePath(databaseUrl: string): string {
  // turbopackIgnore: the path is intentionally configurable via DATABASE_URL,
  // so it cannot be statically scoped to a subfolder.
  return resolve(/* turbopackIgnore: true */ process.cwd(), databaseUrl.replace(/^file:/, ""));
}

function createConnection(): Database.Database {
  const path = resolveDatabasePath(env.databaseUrl);

  mkdirSync(dirname(path), { recursive: true });

  const sqlite = new Database(path);

  // Required for the cascade deletes declared in the schema to actually fire.
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("journal_mode = WAL");

  return sqlite;
}

/**
 * Cached on `globalThis` so Next.js hot reloads in development do not open a
 * new file handle on every recompile.
 */
const globalForDb = globalThis as unknown as { __upaySqlite?: Database.Database };

const sqlite = globalForDb.__upaySqlite ?? createConnection();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__upaySqlite = sqlite;
}

export const db: Database_ = drizzle(sqlite, { schema });
export { schema };