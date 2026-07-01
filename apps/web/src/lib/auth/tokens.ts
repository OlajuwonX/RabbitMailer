import "server-only";
import { SignJWT, jwtVerify } from "jose";

const EXPIRY = "7d";
const COOKIE_NAME = "refresh_token";

function getSecret() {
  const s = process.env.REFRESH_TOKEN_SECRET;
  if (!s) throw new Error("REFRESH_TOKEN_SECRET not set");
  return new TextEncoder().encode(s);
}

export async function generateRefreshToken(
  userId: string,
  sessionVersion: number,
): Promise<string> {
  return new SignJWT({ userId, sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret());
}

export async function verifyRefreshToken(
  token: string,
): Promise<{ userId: string; sessionVersion: number } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    const { userId, sessionVersion } = payload as {
      userId?: string;
      sessionVersion?: number;
    };
    if (!userId || sessionVersion === undefined) return null;
    return { userId, sessionVersion };
  } catch {
    return null;
  }
}

export { COOKIE_NAME as REFRESH_TOKEN_COOKIE };
