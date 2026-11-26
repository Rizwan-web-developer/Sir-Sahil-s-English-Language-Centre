"use client";

import { useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { deleteAnnouncementAction } from "@/lib/actions/announcements";
import { Button } from "@/components/ui/button";

export function AnnouncementDelete({ id, title }: { id: string; title: string }) {
  const [isPending, startTransition] = useTransition();

  function onDelete() {
    if (!confirm(`Delete announcement "${title}"?`)) return;
    startTransition(async () => {
      const result = await deleteAnnouncementAction(id);
      if (!result.ok) toast.error(result.error);
      else toast.success(result.message ?? "Announcement deleted");
    });
  }

  return (
    <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete announcement" onClick={onDelete} disabled={isPending}>
      <Trash2Icon className="size-3.5 text-destructive" />
    </Button>
  );
}
