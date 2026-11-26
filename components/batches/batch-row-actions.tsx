"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { EyeIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { deleteBatchAction } from "@/lib/actions/batches";
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

export function BatchRowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      const result = await deleteBatchAction(id);
      if (result && !result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Batch deleted");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex justify-end gap-1">
      <Button nativeButton={false} variant="ghost" size="icon-sm" aria-label="Details" render={<Link href={`/admin/batches/${id}`} />}>
        <EyeIcon className="size-4" />
      </Button>
      <Button nativeButton={false} variant="ghost" size="icon-sm" aria-label="Edit" render={<Link href={`/admin/batches/${id}/edit`} />}>
        <PencilIcon className="size-4" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Delete" disabled={isPending} />}>
          <Trash2Icon className="size-4 text-destructive" />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete batch?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete “{name}”? Its schedule, enrollments and attendance will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={isPending}>
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
