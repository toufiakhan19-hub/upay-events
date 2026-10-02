import "server-only";

/**
 * Server-only environment access.
 *
 * Values are read from `.env` (git-ignored) with `.env.example` as the
 * committed template. Nothing secret is hard-coded here or anywhere else in
 * `src/`; the MVP only needs a database path and, later, the AI service URL.
 */

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env and fill it in.`,
    );
  }

  return value;
}

export const env = {
  /** SQLite location, e.g. `file:./data/upay-events.db`. */
  databaseUrl: required("DATABASE_URL"),
} as const;