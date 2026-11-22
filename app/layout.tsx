import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { ServiceWorkerRegister } from "@/components/shared/sw-register";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_NAME, APP_SHORT_NAME } from "@/lib/constants";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Management Platform`,
    template: `%s · ${APP_SHORT_NAME}`,
  },
  description:
    "Admissions, timetable, fees, barcode attendance, curriculum progress and certificates for Sir Sahil's English Language Centre.",
  applicationName: `${APP_SHORT_NAME} Management Platform`,
  manifest: "/manifest.webmanifest",
  authors: [{ name: APP_NAME }],
  openGraph: {
    title: APP_NAME,
    description:
      "One calm workspace for admissions, attendance, fees and English course progress.",
    type: "website",
  },
};

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
