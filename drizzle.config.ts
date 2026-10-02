import "dotenv/config";

import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit configuration. `dotenv/config` loads `.env` so `DATABASE_URL`
 * resolves the same way it does at runtime.
 *
 * SQL migrations are generated into ./drizzle and committed, so a teammate can
 * bring the database up with `npm run db:migrate` and no extra setup.
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./upay-events.db",
  },
  strict: true,
  verbose: true,
});