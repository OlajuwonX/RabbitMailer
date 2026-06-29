import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { logoutAction } from "@/app/actions/auth";
import {
  LinearCard,
  LinearTitle,
  LinearButton,
  LinearBadge,
} from "@/components/ui/linear";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/7 bg-white/2 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/rabbitmailer.png"
              alt="RabbitMailer"
              width={24}
              height={24}
            />
            <span className="text-sm font-semibold text-slate-100">
              RabbitMailer
            </span>
          </div>

          <div className="flex items-center gap-3">
            <LinearBadge variant="info">{user.email}</LinearBadge>
            <form action={logoutAction}>
              <LinearButton type="submit" variant="ghost" size="sm">
                Sign out
              </LinearButton>
            </form>
          </div>
        </div>
      </header>

      {/* Page */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="space-y-1">
          <LinearTitle gradient size="lg" as="h1">
            Welcome back, {user.name}
          </LinearTitle>
          <p className="text-slate-500 text-sm">
            Here&apos;s an overview of your account.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total campaigns", value: "—", badge: "Soon" },
            { label: "Emails sent", value: "—", badge: "Soon" },
            { label: "Open rate", value: "—", badge: "Soon" },
          ].map((stat) => (
            <LinearCard key={stat.label} padding="md" hover>
              <div className="space-y-3">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold text-slate-100">
                  {stat.value}
                </p>
                <LinearBadge>{stat.badge}</LinearBadge>
              </div>
            </LinearCard>
          ))}
        </div>

        {/* Placeholder content card */}
        <LinearCard padding="lg" border="accent" glow>
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
              <LinearTitle size="sm">
                Campaign management coming in Stage 3
              </LinearTitle>
              <p className="text-sm text-slate-500 max-w-sm">
                The queue system, SMTP setup, and campaign builder will be added
                in the next stage.
              </p>
            </div>
          </div>
        </LinearCard>
      </main>
    </div>
  );
}
