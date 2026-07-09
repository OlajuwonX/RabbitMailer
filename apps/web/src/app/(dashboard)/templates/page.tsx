import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { LinearCard, LinearTitle, LinearBadge } from "@/components/ui/linear";

export const metadata = { title: "Templates — RabbitMailer" };

export default async function TemplatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const prisma = await getPrisma();

  // B4.2: direct Prisma read — no API route. Always select only needed fields; always scope to userId in addition to tenantId ($extends) for defense in depth.
  const templates = await prisma.template.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      subject: true,
      usageCount: true,
      openCount: true,
      clickCount: true,
      lastUsed: true,
      createdAt: true,
    },
  });

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <LinearTitle gradient size="lg" as="h1">
            Templates
          </LinearTitle>
          <p className="text-slate-500 text-sm">
            {templates.length === 0
              ? "Create your first email template to get started."
              : `${templates.length} template${templates.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {templates.length === 0 ? (
        <LinearCard padding="lg" border="accent">
          <div className="flex flex-col items-center text-center py-12 gap-4">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <LinearTitle size="sm">No templates yet</LinearTitle>
              <p className="text-sm text-slate-500 max-w-sm">
                Templates hold your email subject and HTML body. Create one to
                use it in a campaign.
              </p>
            </div>
          </div>
        </LinearCard>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {templates.map((t) => (
            <LinearCard key={t.id} padding="md" hover>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-slate-100 truncate">
                    {t.subject.length > 80
                      ? t.subject.slice(0, 80) + "…"
                      : t.subject}
                  </p>
                  {t.name !== t.subject && (
                    <p className="text-xs text-slate-500 truncate">{t.name}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <LinearBadge variant="info">{t.usageCount} sent</LinearBadge>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                <span>
                  Opens:{" "}
                  {t.usageCount > 0
                    ? `${Math.round((t.openCount / t.usageCount) * 100)}%`
                    : "—"}
                </span>
                <span>
                  Clicks:{" "}
                  {t.usageCount > 0
                    ? `${Math.round((t.clickCount / t.usageCount) * 100)}%`
                    : "—"}
                </span>
                <span>
                  {t.lastUsed
                    ? `Last used ${formatRelative(t.lastUsed)}`
                    : `Created ${formatRelative(t.createdAt)}`}
                </span>
              </div>
            </LinearCard>
          ))}
        </div>
      )}
    </main>
  );
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}
