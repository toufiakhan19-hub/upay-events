import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";

export const dynamic = "force-dynamic";

/**
 * Local setup check. Verifies the app can reach the SQLite database so a
 * misconfigured `DATABASE_URL` fails loudly here instead of on the first page
 * that queries data.
 */
export async function GET() {
  try {
    await db.all(sql`select 1`);
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch {
    return NextResponse.json(
      { status: "error", database: "unreachable" },
      { status: 503 },
    );
  }
}