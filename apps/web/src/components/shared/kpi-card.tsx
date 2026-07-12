import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { LinearCard } from "@/components/ui/linear";

// ─── Pulse atom (matches skeletons.tsx) ──────────────────────────────────────

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-white/6", className)} />;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  /** Pass a number for auto-formatting via Intl.NumberFormat, or a pre-formatted string. */
  value?: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    /** Absolute percentage change, e.g. 4.2 for +4.2 %. */
    value: number;
    direction: "up" | "down";
  };
  loading?: boolean;
  className?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  loading = false,
  className,
}: KpiCardProps) {
  if (loading) {
    return (
      <LinearCard padding="md" className={className}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Bone className="h-3 w-20" />
            <Bone className="h-7 w-7 rounded-lg" />
          </div>
          <Bone className="h-8 w-28" />
          <Bone className="h-3 w-16" />
        </div>
      </LinearCard>
    );
  }

  const displayValue =
    typeof value === "number"
      ? new Intl.NumberFormat().format(value)
      : value ?? "—";

  return (
    <LinearCard padding="md" className={className}>
      <div className="space-y-2">
        {/* Label row */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">
            {title}
          </p>
          {icon && (
            <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 shrink-0">
              {icon}
            </div>
          )}
        </div>

        {/* Value */}
        <p className="text-3xl font-bold text-slate-100 tabular-nums">
          {displayValue}
        </p>

        {/* Subtitle + trend */}
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 flex-wrap">
            {subtitle && (
              <p className="text-xs text-slate-500">{subtitle}</p>
            )}
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-medium",
                  trend.direction === "up"
                    ? "text-emerald-400"
                    : "text-red-400",
                )}
              >
                {trend.direction === "up" ? (
                  <TrendingUp className="h-3 w-3" aria-hidden />
                ) : (
                  <TrendingDown className="h-3 w-3" aria-hidden />
                )}
                {trend.value.toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>
    </LinearCard>
  );
}
