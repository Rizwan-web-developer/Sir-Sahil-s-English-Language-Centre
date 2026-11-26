"use client";

import { MenuIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { t } from "@/lib/i18n";
import type { Profile } from "@/types/domain";

import { SidebarContent } from "./app-sidebar";
import { findNavTitle, getStaffNav, type StaffArea } from "./nav-config";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

type TopbarProps = {
  profile: Pick<Profile, "full_name" | "role" | "avatar_url">;
  area: StaffArea;
  areaLabel: string;
  logoUrl?: string | null;
  platformName?: string | null;
  accountHref: string;
  accountLabel?: string;
};

export function Topbar({ profile, area, areaLabel, logoUrl, platformName, accountHref, accountLabel }: TopbarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = getStaffNav(profile.role, area);
  const title = findNavTitle(pathname, groups) ?? areaLabel;

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label={t.common.openMenu}
            />
          }
        >
          <MenuIcon className="size-5" />
        </SheetTrigger>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[18rem] gap-0 border-r-0 p-0 sm:max-w-none"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{areaLabel}</SheetTitle>
            <SheetDescription>{t.common.openMenu}</SheetDescription>
          </SheetHeader>
          <div className="h-full">
            <SidebarContent
              profile={profile}
              area={area}
              areaLabel={areaLabel}
              logoUrl={logoUrl}
              platformName={platformName}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold sm:text-base">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{areaLabel}</p>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        <UserMenu profile={profile} accountHref={accountHref} menuLabel={accountLabel} />
      </div>
    </header>
  );
}
