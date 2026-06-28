import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies, headers } from 'next/headers'
import { cache } from 'react'
import type { SessionPayload } from '@repo/shared-types'
import { getPrisma } from '@/lib/db/prisma'

const COOKIE_NAME = 'session'
const EXPIRY_DAYS = 7

function getSecret() {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET not set')
  return new TextEncoder().encode(s)
}

function cookieExpiry() {
  return new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000)
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_DAYS}d`)
    .sign(getSecret())
}

export async function decrypt(
  token: string | undefined,
): Promise<(SessionPayload & { exp: number }) | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] })
    const session = payload as unknown as SessionPayload & { exp: number }

    // Reject tokens that don't belong to the current tenant
    const currentTenantId = (await headers()).get('x-tenant-id')
    if (!currentTenantId || session.tenantId !== currentTenantId) return null

    return session
  } catch {
    return null
  }
}

export async function createSession(
  userId: string,
  email: string,
  name: string,
  isAdmin: boolean,
): Promise<void> {
  const tenantId = (await headers()).get('x-tenant-id')!
  const token = await encrypt({ userId, email, name, isAdmin, tenantId })

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: cookieExpiry(),
  })
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function refreshSession(): Promise<(SessionPayload & { exp: number }) | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const session = await decrypt(token)
  if (!session) return null

  const newToken = await encrypt({
    userId: session.userId,
    email: session.email,
    name: session.name,
    isAdmin: session.isAdmin,
    tenantId: session.tenantId,
  })

  cookieStore.set(COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: cookieExpiry(),
  })

  return session
}

export const getCurrentUser = cache(async () => {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    const session = await decrypt(token)
    if (!session) return null

    const prisma = await getPrisma()
    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user) return null

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      tenantId: user.tenantId,
    }
  } catch {
    return null
  }
})
