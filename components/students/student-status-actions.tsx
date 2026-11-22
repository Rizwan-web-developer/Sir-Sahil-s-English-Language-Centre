"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { archiveStudentAction, setStudentStatusAction } from "@/lib/actions/students";
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

export function StudentStatusActions({ id, status }: { id: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  function setStatus(next: "active" | "frozen" | "left" | "completed") {
    startTransition(async () => {
      const result = await setStudentStatusAction({ id, status: next });
      if (!result.ok) toast.error(result.error);
      else toast.success(result.message ?? "Updated");
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "active" && <Button size="sm" variant="outline" disabled={isPending} onClick={() => setStatus("active")}>Reactivate</Button>}
      {status !== "frozen" && <Button size="sm" variant="outline" disabled={isPending} onClick={() => setStatus("frozen")}>Freeze</Button>}
      {status !== "left" && <Button size="sm" variant="outline" disabled={isPending} onClick={() => setStatus("left")}>Mark left</Button>}
      <AlertDialog>
        <AlertDialogTrigger render={<Button size="sm" variant="destructive" disabled={isPending} />}>Archive</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive student?</AlertDialogTitle>
            <AlertDialogDescription>This will soft-delete the student from active lists. Records remain in the database for audit purposes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => startTransition(async () => { const r = await archiveStudentAction(id); if (r && !r.ok) toast.error(r.error); })}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
