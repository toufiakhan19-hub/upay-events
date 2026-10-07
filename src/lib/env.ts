import "server-only";

/**
 * Server-only environment access.
 *
 * Values are read from `.env` (git-ignored) with `.env.example` as the
 * committed template. Nothing secret is hard-coded here or anywhere else in
 * `src/`; the MVP needs a database path and the AI service base URL.
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

function withDefault(name: string, fallback: string): string {
  const value = process.env[name]?.trim();

  return value ? value : fallback;
}

/** docs/API_CONTRACT.md §2: the AI service listens here in development. */
const AI_SERVICE_URL_FALLBACK = "http://127.0.0.1:8000";

export const env = {
  /** Supabase Postgres connection string, e.g. `postgresql://postgres.<ref>:<password>@<host>:5432/postgres`. */
  databaseUrl: required("DATABASE_URL"),
  /**
   * Base URL of the AI service (docs/API_CONTRACT.md §2).
   *
   * Defaults to the contract's localhost address so the app still boots and every
   * page still renders when the AI service is not running — the dashboard serves
   * cached forecasts only, and a failed refresh leaves them untouched (§7.3). The
   * trailing slash is stripped so the client can join paths without producing
   * `//predict/forecast`.
   */
  aiServiceUrl: withDefault("AI_SERVICE_URL", AI_SERVICE_URL_FALLBACK).replace(/\/+$/, ""),
} as const;