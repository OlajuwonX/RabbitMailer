import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { headers } from "next/headers";

function createBase(): PrismaClient {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1, // PgBouncer (connection_limit=1 in URL) — one connection per serverless instance
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter } as ConstructorParameters<
    typeof PrismaClient
  >[0]);
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const base = globalForPrisma.prisma ?? createBase();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = base;

const WRITE_OPS = ["create", "createMany"];
const WHERE_OPS = [
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
  "upsert",
];

function scopedClient(tenantId: string) {
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query, operation, model }) {
          // TenantDomain is the routing table — never scope it
          if (model === "TenantDomain") return query(args);

          const a = args as Record<string, unknown>;

          if (WHERE_OPS.includes(operation)) {
            a.where = { ...((a.where as object | undefined) ?? {}), tenantId };
          }

          if (WRITE_OPS.includes(operation)) {
            const data = a.data;
            if (Array.isArray(data)) {
              a.data = data.map((d: Record<string, unknown>) => ({
                ...d,
                tenantId,
              }));
            } else if (data && typeof data === "object") {
              (data as Record<string, unknown>).tenantId = tenantId;
            }
          }

          if (operation === "upsert") {
            const create = a.create as Record<string, unknown> | undefined;
            if (create) create.tenantId = tenantId;
          }

          return query(args);
        },
      },
    },
  });
}

export async function getPrisma() {
  const tenantId = (await headers()).get("x-tenant-id");
  if (!tenantId)
    throw new Error(
      "No tenant context — x-tenant-id header not set by middleware",
    );
  return scopedClient(tenantId);
}

export type ScopedPrisma = ReturnType<typeof scopedClient>;
