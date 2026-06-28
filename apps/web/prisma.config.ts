import { defineConfig } from '@prisma/config'

// DATABASE_URL_DIRECT is only needed for CLI commands that hit the DB (migrate, studio).
// prisma generate does not need a live connection — datasource is omitted when var is missing.
export default defineConfig({
  schema: './prisma/schema.prisma',
  ...(process.env.DATABASE_URL_DIRECT
    ? { datasource: { url: process.env.DATABASE_URL_DIRECT } }
    : {}),
})
