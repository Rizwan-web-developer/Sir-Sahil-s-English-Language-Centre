"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { useTransition } from "react";

import { Logo } from "@/components/brand/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { t } from "@/lib/i18n";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/lib/auth/actions";
import type { Profile } from "@/types/domain";

import { getStaffNav, isNavActive, type StaffArea } from "./nav-config";

type SidebarProps = {
  profile: Pick<Profile, "full_name" | "role" | "avatar_url">;
  area: StaffArea;
  areaLabel: string;
  logoUrl?: string | null;
  onNavigate?: () => void;
};

/**
 * Navy sidebar with grouped navigation. Rendered in the desktop grid and
 * re-used inside the mobile sheet.
 */
export function SidebarContent({
  profile,
  area,
  areaLabel: _areaLabel,
  logoUrl,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const groups = getStaffNav(profile.role, area);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center border-b border-sidebar-border px-5 py-5">
        <Link href="/" onClick={onNavigate} aria-label={t.app.name}>
          <Logo variant="onDark" logoUrl={logoUrl} />
        </Link>
      </div>

      <div className="px-4 pt-4" />

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {groups.map((group, index) => (
          <div key={group.label ?? index} className="space-y-1.5">
            {group.label && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = isNavActive(pathname, item);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-white/10 font-medium text-white shadow-sm ring-1 ring-white/10"
                      : "text-white/65 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      active ? "text-gold" : "text-white/45 group-hover:text-white/80",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                  {active && (
                    <span className="ml-auto size-1.5 rounded-full bg-gold" aria-hidden />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar className="size-8 ring-1 ring-white/15">
            {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.full_name} /> : null}
            <AvatarFallback className="bg-white/10 text-xs font-medium text-gold">
              {initials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {profile.full_name}
            </p>
            <p className="text-[11px] text-white/45">{t.roles[profile.role]}</p>
          </div>
          <button
            type="button"
            onClick={() => startTransition(() => void logoutAction())}
            disabled={isPending}
            aria-label={t.common.signOut}
            title={t.common.signOut}
            className="grid size-8 place-items-center rounded-md text-white/45 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <LogOutIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar(props: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-dvh shrink-0 border-r border-sidebar-border md:block">
      <SidebarContent {...props} />
    </aside>
  );
}
