/**
 * Timestamps are stored as ISO 8601 UTC strings with second precision and a `Z`
 * suffix (`src/db/schema.ts` convention). SQLite's `strftime('%Y-%m-%dT%H:%M:%SZ')`
 * default produces exactly this shape, so code that writes a timestamp itself
 * has to match it or string comparisons in queries would be inconsistent.
 */

export function toUtcTimestamp(date: Date): string {
  return `${date.toISOString().slice(0, 19)}Z`;
}