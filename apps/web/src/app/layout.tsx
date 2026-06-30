import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
