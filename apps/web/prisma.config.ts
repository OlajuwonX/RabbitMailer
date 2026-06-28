import { defineConfig } from "@prisma/config";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local"), override: false });

function cleanUrl(raw: string | undefined): string {
  if (!raw) return "";
  return raw.replace(/[?&]channel_binding=[^&]*/g, "").replace(/\?$/, "");
}

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: cleanUrl(process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL),
  },
});
