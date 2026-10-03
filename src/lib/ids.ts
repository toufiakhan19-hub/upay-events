import { randomBytes } from "node:crypto";

/**
 * ULID generation for primary keys (`src/db/schema.ts` stores ids as ULID
 * strings, not auto-increment integers).
 *
 * Not marked `server-only`: the marker package throws when loaded outside a
 * React Server Component graph, and `scripts/seed.ts` needs ids too. The
 * `node:crypto` import is the real boundary — bundling this module into a
 * Client Component fails at build time.
 *
 * Format: a 48-bit big-endian millisecond timestamp followed by 80 bits of
 * randomness, Crockford base32, 26 characters, lowercase.
 * https://github.com/ulid/spec
 *
 * Deliberately free of `BigInt`: the TypeScript target is ES2017. Each half is
 * encoded on its own, and both halves stay below 2^53 so `number` arithmetic is
 * exact.
 */

const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";

const TIME_CHARS = 10;
const RANDOM_CHARS = 16;
/** 10 random bytes, encoded as two 40-bit halves of 8 characters each. */
const BYTES_PER_RANDOM_HALF = 5;
const RANDOM_HALVES = 2;
/** 32 bytes of entropy for tokens that must not be guessable. */
const TOKEN_BYTES = 32;

/** 48-bit timestamp: 10 base32 characters. */
function encodeTime(timestamp: number): string {
  let remaining = timestamp;
  let encoded = "";

  for (let index = 0; index < TIME_CHARS; index += 1) {
    encoded = ALPHABET[remaining % 32] + encoded;
    remaining = Math.floor(remaining / 32);
  }

  return encoded;
}

/** 80 bits of randomness: 16 base32 characters. */
function encodeRandom(): string {
  const bytes = randomBytes((BYTES_PER_RANDOM_HALF * RANDOM_HALVES));
  let encoded = "";

  for (let half = 0; half < RANDOM_HALVES; half += 1) {
    // 40 bits fits exactly in a double, so this stays lossless.
    let value = 0;

    for (let byte = 0; byte < BYTES_PER_RANDOM_HALF; byte += 1) {
      value = value * 256 + bytes[half * BYTES_PER_RANDOM_HALF + byte];
    }

    let halfEncoded = "";

    for (let index = 0; index < RANDOM_CHARS / RANDOM_HALVES; index += 1) {
      halfEncoded = ALPHABET[value % 32] + halfEncoded;
      value = Math.floor(value / 32);
    }

    encoded += halfEncoded;
  }

  return encoded;
}

/**
 * Time-sortable and unguessable, which is what the schema asks for. Ids created
 * in the same millisecond are not ordered relative to each other; that ordering
 * guarantee is not needed and the monotonic counter was dropped.
 */
export function newId(): string {
  return encodeTime(Date.now()) + encodeRandom();
}

/**
 * Opaque, unguessable token for a ticket QR code (256 bits of CSPRNG entropy,
 * URL-safe base64).
 *
 * Deliberately carries no timestamp and no encoded identity: the token is the
 * bearer secret a future check-in scanner reads, so it must be random rather
 * than derived from the attendee, the registration, or the event (PRD §14 —
 * QR payloads never contain name, phone, or payment data).
 */
export function newOpaqueToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}