import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/edge-config";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "session";
// httpOnly — Server Actions read this to validate the form field; JS cannot touch it.
const CSRF_COOKIE = "_csrf_token";

function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function resolveTenantId(host: string): Promise<string | null> {
  if (process.env.EDGE_CONFIG) {
    try {
      const id = await get<string>(host);
      if (id) return id;
    } catch {
      /* Edge Config unreachable — fall through to fallback */
    }
  }
  return process.env.FALLBACK_TENANT_ID ?? null;
}

async function verifySession(
  token: string | undefined,
  tenantId: string,
): Promise<boolean> {
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    return (payload as { tenantId?: string }).tenantId === tenantId;
  } catch {
    return false;
  }
}

const PUBLIC_EXACT = new Set(["/login", "/signup"]);
const PUBLIC_PREFIXES = [
  "/api/track/",
  "/api/webhooks",
  "/api/internal/revalidate",
];
const AUTH_ONLY_PATHS = new Set(["/login", "/signup"]);

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const tenantId = await resolveTenantId(host);
  if (!tenantId) return new NextResponse("Not found", { status: 404 });

  const { pathname } = request.nextUrl;

  // Reuse existing token so it stays consistent within a browser session.
  const csrfToken =
    request.cookies.get(CSRF_COOKIE)?.value ?? generateCsrfToken();

  const isPublic =
    PUBLIC_EXACT.has(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = await verifySession(sessionToken, tenantId);

  if (authenticated && AUTH_ONLY_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isPublic && !authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Forward tenant + CSRF token to Server Components as request headers.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", tenantId);
  requestHeaders.set("x-csrf-token", csrfToken);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // httpOnly so JS cannot read or tamper with the stored token.
  response.cookies.set(CSRF_COOKIE, csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
