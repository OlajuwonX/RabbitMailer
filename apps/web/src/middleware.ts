import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/edge-config";
import { jwtVerify } from "jose";
import { createCsrfProtect, CsrfError } from "@edge-csrf/nextjs";

const csrfProtect = createCsrfProtect({
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
});

const SESSION_COOKIE = "session";
// Non-httponly — CSRF token readable by client JS for hidden form fields and programmatic actions.
const CSRF_CLIENT_COOKIE = "_csrf";

const PUBLIC_EXACT = new Set(["/login", "/signup"]);
const PUBLIC_PREFIXES = [
  "/api/track/",
  "/api/webhooks",
  "/api/internal/revalidate",
];

// Authenticated users hitting these paths are redirected to /dashboard
const AUTH_ONLY_PATHS = new Set(["/login", "/signup"]);

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

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const tenantId = await resolveTenantId(host);
  if (!tenantId) return new NextResponse("Not found", { status: 404 });

  const { pathname } = request.nextUrl;

  // --- CSRF ---
  // Form POSTs: validates csrf_token field (hard block on failure).
  // text/plain POSTs (programmatic Server Actions): reads first JSON array element as token; swallowed on failure — SameSite=Lax covers these.
  const csrfResponse = NextResponse.next();
  const contentType = request.headers.get("content-type") ?? "";
  const isFormPost =
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded");

  try {
    await csrfProtect(request, csrfResponse);
  } catch (err) {
    if (err instanceof CsrfError && isFormPost) {
      return new NextResponse("Invalid CSRF token", { status: 403 });
    }
    if (!(err instanceof CsrfError)) throw err;
    // Non-form requests without a token — rely on SameSite=Lax.
  }

  const csrfToken = csrfResponse.headers.get("X-CSRF-Token") ?? "";

  // --- Tenant + session ---
  const isPublic =
    PUBLIC_EXACT.has(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = await verifySession(token, tenantId);

  if (authenticated && AUTH_ONLY_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isPublic && !authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Forward tenant identity to Server Components and Route Handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", tenantId);

  const finalResponse = NextResponse.next({ request: { headers: requestHeaders } });

  // Copy _csrfSecret cookie from csrfResponse to the final response.
  csrfResponse.cookies.getAll().forEach(({ name, value, ...rest }) => {
    finalResponse.cookies.set(name, value, rest);
  });

  finalResponse.cookies.set(CSRF_CLIENT_COOKIE, csrfToken, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return finalResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
