import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { SessionRefresher } from "@/components/auth/session-refresher";

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
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-(family-name:--font-geist-sans)`}
      >
        <SessionRefresher />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#ffffff",
              color: "#0f172a",
              borderRadius: "10px",
              boxShadow:
                "0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
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
        {children}
      </body>
    </html>
  );
}
