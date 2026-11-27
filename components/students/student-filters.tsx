"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { useTransition } from "react";

// Button not needed; filters auto-apply.
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  batches: Array<{ id: string; name: string }>;
};

export function StudentFilters({ batches }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    next.delete("page");
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="relative flex-1">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          defaultValue={sp.get("q") ?? ""}
          placeholder="Search name, WhatsApp, ID..."
          className="pl-9"
          onKeyDown={(e) => {
            if (e.key === "Enter") update("q", (e.currentTarget as HTMLInputElement).value);
          }}
          onBlur={(e) => update("q", e.currentTarget.value)}
        />
      </div>
      <Select value={sp.get("status") ?? "all"} onValueChange={(v) => update("status", v ?? "all")}>
        <SelectTrigger className="w-full md:w-44">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="frozen">Frozen</SelectItem>
          <SelectItem value="left">Left</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sp.get("batch") ?? "all"} onValueChange={(v) => update("batch", v ?? "all")}>
        <SelectTrigger className="w-full md:w-52">
          <SelectValue placeholder="Batch" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All batches</SelectItem>
          {batches.map((b) => (
            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && <span className="text-xs text-muted-foreground">Loading...</span>}
    </div>
  );
}
