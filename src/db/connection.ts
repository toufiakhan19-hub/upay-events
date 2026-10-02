import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import Database from "better-sqlite3";

/**
 * better-sqlite3 connection factory shared by the Next.js runtime
 * (`src/db/client.ts`) and the standalone seed script (`scripts/seed.ts`).
 *
 * Deliberately not marked `server-only`: the `server-only` package throws when
 * loaded outside a React Server Component graph, and the seed script runs in
 * plain Node. Only `client.ts` — the module the app itself imports — carries the
 * marker, so the app bundle still cannot open a database handle from the
 * browser.
 */

export function openSqliteConnection(databasePath: string): Database.Database {
  mkdirSync(dirname(databasePath), { recursive: true });

  const sqlite = new Database(databasePath);

  // Required for the cascade deletes declared in the schema to actually fire.
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("journal_mode = WAL");

  return sqlite;
}