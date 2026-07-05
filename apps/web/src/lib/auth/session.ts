import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { SessionPayload } from "@repo/shared-types";
import { getPrisma } from "@/lib/db/prisma";

const SESSION_COOKIE = "session";
// Non-httponly — plain Unix timestamp read by SessionRefresher to schedule proactive refresh.
const SESSION_EXP_COOKIE = "session_exp";
const EXPIRY_MINUTES = 15;

function getSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not set");
  return new TextEncoder().encode(s);
}

function sessionExpiry(): Date {
  return new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_MINUTES}m`)
    .sign(getSecret());
}

export async function decrypt(
  token: string | undefined,
): Promise<(SessionPayload & { exp: number }) | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    const session = payload as unknown as SessionPayload & { exp: number };

    // Reject tokens that don't belong to the current tenant
    const currentTenantId = (await headers()).get("x-tenant-id");
    if (!currentTenantId || session.tenantId !== currentTenantId) return null;

    return session;
  } catch {
    return null;
  }
}

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function writeSessionCookies(
  store: CookieStore,
  token: string,
  expiry: Date,
): void {
  const base = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiry,
  };
  store.set(SESSION_COOKIE, token, { ...base, httpOnly: true });
  store.set(SESSION_EXP_COOKIE, String(Math.floor(expiry.getTime() / 1000)), {
    ...base,
    httpOnly: false,
  });
}

export async function createSession(
  userId: string,
  email: string,
  name: string,
  isAdmin: boolean,
  sessionVersion: number,
): Promise<void> {
  const tenantId = (await headers()).get("x-tenant-id")!;
  const expiry = sessionExpiry();
  const token = await encrypt({
    userId,
    email,
    name,
    isAdmin,
    tenantId,
    sessionVersion,
  });
  writeSessionCookies(await cookies(), token, expiry);
}

export async function deleteSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(SESSION_EXP_COOKIE);
}

export async function refreshSession(): Promise<
  (SessionPayload & { exp: number }) | null
> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const session = await decrypt(token);
  if (!session) return null;

  const expiry = sessionExpiry();
  const newToken = await encrypt({
    userId: session.userId,
    email: session.email,
    name: session.name,
    isAdmin: session.isAdmin,
    tenantId: session.tenantId,
    sessionVersion: session.sessionVersion,
  });

  writeSessionCookies(store, newToken, expiry);
  return session;
}

export const getCurrentUser = cache(async () => {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    const session = await decrypt(token);
    if (!session) return null;

    const prisma = await getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      tenantId: user.tenantId,
    };
  } catch {
    return null;
  }
});
