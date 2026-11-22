"use client";

import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="max-w-md space-y-5 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/15">
          <AlertTriangleIcon className="size-7" />
        </span>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Something went wrong
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            We couldn&apos;t load this page
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The error has been logged in the browser console. Try again — if it
            keeps happening, check your Supabase connection and environment
            variables.
          </p>
        </div>
        <Button onClick={reset} className="gap-2">
          <RefreshCwIcon className="size-4" />
          Try again
        </Button>
        {error.digest && (
          <p className="font-mono text-[10px] text-muted-foreground">
            Digest: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
