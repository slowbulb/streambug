import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "console_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/** Constant-time comparison so a wrong-guess response can't be timed to leak the real password. */
export function checkOwnerPassword(candidate: string): boolean {
  const expected = process.env.OWNER_PASSWORD;
  if (!expected) throw new Error("OWNER_PASSWORD is not set");
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function createOwnerSession() {
  const token = await new SignJWT({ role: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSessionSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearOwnerSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isOwnerSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    return payload.role === "owner";
  } catch {
    return false;
  }
}

/** Guard for every mutating Server Action — the actual security boundary, since
 * hiding a button in the UI doesn't stop a direct call to the action itself. */
export async function requireOwner() {
  if (!(await isOwnerSession())) {
    throw new Error("Sign in required to make changes.");
  }
}
