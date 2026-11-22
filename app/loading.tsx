import { LoaderCircleIcon } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-16">
      <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <LoaderCircleIcon className="size-4 animate-spin text-primary" />
        Loading…
      </div>
    </div>
  );
}
