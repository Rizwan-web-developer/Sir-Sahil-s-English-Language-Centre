"use client";

import Link from "next/link";
import { useTransition } from "react";
import { EyeIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { deleteBatchAction } from "@/lib/actions/batches";
import { Button } from "@/components/ui/button";

export function BatchRowActions({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  function onDelete() {
    if (!confirm(`Delete batch "${name}"? Its schedule, enrollments and attendance will be removed.`)) return;
    startTransition(async () => {
      const result = await deleteBatchAction(id);
      if (result && !result.ok) toast.error(result.error);
      else toast.success(result.message ?? "Batch deleted");
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
      <Button variant="ghost" size="icon-sm" aria-label="Delete" onClick={onDelete} disabled={isPending}>
        <Trash2Icon className="size-4 text-destructive" />
      </Button>
    </div>
  );
}
