import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { ServiceWorkerRegister } from "@/components/shared/sw-register";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSettings, settingString } from "@/lib/settings";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const name = settingString(settings, "platform_name", "") || "Sir Sahil's English Language Centre";
  const short = name.length > 28 ? "SELC" : name;
  const description = `${name} — admissions, batches, fees, attendance and course management.`;

  return {
    title: { default: name, template: `%s · ${short}` },
    description,
    applicationName: name,
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [{ url: "/api/icon" }],
      shortcut: ["/api/icon"],
      apple: [{ url: "/api/icon" }],
    },
    openGraph: { title: name, description, type: "website" },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fc" },
    { media: "(prefers-color-scheme: dark)", color: "#101b2b" },
  ],
};

// Authenticated SaaS app — all routes depend on session/cookies.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-dvh bg-background font-sans text-foreground">
        <ThemeProvider>
          <TooltipProvider delay={200}>
            {children}
            <ServiceWorkerRegister />
            <Toaster position="top-center" richColors closeButton />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
