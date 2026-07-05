"use client";

import { useEffect, useRef } from "react";
import { refreshSessionAction } from "@/app/actions/auth";

// Proactively refresh the 15-min session JWT before it expires.
// Reads the non-httponly `session_exp` cookie (a plain Unix timestamp, no sensitive data)
// to know when to act. Calls refreshSessionAction; on failure routes to /login.

const REFRESH_BUFFER_SECONDS = 120; // Trigger refresh when < 2 min remain
const CHECK_INTERVAL_MS = 30_000; // Poll every 30 seconds

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
      // Read the _csrf non-httponly cookie so middleware can validate the token
      const csrfToken =
        document.cookie.match(/(?:^|;\s*)_csrf=([^;]+)/)?.[1] ?? "";
      try {
        const result = await refreshSessionAction(csrfToken);
        if (!result.success) {
          // Hard reload — tears down React state and clears Zustand store in memory
          window.location.replace("/login");
        }
      } finally {
        isRefreshing.current = false;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") tryRefresh();
    }

    // Check immediately on mount, then on interval and tab focus
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
