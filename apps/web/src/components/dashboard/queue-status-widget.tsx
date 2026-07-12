"use client";

import { useEffect, useState } from "react";
import { LinearCard } from "@/components/ui/linear";
import { cn } from "@/lib/utils/cn";
import { getQueueStatusAction } from "@/app/actions/campaigns";
import type { QueueCounts } from "@repo/shared-types";

const POLL_MS = 10_000;

function formatETA(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

interface QueueStatusWidgetProps {
  initialCounts: QueueCounts;
}

export function QueueStatusWidget({ initialCounts }: QueueStatusWidgetProps) {
  const [counts, setCounts] = useState<QueueCounts>(initialCounts);

  useEffect(() => {
    const id = setInterval(async () => {
      const fresh = await getQueueStatusAction();
      setCounts(fresh);
    }, POLL_MS);
    return () => clearInterval(id);
  }, []);

  const isIdle = counts.pending === 0;

  return (
    <LinearCard padding="md">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        {/* Status + ETA */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                isIdle
                  ? "bg-slate-600"
                  : "bg-emerald-400 animate-pulse",
              )}
            />
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">
              Send queue
            </p>
          </div>

          <p className="text-sm font-semibold text-slate-200">
            {isIdle
              ? "Idle — no emails queued"
              : `${counts.pending.toLocaleString()} email${counts.pending === 1 ? "" : "s"} pending`}
          </p>

          {counts.estimatedCompletionAt && !isIdle && (
            <p className="text-xs text-slate-500">
              Est. completion: {formatETA(counts.estimatedCompletionAt)}
            </p>
          )}
        </div>

        {/* Counters */}
        <div className="flex gap-6 shrink-0">
          {(
            [
              { label: "Sent",   value: counts.sent,   danger: false },
              { label: "Failed", value: counts.failed, danger: counts.failed > 0 },
            ] as const
          ).map(({ label, value, danger }) => (
            <div key={label} className="text-center">
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  danger ? "text-red-400" : "text-slate-100",
                )}
              >
                {value.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </LinearCard>
  );
}
