import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { t } from "@/lib/i18n";
import { getSettings, settingString } from "@/lib/settings";
import type { Profile } from "@/types/domain";

import { PortalBottomNav } from "./portal-bottom-nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

/**
 * Mobile-first student shell. The bottom tab bar is the primary navigation;
 * desktop simply centres the same experience at a comfortable reading width.
 */
export async function PortalShell({
  profile,
  children,
}: {
  profile: Profile;
  children: ReactNode;
}) {
  const settings = await getSettings();
  const logoUrl = settingString(settings, "institute_logo_url", "") || null;
  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 w-full max-w-2xl items-center gap-2 px-4">
          <Logo size="sm" logoUrl={logoUrl} />
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <UserMenu profile={profile} accountHref="/portal/account" />
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-2xl px-4 pb-32 pt-5">
        {children}
      </main>

      <PortalBottomNav />

      <p className="sr-only">{t.areas.portal}</p>
    </div>
  );
}
