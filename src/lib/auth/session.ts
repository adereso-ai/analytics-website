import { cookies } from "next/headers";
import {
  ALLOWED_EMAIL_DOMAIN,
  isAllowedEmail,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  type SessionUser,
} from "@/lib/auth/domain";
import { getAdminAuth } from "@/lib/auth/firebase-admin";

export type { SessionUser };

export async function createSessionCookie(idToken: string): Promise<SessionUser> {
  const auth = getAdminAuth();
  const decoded = await auth.verifyIdToken(idToken, true);

  if (!isAllowedEmail(decoded.email)) {
    throw new Error(
      `Solo cuentas @${ALLOWED_EMAIL_DOMAIN} pueden acceder.`,
    );
  }

  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });

  return {
    uid: decoded.uid,
    email: decoded.email!,
    name: typeof decoded.name === "string" ? decoded.name : undefined,
    picture: typeof decoded.picture === "string" ? decoded.picture : undefined,
  };
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const session = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!session) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(session, true);
    if (!isAllowedEmail(decoded.email)) {
      await clearSessionCookie();
      return null;
    }
    return {
      uid: decoded.uid,
      email: decoded.email!,
      name: typeof decoded.name === "string" ? decoded.name : undefined,
      picture: typeof decoded.picture === "string" ? decoded.picture : undefined,
    };
  } catch {
    return null;
  }
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
