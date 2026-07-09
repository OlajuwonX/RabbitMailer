"use client";

import dynamic from "next/dynamic";

// ssr:false — react-hot-toast accesses browser APIs during render; never run on the server.
const Toaster = dynamic(
  () => import("react-hot-toast").then((m) => ({ default: m.Toaster })),
  { ssr: false },
);

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "#ffffff",
          color: "#0f172a",
          borderRadius: "10px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
          fontSize: "14px",
          fontFamily: "var(--font-geist-sans)",
          padding: "12px 16px",
        },
        success: {
          duration: 3000,
          iconTheme: { primary: "#7c3aed", secondary: "#ffffff" },
        },
        error: {
          duration: 4000,
          iconTheme: { primary: "#ef4444", secondary: "#ffffff" },
        },
      }}
    />
  );
}
