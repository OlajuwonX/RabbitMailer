import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getQueueStatusAction } from "@/app/actions/campaigns";
import { CampaignMutationButtons } from "@/components/campaigns/campaign-mutation-buttons";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { QueueStatusWidget } from "@/components/dashboard/queue-status-widget";
import { KpiCard } from "@/components/shared/kpi-card";
import { LinearCard, LinearTitle } from "@/components/ui/linear";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import type { Campaign, Recipient } from "@repo/shared-types";

const PAGE_SIZE = 50;

type CampaignWithRecipients = Campaign & {
  recipients: Recipient[];
};

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function pct(value: number, total: number): string {
  return total === 0 ? "0%" : `${Math.round((value / total) * 100)}%`;
}

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage ?? "1") || 1);
  const prisma = await getPrisma();

  const [campaign, totalRecipients, queueCounts] = await Promise.all([
    prisma.campaign.findFirst({
      where: { id, userId: user.id },
      include: {
        recipients: {
          orderBy: { createdAt: "asc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        },
      },
    }),
    prisma.recipient.count({ where: { campaignId: id } }),
    getQueueStatusAction(),
  ]);

  if (!campaign) notFound();

  const typedCampaign = campaign as unknown as CampaignWithRecipients;
  const sentPct = typedCampaign.totalRecipients
    ? Math.round((typedCampaign.sentCount / typedCampaign.totalRecipients) * 100)
    : 0;
  const totalPages = Math.max(1, Math.ceil(totalRecipients / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Campaigns
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <LinearTitle gradient size="lg" as="h1">
              {typedCampaign.name}
            </LinearTitle>
            <CampaignStatusBadge status={typedCampaign.status} />
          </div>
          <p className="text-sm text-slate-500">
            Created {formatDate(typedCampaign.createdAt)}
          </p>
        </div>
        <CampaignMutationButtons
          campaignId={typedCampaign.id}
          status={typedCampaign.status}
        />
      </div>

      <LinearCard padding="md">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-slate-300">Progress</span>
          <span className="text-slate-500">{sentPct}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-violet-400"
            style={{ width: `${sentPct}%` }}
          />
        </div>
      </LinearCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Sent"
          value={typedCampaign.sentCount}
          subtitle={pct(typedCampaign.sentCount, typedCampaign.totalRecipients)}
        />
        <KpiCard
          title="Opens"
          value={typedCampaign.openCount}
          subtitle={pct(typedCampaign.openCount, typedCampaign.sentCount)}
        />
        <KpiCard
          title="Clicks"
          value={typedCampaign.clickCount}
          subtitle={pct(typedCampaign.clickCount, typedCampaign.sentCount)}
        />
        <KpiCard
          title="Bounces"
          value={typedCampaign.bounceCount}
          subtitle={pct(typedCampaign.bounceCount, typedCampaign.sentCount)}
        />
      </div>

      {typedCampaign.status === "sending" && (
        <QueueStatusWidget initialCounts={queueCounts} />
      )}

      <LinearCard padding="none" className="overflow-hidden">
        <div className="border-b border-white/7 px-4 py-3">
          <p className="text-sm font-semibold text-slate-200">Recipients</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr className="border-b border-white/7">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Sent</th>
                <th className="px-4 py-3 font-medium">Opened</th>
                <th className="px-4 py-3 font-medium">Clicked</th>
              </tr>
            </thead>
            <tbody>
              {typedCampaign.recipients.map((recipient) => (
                <tr key={recipient.id} className="border-b border-white/5">
                  <td className="px-4 py-3 text-slate-200">{recipient.email}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {recipient.status}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(recipient.sentAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(recipient.openedAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(recipient.clickedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LinearCard>

      <div className="flex items-center justify-between">
        <Link
          href={`/campaigns/${id}?page=${Math.max(1, page - 1)}`}
          aria-disabled={page === 1}
          className="text-sm text-slate-500 aria-disabled:pointer-events-none aria-disabled:opacity-40"
        >
          Previous
        </Link>
        <p className="text-sm text-slate-500">
          Page {page} of {totalPages}
        </p>
        <Link
          href={`/campaigns/${id}?page=${Math.min(totalPages, page + 1)}`}
          aria-disabled={page === totalPages}
          className="text-sm text-slate-500 aria-disabled:pointer-events-none aria-disabled:opacity-40"
        >
          Next
        </Link>
      </div>
    </main>
  );
}
