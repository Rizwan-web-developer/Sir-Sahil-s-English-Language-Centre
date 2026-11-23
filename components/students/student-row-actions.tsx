"use client";

import Link from "next/link";
import { useTransition } from "react";
import { EyeIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { archiveStudentAction } from "@/lib/actions/students";
import { Button } from "@/components/ui/button";

export function StudentRowActions({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  function onDelete() {
    if (!confirm(`Delete ${name}? This will archive the student.`)) return;
    startTransition(async () => {
      const result = await archiveStudentAction(id);
      if (result && !result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="flex justify-end gap-1">
      <Button nativeButton={false} variant="ghost" size="icon-sm" aria-label="Details" render={<Link href={`/admin/students/${id}`} />}>
        <EyeIcon className="size-4" />
      </Button>
      <Button nativeButton={false} variant="ghost" size="icon-sm" aria-label="Edit" render={<Link href={`/admin/students/${id}/edit`} />}>
        <PencilIcon className="size-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Delete" onClick={onDelete} disabled={isPending}>
        <Trash2Icon className="size-4 text-destructive" />
      </Button>
    </div>
  );
}
