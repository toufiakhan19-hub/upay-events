import postgres from "postgres";

/**
 * Postgres (Supabase) connection factory shared by the Next.js runtime
 * (`src/db/client.ts`) and the standalone seed script (`scripts/seed.ts`).
 *
 * Deliberately not marked `server-only`: the `server-only` package throws when
 * loaded outside a React Server Component graph, and the seed script runs in
 * plain Node. Only `client.ts` — the module the app itself imports — carries the
 * marker, so the app bundle still cannot open a database handle from the
 * browser.
 */

function isLocalHost(databaseUrl: string): boolean {
  try {
    const { hostname } = new URL(databaseUrl);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

export function openPostgresConnection(databaseUrl: string, options: { max?: number } = {}) {
  return postgres(databaseUrl, {
    max: options.max ?? 10,
    // Supabase's transaction pooler (port 6543) does not support prepared
    // statements. Disabling them keeps both the session and transaction pooler
    // connection strings working.
    prepare: false,
    // Supabase requires TLS; a local Postgres usually has none.
    ssl: isLocalHost(databaseUrl) ? false : "require",
  });
}
