/** Internal-path guard for post-login and post-logout redirects. */
export const DEFAULT_POST_LOGIN_PATH = "/events";

/**
 * Accepts only same-site absolute paths. Anything else — an absolute URL, a
 * protocol-relative `//evil.example`, or junk — falls back, so a crafted
 * `?next=` cannot turn the login form into an open redirect.
 */
export function safeInternalPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  return value;
}