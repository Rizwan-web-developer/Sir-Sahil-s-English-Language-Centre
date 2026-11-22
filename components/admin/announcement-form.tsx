"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createAnnouncementAction } from "@/lib/actions/announcements";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Batch = { id: string; name: string };

export function AnnouncementForm({ batches }: { batches: Batch[] }) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<"all" | "batch">("all");
  const [batchId, setBatchId] = useState("");

  function submit() {
    startTransition(async () => {
      const res = await createAnnouncementAction({
        title,
        body,
        target_type: targetType,
        batch_id: targetType === "batch" ? batchId : null,
      });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(res.message ?? "Posted");
      setTitle("");
      setBody("");
      setBatchId("");
      setTargetType("all");
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Post announcement</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-2"><Label>Message</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Target</Label>
            <Select value={targetType} onValueChange={(v) => setTargetType((v as "all" | "batch") ?? "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All students</SelectItem>
                <SelectItem value="batch">Specific batch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {targetType === "batch" && (
            <div className="space-y-2">
              <Label>Batch</Label>
              <Select value={batchId} onValueChange={(v) => setBatchId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                <SelectContent>{batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </div>
        <Button onClick={submit} disabled={isPending}>Post announcement</Button>
      </CardContent>
    </Card>
  );
}
