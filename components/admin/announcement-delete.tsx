"use client";

import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { deleteAnnouncementAction } from "@/lib/actions/announcements";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function AnnouncementDelete({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      const result = await deleteAnnouncementAction(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Announcement deleted");
      setOpen(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Delete announcement" disabled={isPending} />}>
        <Trash2Icon className="size-3.5 text-destructive" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
          <AlertDialogDescription>“{title}” will be removed.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
