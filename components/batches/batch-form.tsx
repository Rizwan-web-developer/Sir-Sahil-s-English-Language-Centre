"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircleIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createBatchAction, updateBatchAction } from "@/lib/actions/batches";
import { formatTime } from "@/lib/format";
import { batchFormSchema, type BatchFormInput, type BatchFormValues } from "@/lib/validation/batches";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const DAYS = [
  { value: 1, label: "Mon" }, { value: 2, label: "Tue" }, { value: 3, label: "Wed" },
  { value: 4, label: "Thu" }, { value: 5, label: "Fri" }, { value: 6, label: "Sat" }, { value: 7, label: "Sun" },
];

function addHour(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h * 60 + m + 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function buildSchedule(weekdays: number[], start: string) {
  const end = addHour(start);
  return weekdays.map((day) => ({
    day_of_week: day,
    session_type: "grammar" as const,
    start_time: start,
    end_time: end,
  }));
}

type Props = { mode?: "create" | "edit"; initial?: Partial<BatchFormValues> & { id?: string } };

export function BatchForm({ mode = "create", initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<BatchFormInput, any, BatchFormValues>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: {
      name: initial?.name ?? "",
      class_type: initial?.class_type ?? "weekday",
      start_date: initial?.start_date ?? new Date().toISOString().slice(0, 10),
      start_time: initial?.start_time ?? "14:00",
      status: initial?.status ?? "active",
      notes: initial?.notes ?? "",
      weekdays: initial?.weekdays ?? [1, 2, 3, 4, 5],
      schedule: initial?.schedule ?? buildSchedule([1, 2, 3, 4, 5], "14:00"),
    },
  });

  function regenerate() {
    const days = (form.getValues("weekdays") ?? [1, 2, 3, 4, 5]) as number[];
    const start = (form.getValues("start_time") ?? "14:00") as string;
    form.setValue("schedule", buildSchedule(days, start), { shouldDirty: true, shouldValidate: true });
  }

  function toggleDay(day: number, checked: boolean) {
    const days = (form.getValues("weekdays") ?? []) as number[];
    const next = checked ? [...days, day].sort((a, b) => a - b) : days.filter((d) => d !== day);
    form.setValue("weekdays", next, { shouldDirty: true });
    form.setValue("schedule", buildSchedule(next, (form.getValues("start_time") ?? "14:00") as string), { shouldDirty: true });
  }

  function onSubmit(values: BatchFormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = mode === "edit" && initial?.id ? await updateBatchAction(initial.id, values) : await createBatchAction(values);
      if (!result.ok) { setServerError(result.error); return; }
      if (result.warning) toast.warning(result.warning);
      toast.success(result.message ?? "Saved");
      if (mode === "create") router.push(`/admin/batches/${result.data.id}`);
    });
  }

  const schedule = form.watch("schedule");

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <Alert variant="destructive"><AlertDescription>{serverError}</AlertDescription></Alert>}
      <Card>
        <CardHeader><CardTitle>Batch details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Name *</Label><Input {...form.register("name")} /></div>
          <div className="space-y-2"><Label>Type</Label>
            <Select value={form.watch("class_type")} onValueChange={(v) => { const type = v === "weekend" ? "weekend" : "weekday"; form.setValue("class_type", type); const days = type === "weekend" ? [6, 7] : [1, 2, 3, 4, 5]; form.setValue("weekdays", days); form.setValue("schedule", buildSchedule(days, form.getValues("start_time") ?? "14:00")); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="weekday">Weekday</SelectItem><SelectItem value="weekend">Weekend</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Start date *</Label><Input type="date" {...form.register("start_date")} /></div>
          <div className="space-y-2"><Label>Batch start time *</Label><Input type="time" {...form.register("start_time")} onChange={(e) => { form.register("start_time").onChange(e); form.setValue("schedule", buildSchedule((form.getValues("weekdays") ?? [1, 2, 3, 4, 5]) as number[], e.target.value)); }} /></div>
          <div className="space-y-2"><Label>Status</Label>
            <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v === "closed" ? "closed" : "active")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2"><Label>Days</Label>
            <div className="flex flex-wrap gap-3">{DAYS.map((d) => { const checked = (form.watch("weekdays") ?? []).includes(d.value); return <label key={d.value} className="flex items-center gap-2 text-sm"><Checkbox checked={checked} onCheckedChange={(v) => toggleDay(d.value, Boolean(v))} />{d.label}</label>; })}</div>
          </div>
          <div className="space-y-2 md:col-span-2"><Label>Notes</Label><Textarea {...form.register("notes")} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between"><CardTitle>Generated schedule</CardTitle><Button type="button" variant="outline" size="sm" onClick={regenerate}>Regenerate</Button></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="p-2 text-left">Day</th><th className="p-2 text-left">Session</th><th className="p-2 text-left">Start</th><th className="p-2 text-left">End</th></tr></thead>
              <tbody>
                {schedule.map((s, i) => (
                  <tr key={`${s.day_of_week}-${s.session_type}-${i}`} className="border-t">
                    <td className="p-2">{DAYS.find((d) => d.value === s.day_of_week)?.label}</td>
                    <td className="p-2 capitalize">{s.session_type}</td>
                    <td className="p-2">{formatTime(s.start_time)}</td>
                    <td className="p-2">{formatTime(s.end_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Schedule is auto-computed from batch start time. Regenerate after changes.</p>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>{isPending && <LoaderCircleIcon className="size-4 animate-spin" />}{mode === "edit" ? "Save batch" : "Create batch"}</Button>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href="/admin/batches" />}>Cancel</Button>
      </div>
    </form>
  );
}
