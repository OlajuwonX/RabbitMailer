import { getPrisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import type {
  AnalyticsSummary,
  DailyStat,
  TopSubject,
} from "@repo/shared-types";

// Data fetching

async function getAnalytics(): Promise<{
  summary: AnalyticsSummary;
  daily: DailyStat[];
  topSubjects: TopSubject[];
}> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // For $queryRaw the $extends bypass is intentional — use tenantId from session. Reading the header directly is an alternative but the session is already loaded.
  const tenantId = user.tenantId;
  const prisma = await getPrisma();

  // 1. Summary KPIs — Prisma count() picks up tenantId via $extends
  const [totalSent, totalOpens, totalClicks, totalBounces] = await Promise.all([
    prisma.recipient.count({ where: { status: { not: "pending" } } }),
    prisma.recipient.count({ where: { openedAt: { not: null } } }),
    prisma.recipient.count({ where: { clickedAt: { not: null } } }),
    prisma.recipient.count({ where: { status: "bounced" } }),
  ]);

  const summary: AnalyticsSummary = {
    totalSent,
    totalOpens,
    totalClicks,
    totalBounces,
    openRate: totalSent > 0 ? totalOpens / totalSent : 0,
    clickRate: totalSent > 0 ? totalClicks / totalSent : 0,
    bounceRate: totalSent > 0 ? totalBounces / totalSent : 0,
  };

  // 2. Daily stats — last 30 days, grouped by send date  $queryRaw bypasses $extends so tenantId is passed explicitly.
  // DATE() truncates to day in the DB's local timezone.
  const dailyRows = await prisma.$queryRaw<
    Array<{
      date: string;
      sent: number;
      opens: number;
      clicks: number;
      bounces: number;
    }>
  >`
    SELECT
      DATE("sentAt")::text                                           AS date,
      COUNT(*) FILTER (WHERE status != 'pending')::int              AS sent,
      COUNT(*) FILTER (WHERE "openedAt" IS NOT NULL)::int           AS opens,
      COUNT(*) FILTER (WHERE "clickedAt" IS NOT NULL)::int          AS clicks,
      COUNT(*) FILTER (WHERE status = 'bounced'::"RecipientStatus")::int AS bounces
    FROM "Recipient"
    WHERE "tenantId" = ${tenantId}
      AND "sentAt" >= NOW() - INTERVAL '30 days'
    GROUP BY DATE("sentAt")
    ORDER BY date ASC
  `;

  const daily: DailyStat[] = dailyRows.map((r) => ({
    date: r.date,
    sent: Number(r.sent),
    opens: Number(r.opens),
    clicks: Number(r.clicks),
    bounces: Number(r.bounces),
  }));

  // 3. Top subjects by open rate — templates with actual usage
  const topRows = await prisma.$queryRaw<
    Array<{
      subject: string;
      templateId: string;
      sent: number;
      openRate: number;
      clickRate: number;
    }>
  >`
    SELECT
      t.subject,
      t.id                                                                             AS "templateId",
      t."usageCount"                                                                   AS sent,
      CASE WHEN t."usageCount" > 0 THEN t."openCount"::float / t."usageCount" ELSE 0 END AS "openRate",
      CASE WHEN t."usageCount" > 0 THEN t."clickCount"::float / t."usageCount" ELSE 0 END AS "clickRate"
    FROM "Template" t
    WHERE t."tenantId" = ${tenantId}
      AND t."usageCount" > 0
    ORDER BY "openRate" DESC
    LIMIT 10
  `;

  const topSubjects: TopSubject[] = topRows.map((r) => ({
    subject: r.subject,
    templateId: r.templateId,
    sent: Number(r.sent),
    openRate: Number(r.openRate),
    clickRate: Number(r.clickRate),
  }));

  return { summary, daily, topSubjects };
}

// Formatters

function pct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

// Page

export default async function AnalyticsPage() {
  const { summary, daily, topSubjects } = await getAnalytics();

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Analytics</h1>

      {/* KPI summary — replaced by F6.1 KPI cards */}
      <section aria-label="Summary KPIs">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Sent" value={summary.totalSent.toLocaleString()} />
          <KpiCard
            label="Open rate"
            value={pct(summary.openRate)}
            sub={summary.totalOpens.toLocaleString() + " opens"}
          />
          <KpiCard
            label="Click rate"
            value={pct(summary.clickRate)}
            sub={summary.totalClicks.toLocaleString() + " clicks"}
          />
          <KpiCard
            label="Bounce rate"
            value={pct(summary.bounceRate)}
            sub={summary.totalBounces.toLocaleString() + " bounces"}
          />
        </div>
      </section>

      {/* Daily trend — replaced by F6.2 line chart */}
      <section aria-label="Daily stats (last 30 days)">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Last 30 days
        </h2>
        {daily.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Sent</th>
                  <th className="py-2 pr-4 font-medium">Opens</th>
                  <th className="py-2 pr-4 font-medium">Clicks</th>
                  <th className="py-2 font-medium">Bounces</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((row) => (
                  <tr key={row.date} className="border-b last:border-0">
                    <td className="py-2 pr-4">{row.date}</td>
                    <td className="py-2 pr-4">{row.sent}</td>
                    <td className="py-2 pr-4">{row.opens}</td>
                    <td className="py-2 pr-4">{row.clicks}</td>
                    <td className="py-2">{row.bounces}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Top subjects — replaced by F6.4 bar chart */}
      <section aria-label="Top subjects by open rate">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Top subjects
        </h2>
        {topSubjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Subject</th>
                  <th className="py-2 pr-4 font-medium">Sent</th>
                  <th className="py-2 pr-4 font-medium">Open rate</th>
                  <th className="py-2 font-medium">Click rate</th>
                </tr>
              </thead>
              <tbody>
                {topSubjects.map((row) => (
                  <tr key={row.templateId} className="border-b last:border-0">
                    <td className="py-2 pr-4 max-w-xs truncate">
                      {row.subject}
                    </td>
                    <td className="py-2 pr-4">{row.sent}</td>
                    <td className="py-2 pr-4">{pct(row.openRate)}</td>
                    <td className="py-2">{pct(row.clickRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// KPI card — placeholder until F6.1 KpiCard component is built

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
