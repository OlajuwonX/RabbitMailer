"use client";

import { useEffect } from "react";

// Applies the stored theme preference to <html> on mount only.
// The server always renders class="dark"; suppressHydrationMismatch on <html>
// silences the one-time mismatch when a user has chosen "light".
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem("theme") ?? "dark";
    document.documentElement.classList.toggle("dark", stored !== "light");
  }, []);

  return <>{children}</>;
}
