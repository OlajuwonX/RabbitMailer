import { NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/edge-config'

async function resolveTenantId(host: string): Promise<string | null> {
  if (process.env.EDGE_CONFIG) {
    try {
      const id = await get<string>(host)
      if (id) return id
    } catch {
      // Edge Config unreachable — fall through to local fallback
    }
  }
  return process.env.FALLBACK_TENANT_ID ?? null
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const tenantId = await resolveTenantId(host)

  if (!tenantId) {
    return new NextResponse('Not found', { status: 404 })
  }

  // Forward tenantId to Server Components and Route Handlers via request header
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-id', tenantId)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
