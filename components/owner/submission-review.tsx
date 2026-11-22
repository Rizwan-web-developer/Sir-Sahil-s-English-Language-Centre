"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { reviewSubmissionAction } from "@/lib/actions/submissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Row = Record<string, unknown>;

export function SubmissionReview({ submissions, currentStatus }: { submissions: Row[]; currentStatus: string }) {
  const [selectedId, setSelectedId] = useState<string>(String(submissions[0]?.id ?? ""));
  const [marks, setMarks] = useState<string>("");
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  const selected = submissions.find((s) => String(s.id) === selectedId) ?? submissions[0];
  const student = selected?.student as Row | null;
  const assignment = selected?.assignment as Row | null;
  const level = selected?.level as Row | null;

  function submit(status: "reviewed" | "resubmit_requested") {
    if (!selected) return;
    startTransition(async () => {
      const res = await reviewSubmissionAction({
        id: String(selected.id),
        marks: Number(marks || 0),
        feedback,
        status,
      });
      if (!res.ok) toast.error(res.error);
      else { toast.success(res.message ?? "Saved"); setMarks(""); setFeedback(""); }
    });
  }

  const statuses = ["submitted", "reviewed", "resubmit_requested", "pending", "all"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <Button key={s} nativeButton={false} variant={currentStatus === s ? "default" : "outline"} size="sm" render={<Link href={`/owner/assignments?status=${s}`} />} className="capitalize">
            {s.replace("_", " ")}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader><CardTitle>Queue ({submissions.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[560px] overflow-auto">
            {submissions.length === 0 ? <p className="text-sm text-muted-foreground">No submissions in this filter.</p> : submissions.map((s) => {
              const st = s.student as Row | null;
              const asg = s.assignment as Row | null;
              return (
                <button key={String(s.id)} type="button" onClick={() => { setSelectedId(String(s.id)); setMarks(String(s.marks ?? "")); setFeedback(String(s.feedback ?? "")); }} className={`w-full rounded-lg border p-3 text-left text-sm ${String(s.id) === String(selected?.id) ? "border-primary bg-primary/5" : ""}`}>
                  <div className="flex items-center justify-between gap-2"><span className="font-medium">{String(st?.full_name ?? "Student")}</span><Badge variant="outline" className="capitalize">{String(s.status)}</Badge></div>
                  <p className="text-xs text-muted-foreground">{String(asg?.title ?? "Assignment")}</p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Review</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {!selected ? <p className="text-sm text-muted-foreground">Select a submission.</p> : (
              <>
                <div className="rounded-lg border bg-muted/20 p-3 text-sm space-y-1">
                  <p><span className="text-muted-foreground">Student:</span> {String(student?.full_name ?? "—")} ({String(student?.student_code ?? "")})</p>
                  <p><span className="text-muted-foreground">Assignment:</span> {String(assignment?.title ?? "—")}</p>
                  <p><span className="text-muted-foreground">Level:</span> {String(level?.name ?? "—")}</p>
                  <p><span className="text-muted-foreground">Status:</span> <span className="capitalize">{String(selected.status)}</span></p>
                  {selected.video_key ? <p className="text-xs text-muted-foreground">Video key: {String(selected.video_key)}</p> : <p className="text-xs text-muted-foreground">No video key (upload flow in Phase 6+)</p>}
                </div>
                <div className="space-y-2"><Label>Marks (out of {String(assignment?.max_marks ?? 10)})</Label><Input type="number" min="0" max="100" value={marks} onChange={(e) => setMarks(e.target.value)} /></div>
                <div className="space-y-2"><Label>Feedback</Label><Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Written feedback..." /></div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={isPending} onClick={() => submit("reviewed")}>Save review</Button>
                  <Button disabled={isPending} variant="outline" onClick={() => submit("resubmit_requested")}>Request resubmission</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
