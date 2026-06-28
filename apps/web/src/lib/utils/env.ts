import 'server-only'
import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_DIRECT: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  SMTP_ENCRYPTION_KEY: z.string().length(64),
  REVALIDATION_SECRET: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().min(1),
  EDGE_CONFIG: z.string().optional(),
  FALLBACK_TENANT_ID: z.string().optional(),
})

function validate() {
  const result = schema.safeParse(process.env)
  if (!result.success) {
    const missing = result.error.issues.map(i => i.path.join('.')).join(', ')
    throw new Error(`Missing or invalid environment variables: ${missing}`)
  }
  return result.data
}

export const env = validate()
