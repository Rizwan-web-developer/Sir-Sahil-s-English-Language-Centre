"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ClapperboardIcon, Loader2Icon, UploadIcon } from "lucide-react";

import { createAssignmentUploadUrlAction, submitAssignmentAction } from "@/lib/actions/portal-submissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SessionBadge } from "@/components/shared/session-badge";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { SessionType, SubmissionStatus } from "@/types/domain";

type Task = {
  assignment_id: string;
  title: string;
  instructions: string | null;
  session_type: SessionType;
  topic_name: string | null;
  level_name: string | null;
  submission: {
    id: string;
    status: SubmissionStatus;
    marks: number | null;
    feedback: string | null;
    video_key: string | null;
  } | null;
};

const BADGES: Record<SubmissionStatus, string> = {
  pending: "border-border bg-muted text-muted-foreground",
  submitted: "border-primary/25 bg-primary/8 text-primary",
  reviewed: "border-success/30 bg-success/10 text-success",
  needs_rework: "border-destructive/30 bg-destructive/10 text-destructive",
  late: "border-gold/40 bg-gold/10 text-gold-foreground dark:text-gold",
  resubmit_requested: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function AssignmentTaskCard({ task }: { task: Task }) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const canUpload = !task.submission || !["reviewed"].includes(task.submission.status);

  function upload() {
    if (!file) return toast.error("Choose a video file first.");
    startTransition(async () => {
      try {
        const presign = await createAssignmentUploadUrlAction({
          assignment_id: task.assignment_id,
          file_name: file.name,
          content_type: file.type || "video/mp4",
          size_bytes: file.size,
        });
        if (!presign.ok) { toast.error(presign.error); return; }

        setProgress(0);
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", presign.data.uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.send(file);
        });

        const submit = await submitAssignmentAction({ assignment_id: task.assignment_id, video_key: presign.data.key, text_answer: note || null });
        if (!submit.ok) { toast.error(submit.error); return; }
        toast.success(submit.message ?? "Submitted");
        setFile(null);
        setNote("");
        setProgress(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
        setProgress(null);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-sm">{task.title}</CardTitle>
            <CardDescription className="mt-1">{task.level_name ?? "Level"}{task.topic_name ? ` · ${task.topic_name}` : ""}</CardDescription>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <SessionBadge type={task.session_type} showDot={false} className="h-5 px-1.5 text-[10px]" />
            <Badge variant="outline" className={cn("h-5 text-[10px]", BADGES[task.submission?.status ?? "pending"])}>
              {t.submissionStatus[task.submission?.status ?? "pending"]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {task.instructions && <p className="text-xs leading-relaxed text-muted-foreground">{task.instructions}</p>}
        {task.submission?.marks !== null && task.submission?.marks !== undefined && (
          <p className="text-sm font-medium">Marks: {task.submission.marks}/100</p>
        )}
        {task.submission?.feedback && (
          <div className="rounded-lg border border-gold/25 bg-gold/5 p-3 text-xs"><p className="font-medium mb-1">Feedback</p>{task.submission.feedback}</div>
        )}

        {canUpload ? (
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-xs font-medium flex items-center gap-2"><ClapperboardIcon className="size-3.5" />{task.submission ? "Replace submission" : "Submit video"}</p>
            <Input type="file" accept="video/mp4,video/quicktime,video/webm,video/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional text answer / notes" />
            {progress !== null && <div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>}
            <Button size="sm" onClick={upload} disabled={isPending || !file}>
              {isPending ? <Loader2Icon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
              {isPending ? "Uploading..." : "Upload & submit"}
            </Button>
            <p className="text-[11px] text-muted-foreground">MP4/MOV/WEBM, max 200MB. You can replace until reviewed.</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Reviewed submissions cannot be replaced.</p>
        )}
      </CardContent>
    </Card>
  );
}
