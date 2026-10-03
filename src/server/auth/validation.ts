/**
 * Server-side validation for the mock upay login form.
 *
 * Runs on the server only, on values that have already crossed the network, so
 * the same rules must be enforced here regardless of what the client rendered.
 * Phone validation is intentionally one normalization step plus one pattern —
 * the MVP collects a phone number, not a verified upay account (PRD §5).
 */

/** Long enough for a Bangladeshi name, short enough to keep the row readable. */
const NAME_MAX_LENGTH = 80;

/** `01` + operator digit + 8 digits, e.g. `01712345678`. */
const BD_MOBILE_PATTERN = /^01[3-9]\d{8}$/;

export type LoginInput = {
  name?: unknown;
  phone?: unknown;
};

export type LoginFieldErrors = Partial<Record<"name" | "phone", string>>;

export type ValidatedLoginInput =
  | { ok: true; name: string; phone: string }
  | { ok: false; errors: LoginFieldErrors };

/**
 * Accepts the shapes a Bangladeshi attendee actually types
 * (`01712345678`, `+8801712345678`, `880 1712-345678`) and stores one canonical
 * form, so the `users_phone_unique` index really is unique per person.
 */
function normalizePhone(rawPhone: string): string {
  const digits = rawPhone.replace(/[\s()\-.]/g, "");

  if (digits.startsWith("+880")) {
    return `0${digits.slice(4)}`;
  }

  if (digits.startsWith("880")) {
    return `0${digits.slice(3)}`;
  }

  return digits;
}

export function validateLoginInput(input: LoginInput): ValidatedLoginInput {
  const errors: LoginFieldErrors = {};

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const phone = typeof input.phone === "string" ? normalizePhone(input.phone.trim()) : "";

  if (!name) {
    errors.name = "Enter your name.";
  } else if (name.length < 2) {
    errors.name = "Enter your full name (at least 2 characters).";
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `Keep your name under ${NAME_MAX_LENGTH} characters.`;
  }

  if (!phone) {
    errors.phone = "Enter your phone number.";
  } else if (!BD_MOBILE_PATTERN.test(phone)) {
    errors.phone = "That number does not look right. Use a format like 01712345678.";
  }

  if (errors.name || errors.phone) {
    return { ok: false, errors };
  }

  return { ok: true, name, phone };
}