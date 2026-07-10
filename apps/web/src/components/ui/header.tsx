"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useUiStore } from "@/lib/store/ui-store";

// ─── Page title map ───────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/campaigns": "Campaigns",
  "/templates": "Templates",
  "/analytics": "Analytics",
  "/settings": "Settings",
};

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [prefix, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(prefix + "/")) return title;
  }
  return "RabbitMailer";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Header() {
  const pathname = usePathname();
  const { toggleSidebar } = useUiStore();
  // Recompute only when the route changes, not on unrelated store updates.
  const title = useMemo(() => getTitle(pathname), [pathname]);

  return (
    <header className="sticky top-0 z-20 flex items-center h-14 px-4 gap-3 border-b border-white/7 bg-[#07070f]/80 backdrop-blur-2xl shrink-0">
      {/* Hamburger — mobile only */}
      <button
        onClick={toggleSidebar}
        aria-label="Toggle navigation"
        className="flex md:hidden items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
      >
        <Menu className="w-4 h-4" aria-hidden />
      </button>

      <h1 className="text-sm font-semibold text-slate-200">{title}</h1>
    </header>
  );
}
