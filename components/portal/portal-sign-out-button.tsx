"use client";

import { LogOutIcon } from "lucide-react";
import { useTransition } from "react";

import { logoutAction } from "@/lib/auth/actions";
import { t } from "@/lib/i18n";

export function PortalSignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => void logoutAction())}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-60"
    >
      <span className="grid size-9 place-items-center rounded-lg bg-destructive/10">
        <LogOutIcon className="size-4" />
      </span>
      <span className="font-medium">
        {isPending ? "Signing out…" : t.common.signOut}
      </span>
    </button>
  );
}
