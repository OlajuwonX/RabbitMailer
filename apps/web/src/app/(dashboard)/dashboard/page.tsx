import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Mail,
  MousePointerClick,
  TrendingUp,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { getQueueStatusAction } from "@/app/actions/campaigns";
import { LinearTitle } from "@/components/ui/linear";
import { KpiCard } from "@/components/shared/kpi-card";
import { TableBodySkeleton } from "@/components/shared/skeletons";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { RecentCampaignsTable } from "@/components/dashboard/recent-campaigns-table";
import { QueueStatusWidget } from "@/components/dashboard/queue-status-widget";
import type { Campaign } from "@repo/shared-types";

// ─── Recent campaigns — isolated async section for Suspense streaming ─────────

async function RecentCampaignsSection() {
  const prisma = await getPrisma();
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  return <RecentCampaignsTable campaigns={campaigns as unknown as Campaign[]} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const prisma = await getPrisma();

  const [totals, activeCampaigns, initialCounts] = await Promise.all([
    prisma.campaign.aggregate({
      _sum: {
        sentCount: true,
        openCount: true,
        clickCount: true,
        bounceCount: true,
      },
    }),
    prisma.campaign.count({ where: { status: "sending" } }),
    getQueueStatusAction(),
  ]);

  const totalSent   = totals._sum.sentCount   ?? 0;
  const totalOpens  = totals._sum.openCount   ?? 0;
  const totalClicks = totals._sum.clickCount  ?? 0;

  const openRate   = totalSent > 0 ? ((totalOpens  / totalSent) * 100).toFixed(1) + "%" : "—";
  const clickRate  = totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(1) + "%" : "—";

  return (
    <div className="p-6 space-y-8">
      {/* Page header */}
      <div className="space-y-1">
        <LinearTitle gradient size="lg" as="h1">
          Welcome back, {user.name}
        </LinearTitle>
        <p className="text-slate-500 text-sm">
          Here&apos;s an overview of your sending activity.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Emails sent"
          value={totalSent}
          icon={<Mail className="h-4 w-4" />}
        />
        <KpiCard
          title="Open rate"
          value={openRate}
          subtitle={`${totalOpens.toLocaleString()} opens`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiCard
          title="Click rate"
          value={clickRate}
          subtitle={`${totalClicks.toLocaleString()} clicks`}
          icon={<MousePointerClick className="h-4 w-4" />}
        />
        <KpiCard
          title="Active campaigns"
          value={activeCampaigns}
          icon={<LayoutDashboard className="h-4 w-4" />}
        />
      </div>

      {/* Queue status — always rendered, polls live */}
      <QueueStatusWidget initialCounts={initialCounts} />

      {/* Recent campaigns — streamed independently */}
      <ErrorBoundary label="Recent campaigns">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-white/7 bg-white/3 overflow-hidden">
              <TableBodySkeleton rows={3} />
            </div>
          }
        >
          <RecentCampaignsSection />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
