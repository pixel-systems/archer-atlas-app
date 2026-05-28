import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { SiteFooter, SiteHeader } from "@/components/layout/site-shell";

export const metadata: Metadata = {
  title: "Archer Atlas — SLZ portál",
  description:
    "Moderné rozhranie pre údaje Slovenského lukostreleckého zväzu: členovia, kluby, výsledky súťaží a ocenenia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sk"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
