import 'server-only'
import { SignJWT, jwtVerify } from 'jose'

const EXPIRY = '7d'
const COOKIE_NAME = 'refresh_token'

function getSecret() {
  const s = process.env.REFRESH_TOKEN_SECRET
  if (!s) throw new Error('REFRESH_TOKEN_SECRET not set')
  return new TextEncoder().encode(s)
}

export async function generateRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret())
}

export async function verifyRefreshToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] })
    const userId = (payload as { userId?: string }).userId
    return userId ?? null
  } catch {
    return null
  }
}

export { COOKIE_NAME as REFRESH_TOKEN_COOKIE }
