export const ALLOWED_EMAIL_DOMAIN = "adere.so";
export const SESSION_COOKIE_NAME = "__session";
/** 5 días — límite de session cookies de Firebase Auth */
export const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 5 * 1000;

export type SessionUser = {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
};

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}
