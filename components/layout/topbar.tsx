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
import { findNavTitle, type NavGroup } from "./nav-config";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

type TopbarProps = {
  profile: Pick<Profile, "full_name" | "role">;
  groups: NavGroup[];
  areaLabel: string;
  accountHref: string;
  switchHref?: string;
  switchLabel?: string;
};

export function Topbar({
  profile,
  groups,
  areaLabel,
  accountHref,
  switchHref,
  switchLabel,
}: TopbarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const title = findNavTitle(pathname, groups) ?? areaLabel;

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6 lg:px-8">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              aria-label={t.common.openMenu}
            />
          }
        >
          <MenuIcon />
        </SheetTrigger>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[17.5rem] gap-0 p-0 sm:max-w-[17.5rem]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{areaLabel}</SheetTitle>
            <SheetDescription>{t.app.name}</SheetDescription>
          </SheetHeader>
          <div className="h-full overflow-hidden">
            <SidebarContent
              profile={profile}
              groups={groups}
              areaLabel={areaLabel}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {areaLabel}
        </p>
        <p className="truncate text-sm font-medium leading-tight">{title}</p>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        <UserMenu
          profile={profile}
          accountHref={accountHref}
          switchHref={switchHref}
          switchLabel={switchLabel}
        />
      </div>
    </header>
  );
}
