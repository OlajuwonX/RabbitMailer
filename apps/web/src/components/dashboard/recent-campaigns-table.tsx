import Link from "next/link";
import { Mail } from "lucide-react";
import { LinearCard, LinearBadge } from "@/components/ui/linear";
import { EmptyState } from "@/components/shared/empty-state";
import type { Campaign, CampaignStatus } from "@repo/shared-types";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<
  CampaignStatus,
  { label: string; variant: "default" | "info" | "warning" | "success" | "danger" }
> = {
  draft:     { label: "Draft",     variant: "default"  },
  queued:    { label: "Queued",    variant: "info"     },
  sending:   { label: "Sending",   variant: "info"     },
  paused:    { label: "Paused",    variant: "warning"  },
  completed: { label: "Completed", variant: "success"  },
  failed:    { label: "Failed",    variant: "danger"   },
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date)); // new Date() normalises serialised date strings
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RecentCampaignsTableProps {
  campaigns: Campaign[];
}

export function RecentCampaignsTable({ campaigns }: RecentCampaignsTableProps) {
  if (campaigns.length === 0) {
    return (
      <EmptyState
        icon={<Mail className="h-6 w-6" />}
        title="No campaigns yet"
        description="Create your first campaign to start sending emails to your list."
        action={{ label: "Create campaign", href: "/campaigns" }}
      />
    );
  }

  return (
    <LinearCard padding="none" className="overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/7">
        <p className="text-sm font-semibold text-slate-200">Recent campaigns</p>
        <Link
          href="/campaigns"
          className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          View all →
        </Link>
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/5">
        {campaigns.map((c) => {
          const s = STATUS[c.status];
          const sentPct =
            c.totalRecipients > 0
              ? Math.round((c.sentCount / c.totalRecipients) * 100)
              : 0;

          return (
            <div
              key={c.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors"
            >
              {/* Name + date */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">
                  {c.name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDate(c.createdAt)}
                </p>
              </div>

              {/* Progress (hidden on mobile) */}
              <div className="text-right shrink-0 hidden sm:block">
                <p className="text-xs font-medium text-slate-300 tabular-nums">
                  {c.sentCount.toLocaleString()} /{" "}
                  {c.totalRecipients.toLocaleString()}
                </p>
                <p className="text-xs text-slate-600">{sentPct}% sent</p>
              </div>

              {/* Status badge */}
              <LinearBadge variant={s.variant}>{s.label}</LinearBadge>
            </div>
          );
        })}
      </div>
    </LinearCard>
  );
}
