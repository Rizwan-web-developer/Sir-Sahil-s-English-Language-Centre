"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2Icon, RotateCcwIcon, SkipForwardIcon } from "lucide-react";

import { markTopicCompletedAction, skipTopicAction, undoTopicProgressAction } from "@/lib/actions/curriculum";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Row = Record<string, unknown>;

export function TeachingPanel({
  batches,
  selectedBatchId,
  selectedSession,
  teaching,
}: {
  batches: Row[];
  selectedBatchId: string;
  selectedSession: "conversation" | "grammar";
  teaching: Row | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  function go(batch: string, session: string) {
    const params = new URLSearchParams();
    if (batch) params.set("batch", batch);
    if (session) params.set("session", session);
    router.push(`/owner/teaching?${params.toString()}`);
  }

  const completed = new Set(((teaching?.completedTopicIds as string[]) ?? []));
  const skipped = new Set(((teaching?.skippedTopicIds as string[]) ?? []));
  const orderedTopics = (teaching?.orderedTopics as Row[] | undefined) ?? [];
  const nextTopic = teaching?.nextTopic as Row | null;
  const lastCompleted = teaching?.lastCompleted as Row | null;
  const lastTopicInfo = lastCompleted ? orderedTopics.find((t) => String(t.id) === String(lastCompleted.topic_id)) : null;

  function mark(topicId: string) {
    startTransition(async () => {
      const res = await markTopicCompletedAction({ batch_id: selectedBatchId, session_type: selectedSession, topic_id: topicId, completed_on: date, note });
      if (!res.ok) toast.error(res.error); else { toast.success(res.message ?? "Marked"); setNote(""); }
    });
  }
  function undo(topicId: string) {
    startTransition(async () => {
      const res = await undoTopicProgressAction({ batch_id: selectedBatchId, topic_id: topicId });
      if (!res.ok) toast.error(res.error); else toast.success(res.message ?? "Undone");
    });
  }
  function skip(topicId: string) {
    const reason = window.prompt("Reason for skipping this topic?") ?? "";
    if (!reason.trim()) return;
    startTransition(async () => {
      const res = await skipTopicAction({ batch_id: selectedBatchId, session_type: selectedSession, topic_id: topicId, reason });
      if (!res.ok) toast.error(res.error); else toast.success(res.message ?? "Skipped");
    });
  }

  return (
    <div className="space-y-4">
      <Card><CardContent className="pt-6 flex flex-col gap-3 md:flex-row">
        <div className="w-full md:w-72 space-y-2">
          <Label>Batch</Label>
          <Select value={selectedBatchId} onValueChange={(v) => go(v ?? "", selectedSession)}>
            <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
            <SelectContent>{batches.map((b) => <SelectItem key={String(b.id)} value={String(b.id)}>{String(b.name)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-56 space-y-2">
          <Label>Session</Label>
          <Select value={selectedSession} onValueChange={(v) => go(selectedBatchId, (v as string) ?? "conversation")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="conversation">Conversation</SelectItem><SelectItem value="grammar">Grammar</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-44 space-y-2">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex-1 space-y-2">
          <Label>Class note (optional)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Short note..." />
        </div>
      </CardContent></Card>

      {teaching && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-gold/30 bg-gold/5"><CardContent className="pt-6"><p className="text-xs uppercase tracking-wide text-muted-foreground">Last completed</p><p className="font-medium mt-1">{lastTopicInfo ? String(lastTopicInfo.name) : "No topic completed yet"}</p><p className="text-xs text-muted-foreground">{lastCompleted ? String(lastCompleted.completed_on) : "—"}</p></CardContent></Card>
            <Card className="border-primary/30 bg-primary/5"><CardContent className="pt-6"><p className="text-xs uppercase tracking-wide text-muted-foreground">Today&apos;s topic</p><p className="font-medium mt-1">{nextTopic ? String(nextTopic.name) : "All topics completed"}</p><p className="text-xs text-muted-foreground">{nextTopic ? `${String(nextTopic.levelName)} · ${String(nextTopic.moduleName)}` : "Level complete"}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Topics checklist</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {orderedTopics.length === 0 ? <p className="text-sm text-muted-foreground">No curriculum topics found for this session type.</p> :
                orderedTopics.map((t) => {
                  const id = String(t.id);
                  const isDone = completed.has(id);
                  const isSkipped = skipped.has(id);
                  const isNext = String(nextTopic?.id ?? "") === id;
                  return (
                    <div key={id} className={`flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between ${isNext ? "border-primary/40 bg-primary/5" : ""}`}>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{String(t.name)}</p>
                          {isDone && <Badge className="bg-success text-white">Completed</Badge>}
                          {isSkipped && <Badge variant="outline">Skipped</Badge>}
                          {isNext && <Badge variant="outline" className="border-primary/40 text-primary">Next</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{String(t.levelName)} · {String(t.moduleName)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!isDone && !isSkipped && <Button size="sm" disabled={isPending} onClick={() => mark(id)}><CheckCircle2Icon className="size-4" />Mark completed</Button>}
                        {(isDone || isSkipped) && <Button size="sm" variant="outline" disabled={isPending} onClick={() => undo(id)}><RotateCcwIcon className="size-4" />Undo</Button>}
                        {!isDone && !isSkipped && <Button size="sm" variant="outline" disabled={isPending} onClick={() => skip(id)}><SkipForwardIcon className="size-4" />Skip</Button>}
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
