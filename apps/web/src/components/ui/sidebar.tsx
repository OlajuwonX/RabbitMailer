"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Mail,
  FileText,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUiStore } from "@/lib/store/ui-store";
import { logoutAction } from "@/app/actions/auth";

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", Icon: Mail },
  { href: "/templates", label: "Templates", Icon: FileText },
  { href: "/analytics", label: "Analytics", Icon: BarChart2 },
  { href: "/settings", label: "Settings", Icon: Settings },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  user: { name: string; email: string };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUiStore();

  // Set initial state based on viewport — open on desktop, closed on mobile.
  // Runs once on mount so SSR is unaffected.
  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 768);
  }, [setSidebarOpen]);

  return (
    <>
      {/* Mobile backdrop — tap to close */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          // Mobile: fixed overlay; Desktop: sticky in the flex row
          "fixed inset-y-0 left-0 z-40",
          "md:static md:z-auto md:inset-auto",
          // Width
          sidebarOpen ? "w-60" : "w-14",
          // Hide on mobile when closed
          !sidebarOpen && "hidden md:flex",
          // Layout
          "flex flex-col h-screen shrink-0",
          // Appearance
          "border-r border-white/7 bg-[#07070f]/95 backdrop-blur-2xl",
          "transition-[width] duration-200",
        )}
      >
        {/* Logo row */}
        <div className="flex items-center h-14 px-3 gap-2.5 border-b border-white/7 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/rabbitmailer.png"
            alt="RabbitMailer"
            className="w-6 h-6 rounded-md shrink-0 object-contain"
          />
          {sidebarOpen && (
            <span className="text-sm font-semibold text-slate-100 truncate">
              RabbitMailer
            </span>
          )}
        </div>

        {/* Nav links */}
        <nav
          aria-label="Main navigation"
          className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto"
        >
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center rounded-lg h-9 px-2 gap-2.5",
                  "text-sm font-medium transition-all duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60",
                  active
                    ? "bg-violet-500/15 text-violet-300"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
                )}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden />
                {sidebarOpen && (
                  <span className="truncate">{label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: user info + logout + collapse toggle */}
        <div className="shrink-0 border-t border-white/7 p-2 space-y-1">
          {sidebarOpen && (
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-slate-200 truncate">
                {user.name}
              </p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          )}

          <form action={logoutAction}>
            <button
              type="submit"
              className={cn(
                "flex items-center w-full rounded-lg h-9 px-2 gap-2.5",
                "text-sm font-medium transition-all duration-150",
                "text-slate-400 hover:text-red-400 hover:bg-red-500/8",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60",
                !sidebarOpen && "justify-center",
              )}
            >
              <LogOut className="w-4 h-4 shrink-0" aria-hidden />
              {sidebarOpen && <span>Sign out</span>}
            </button>
          </form>

          <button
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className={cn(
              "flex items-center w-full rounded-lg h-9 px-2 gap-2.5",
              "text-xs font-medium transition-all duration-150",
              "text-slate-600 hover:text-slate-300 hover:bg-white/5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60",
              !sidebarOpen && "justify-center",
            )}
          >
            {sidebarOpen ? (
              <>
                <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden />
                <span>Collapse</span>
              </>
            ) : (
              <ChevronRight className="w-4 h-4" aria-hidden />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
