import { getPrisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { LinearCard, LinearTitle, LinearBadge } from "@/components/ui/linear";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const prisma = await getPrisma();

  const [campaignCount, templateCount] = await Promise.all([
    prisma.campaign.count(),
    prisma.template.count(),
  ]);

  // Aggregate sent + open counts across all campaigns for this user
  const totals = await prisma.campaign.aggregate({
    _sum: { sentCount: true, openCount: true },
  });

  const totalSent = totals._sum.sentCount ?? 0;
  const totalOpens = totals._sum.openCount ?? 0;
  const openRate =
    totalSent > 0
      ? ((totalOpens / totalSent) * 100).toFixed(1) + "%"
      : "—";

  return (
    <div className="p-6 space-y-8">
      <div className="space-y-1">
        <LinearTitle gradient size="lg" as="h1">
          Welcome back, {user.name}
        </LinearTitle>
        <p className="text-slate-500 text-sm">
          Here&apos;s an overview of your account.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Campaigns", value: campaignCount.toLocaleString() },
          { label: "Templates", value: templateCount.toLocaleString() },
          { label: "Emails sent", value: totalSent.toLocaleString() },
          { label: "Open rate", value: openRate },
        ].map((stat) => (
          <LinearCard key={stat.label} padding="md" hover>
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">
                {stat.label}
              </p>
              <p className="text-3xl font-bold text-slate-100">{stat.value}</p>
            </div>
          </LinearCard>
        ))}
      </div>

      {/* Placeholder — replaced by F3 */}
      <LinearCard padding="lg" border="accent">
        <div className="flex flex-col items-center text-center py-8 gap-4">
          <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-blue-600/20 to-violet-600/20 border border-violet-500/20 flex items-center justify-center">
            <svg
              className="h-6 w-6 text-violet-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div className="space-y-1">
            <LinearTitle size="sm">Recent campaigns</LinearTitle>
            <p className="text-sm text-slate-500 max-w-sm">
              Campaign list and queue status widget coming in Stage F3.
            </p>
          </div>
          <LinearBadge variant="info">F3 — Coming soon</LinearBadge>
        </div>
      </LinearCard>
    </div>
  );
}
