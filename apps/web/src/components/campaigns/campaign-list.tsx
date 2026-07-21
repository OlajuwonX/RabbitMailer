import Link from "next/link";
import { Mail } from "lucide-react";
import { CampaignMutationButtons } from "@/components/campaigns/campaign-mutation-buttons";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LinearCard } from "@/components/ui/linear";
import type { Campaign } from "@repo/shared-types";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function CampaignList({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) {
    return (
      <EmptyState
        icon={<Mail className="h-6 w-6" aria-hidden />}
        title="No campaigns yet"
        description="Create a campaign to start sending to your recipients."
      />
    );
  }

  return (
    <div className="space-y-3">
      {campaigns.map((campaign) => {
        const sentPct =
          campaign.totalRecipients > 0
            ? Math.round((campaign.sentCount / campaign.totalRecipients) * 100)
            : 0;

        return (
          <LinearCard key={campaign.id} padding="md">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <Link href={`/campaigns/${campaign.id}`} className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-100">
                    {campaign.name}
                  </p>
                  <CampaignStatusBadge status={campaign.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Created {formatDate(campaign.createdAt)}
                </p>
              </Link>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-40">
                  <div className="h-2 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-violet-400"
                      style={{ width: `${sentPct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {campaign.sentCount.toLocaleString()} /{" "}
                    {campaign.totalRecipients.toLocaleString()} sent
                  </p>
                </div>
                <CampaignMutationButtons
                  campaignId={campaign.id}
                  status={campaign.status}
                />
              </div>
            </div>
          </LinearCard>
        );
      })}
    </div>
  );
}
