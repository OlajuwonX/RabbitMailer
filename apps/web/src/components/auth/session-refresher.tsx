"use client";

import { useEffect, useRef } from "react";
import { refreshSessionAction } from "@/app/actions/auth";

// Proactively renews the 15-min session JWT; on failure forces a hard reload to /login.
const REFRESH_BUFFER_SECONDS = 120; // refresh when < 2 min remain
const CHECK_INTERVAL_MS = 30_000; // check every 30 seconds

function readSessionExp(): number | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)session_exp=(\d+)/);
  return m?.[1] ? parseInt(m[1], 10) : null;
}

export function SessionRefresher() {
  const isRefreshing = useRef(false);

  useEffect(() => {
    async function tryRefresh() {
      if (isRefreshing.current) return;
      const exp = readSessionExp();
      if (!exp) return;
      if (exp - Math.floor(Date.now() / 1000) > REFRESH_BUFFER_SECONDS) return;

      isRefreshing.current = true;
      try {
        const result = await refreshSessionAction();
        if (!result.success) {
          // Hard reload clears all React + Zustand in-memory state cleanly.
          window.location.replace("/login");
        }
      } finally {
        isRefreshing.current = false;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") tryRefresh();
    }

    tryRefresh();
    const interval = setInterval(tryRefresh, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
