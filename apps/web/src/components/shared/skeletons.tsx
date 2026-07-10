import { cn } from "@/lib/utils/cn";

// ─── Primitive pulse block ────────────────────────────────────────────────────

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-white/6", className)} />;
}

// ─── KPI card (matches dashboard 4-col grid) ──────────────────────────────────

export function KpiCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-white/7 bg-white/3 p-6 space-y-2",
        className,
      )}
    >
      <Bone className="h-3 w-20" />
      <Bone className="mt-1 h-8 w-28" />
    </div>
  );
}

// ─── List row (campaigns / templates) ────────────────────────────────────────

export function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-b border-white/5">
      <Bone className="h-4 w-4 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Bone className="h-3.5 w-48" />
        <Bone className="h-3 w-32" />
      </div>
      <Bone className="h-5 w-16 rounded-full" />
      <Bone className="h-7 w-7 rounded-lg shrink-0" />
    </div>
  );
}

// ─── Table body (multiple rows) ───────────────────────────────────────────────

export function TableBodySkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Analytics stat card ──────────────────────────────────────────────────────

export function AnalyticsCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-white/7 bg-white/3 p-6 space-y-4",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <Bone className="h-3.5 w-28" />
        <Bone className="h-5 w-14 rounded-full" />
      </div>
      <Bone className="h-32 w-full rounded-xl" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Bone key={i} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}

// ─── Full-page skeleton (KPI grid + table) ────────────────────────────────────
// Use as <Suspense fallback={<PageSkeleton />}> for server component pages

export function PageSkeleton() {
  return (
    <div className="p-6 space-y-8">
      <div className="space-y-2">
        <Bone className="h-7 w-48" />
        <Bone className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>

      <div className="rounded-2xl border border-white/7 bg-white/3 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/7">
          <Bone className="h-4 w-32" />
          <Bone className="h-8 w-24 rounded-xl" />
        </div>
        <TableBodySkeleton rows={5} />
      </div>
    </div>
  );
}
