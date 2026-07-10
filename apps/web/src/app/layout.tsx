import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SessionRefresher } from "@/components/auth/session-refresher";
import { ToastProvider } from "@/components/providers/toast-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  display: "swap",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RabbitMailer",
  description: "Bulk email, simplified.",
  icons: {
    icon: "/rabbitmailer.png",
    shortcut: "/rabbitmailer.png",
    apple: "/rabbitmailer.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: ThemeProvider may change className on the client
    // (dark → light) — suppress the one-time SSR/hydration diff.
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-(family-name:--font-geist-sans)`}
      >
        <QueryProvider>
          <ThemeProvider>
            <SessionRefresher />
            <ToastProvider />
            {children}
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
