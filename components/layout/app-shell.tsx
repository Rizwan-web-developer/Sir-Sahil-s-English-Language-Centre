import type { ReactNode } from "react";

import { t } from "@/lib/i18n";
import { getSettings, settingString } from "@/lib/settings";
import type { Profile } from "@/types/domain";

import { AppSidebar } from "./app-sidebar";
import { AttendanceCenter } from "@/components/attendance/attendance-center";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import type { StaffArea } from "./nav-config";
import { Topbar } from "./topbar";

type StaffShellProps = {
  profile: Profile;
  area: StaffArea;
  children: ReactNode;
};

/**
 * Responsive shell shared by /admin (owner + reception) and /owner (owner).
 * Desktop: navy sidebar + topbar. Mobile: topbar + slide-over navigation.
 */
export async function StaffShell({ profile, area, children }: StaffShellProps) {
  const areaLabel = t.areas[area];
  const settings = await getSettings();
  const instituteLogo = settingString(settings, "institute_logo_url", "");
  const platformLogo = settingString(settings, "platform_logo_url", "") || instituteLogo;
  const platformName =
    settingString(settings, "platform_name", "") ||
    settingString(settings, "institute_short_name", "") ||
    t.app.shortName;
  const logoUrl = platformLogo || null;
  const accountHref = area === "admin" ? "/admin/settings" : "/owner/account";
  const accountLabel = area === "admin" ? "Settings" : undefined;

  return (
    <div className="min-h-dvh bg-background md:grid md:grid-cols-[17rem_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <AppSidebar
        profile={profile}
        area={area}
        areaLabel={areaLabel}
        logoUrl={logoUrl}
        platformName={platformName}
      />

      <AttendanceCenter area={area} />
      <AutoRefresh intervalMs={120000} />

      <div className="flex min-h-dvh min-w-0 flex-col">
        <Topbar
          profile={profile}
          area={area}
          areaLabel={areaLabel}
          logoUrl={logoUrl}
          platformName={platformName}
          accountHref={accountHref}
          accountLabel={accountLabel}
        />

        <main id="main-content" className="flex-1">
          <div className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>

        <footer className="mt-auto border-t px-4 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-1 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} {platformName}
            </p>
            <p>
              {t.app.timezone} · PKR · Week starts Monday
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
