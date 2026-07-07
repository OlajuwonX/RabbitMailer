import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import {
  verifyRefreshToken,
  generateRefreshToken,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/tokens";
import { getPrisma } from "@/lib/db/prisma";
import { createSession, deleteSession } from "@/lib/auth/session";

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  // Prevent loops back into auth paths
  if (
    raw === "/login" ||
    raw === "/signup" ||
    raw.startsWith("/api/auth/")
  )
    return "/dashboard";
  return raw;
}

export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const loginUrl = new URL("/login", request.url);
  const nextUrl = new URL(next, request.url);

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
    if (!token) return NextResponse.redirect(loginUrl);

    const tokenData = await verifyRefreshToken(token);
    if (!tokenData) return NextResponse.redirect(loginUrl);

    const { userId, sessionVersion } = tokenData;

    const prisma = await getPrisma();
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.refreshToken !== token)
      return NextResponse.redirect(loginUrl);

    // Version mismatch means another device logged in — honour the kick-out.
    if (user.sessionVersion !== sessionVersion) {
      await deleteSession();
      return NextResponse.redirect(loginUrl);
    }

    const tenantId = (await headers()).get("x-tenant-id");
    if (!tenantId || user.tenantId !== tenantId)
      return NextResponse.redirect(loginUrl);

    // Rotate the refresh token.
    const newRefreshToken = await generateRefreshToken(userId, sessionVersion);
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: newRefreshToken },
    });
    cookieStore.set(REFRESH_TOKEN_COOKIE, newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // refreshSession() rejects expired JWTs, so rebuild the session from live DB data.
    await createSession(
      user.id,
      user.email,
      user.name,
      user.isAdmin,
      user.sessionVersion,
    );

    return NextResponse.redirect(nextUrl);
  } catch {
    return NextResponse.redirect(loginUrl);
  }
}
