import Link from "next/link";
import { ArrowLeftIcon, CompassIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="max-w-md space-y-5 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <CompassIcon className="size-7" />
        </span>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            404
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            This page isn&apos;t here
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The link may be old, or the page moved during setup. Head back and
            use the navigation.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/" />}
          className="gap-2"
        >
          <ArrowLeftIcon className="size-4" />
          Go home
        </Button>
        <p className="text-[11px] text-muted-foreground">{t.app.name}</p>
      </div>
    </main>
  );
}
