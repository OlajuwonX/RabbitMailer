import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Mirrors apps/web/src/lib/db/prisma.ts but:
//  - no server-only (worker is not a Next.js module)
//  - tenantId comes from the job payload, not from request headers

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

// The worker is a persistent process on Railway, so a real connection pool is appropriate. Use DATABASE_URL pointing to the direct (non-pooled) Neon URL.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 5,
});

const base = new PrismaClient({
  adapter: new PrismaPg(pool),
} as ConstructorParameters<typeof PrismaClient>[0]);

export function getScopedPrisma(tenantId: string) {
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

export type WorkerPrisma = ReturnType<typeof getScopedPrisma>;
