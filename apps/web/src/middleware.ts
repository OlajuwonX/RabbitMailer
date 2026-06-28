import { NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/edge-config'
import { jwtVerify } from 'jose'

const SESSION_COOKIE = 'session'

// Paths that never require a session
const PUBLIC_EXACT = new Set(['/login', '/signup'])
const PUBLIC_PREFIXES = ['/api/track/', '/api/webhooks', '/api/internal/revalidate']

// Authenticated users on these paths are redirected to /dashboard
const AUTH_ONLY_PATHS = new Set(['/login', '/signup'])

async function resolveTenantId(host: string): Promise<string | null> {
  if (process.env.EDGE_CONFIG) {
    try {
      const id = await get<string>(host)
      if (id) return id
    } catch {}
  }
  return process.env.FALLBACK_TENANT_ID ?? null
}

async function verifySession(token: string | undefined, tenantId: string): Promise<boolean> {
  if (!token) return false
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET)
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
    return (payload as { tenantId?: string }).tenantId === tenantId
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const tenantId = await resolveTenantId(host)
  if (!tenantId) return new NextResponse('Not found', { status: 404 })

  const { pathname } = request.nextUrl
  const isPublic =
    PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const authenticated = await verifySession(token, tenantId)

  // Forward tenant identity to Server Components and Route Handlers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-id', tenantId)

  if (authenticated && AUTH_ONLY_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!isPublic && !authenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
