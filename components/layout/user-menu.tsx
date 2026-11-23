"use client";

import { CheckIcon, ChevronDownIcon, LogOutIcon, UserRoundIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/lib/auth/actions";
import { initials } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { Profile } from "@/types/domain";

type UserMenuProps = {
  profile: Pick<Profile, "full_name" | "role" | "avatar_url">;
  accountHref: string;
};

export function UserMenu({ profile, accountHref }: UserMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.common.account}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-muted"
      >
        <Avatar size="sm" className="size-8">
          {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.full_name} /> : null}
          <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
            {initials(profile.full_name)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden text-left sm:block">
          <span className="block max-w-36 truncate text-xs font-medium leading-tight">
            {profile.full_name}
          </span>
          <span className="block text-[11px] leading-tight text-muted-foreground">
            {t.roles[profile.role]}
          </span>
        </span>
        <ChevronDownIcon className="hidden size-3.5 text-muted-foreground sm:block" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <span className="block truncate text-sm font-medium">{profile.full_name}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckIcon className="size-3 text-gold" />
              {t.roles[profile.role]}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2" onClick={() => router.push(accountHref)}>
          <UserRoundIcon className="size-4 text-muted-foreground" />
          {t.common.account}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-destructive data-highlighted:text-destructive"
          disabled={isPending}
          onClick={() => startTransition(() => { void logoutAction(); })}
        >
          <LogOutIcon className="size-4" />
          {t.common.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
