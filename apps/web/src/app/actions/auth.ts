'use server'

import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPrisma } from '@/lib/db/prisma'
import { createSession, deleteSession, refreshSession } from '@/lib/auth/session'
import { generateRefreshToken, verifyRefreshToken, REFRESH_TOKEN_COOKIE } from '@/lib/auth/tokens'
import type { ActionResult } from '@repo/shared-types'

const SALT_ROUNDS = 12

const signupSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }
}

export async function signupAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { name, email, password } = parsed.data
  const prisma = await getPrisma()

  const userCount = await prisma.user.count()
  if (userCount > 0) {
    return {
      success: false,
      error: 'This instance already has an admin account. Contact your administrator.',
    }
  }

  const tenantId = (await headers()).get('x-tenant-id')!
  const hashed = await bcrypt.hash(password, SALT_ROUNDS)
  const user = await prisma.user.create({
    data: { name, email, password: hashed, isAdmin: true, tenantId },
  })

  await createSession(user.id, user.email, user.name, user.isAdmin)
  redirect('/dashboard')
}

export async function loginAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { success: false, error: 'Invalid email or password' }
  }

  const { email, password } = parsed.data
  const prisma = await getPrisma()

  const user = await prisma.user.findFirst({ where: { email } })
  if (!user) return { success: false, error: 'Invalid email or password' }

  const match = await bcrypt.compare(password, user.password)
  if (!match) return { success: false, error: 'Invalid email or password' }

  const refreshToken = await generateRefreshToken(user.id)
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } })

  const cookieStore = await cookies()
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions())

  await createSession(user.id, user.email, user.name, user.isAdmin)
  redirect('/dashboard')
}

export async function logoutAction(): Promise<void> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value

    if (token) {
      const userId = await verifyRefreshToken(token)
      if (userId) {
        const prisma = await getPrisma()
        await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } }).catch(() => {})
      }
    }

    cookieStore.delete(REFRESH_TOKEN_COOKIE)
  } catch {
    // Proceed with logout even if token cleanup fails
  }

  await deleteSession()
  redirect('/login')
}

export async function refreshSessionAction(): Promise<ActionResult> {
  const cookieStore = await cookies()
  const token = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value
  if (!token) return { success: false, error: 'No refresh token' }

  const userId = await verifyRefreshToken(token)
  if (!userId) return { success: false, error: 'Invalid refresh token' }

  const prisma = await getPrisma()
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.refreshToken !== token) {
    return { success: false, error: 'Token mismatch' }
  }

  const currentTenantId = (await headers()).get('x-tenant-id')
  if (user.tenantId !== currentTenantId) {
    return { success: false, error: 'Tenant mismatch' }
  }

  const newRefreshToken = await generateRefreshToken(user.id)
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefreshToken } })
  cookieStore.set(REFRESH_TOKEN_COOKIE, newRefreshToken, refreshCookieOptions())

  await refreshSession()
  return { success: true }
}
