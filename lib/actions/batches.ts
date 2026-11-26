"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { batchFormSchema, type BatchFormInput } from "@/lib/validation/batches";

type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string; warning?: string }
  | { ok: false; error: string };

function overlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && bStart < aEnd;
}

async function findClash(schedule: Array<{ day_of_week: number; start_time: string; end_time: string }>, excludeBatchId?: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("batch_schedule")
    .select("batch_id, day_of_week, start_time, end_time, batch:batches(name, status)")
    .neq("batch_id", excludeBatchId ?? "00000000-0000-0000-0000-000000000000");
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const batch = (Array.isArray(r.batch) ? r.batch[0] : r.batch) as Record<string, unknown> | null;
    if (batch?.status === "closed") continue;
    for (const s of schedule) {
      if (Number(r.day_of_week) === Number(s.day_of_week) && overlap(String(r.start_time), String(r.end_time), s.start_time, s.end_time)) {
        return `Schedule overlaps with ${batch?.name ?? "another batch"} on day ${s.day_of_week} (${r.start_time}-${r.end_time}).`;
      }
    }
  }
  return null;
}

export async function createBatchAction(raw: BatchFormInput): Promise<ActionResult<{ id: string }>> {
  await requireStaff();
  const parsed = batchFormSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid batch data." };
  const v = parsed.data;
  const warning = await findClash(v.schedule);

  const supabase = await createClient();
  const { data: batch, error } = await supabase
    .from("batches")
    .insert({
      name: v.name,
      course_level_id: v.course_level_id,
      class_type: v.class_type,
      start_time: v.start_time,
      start_date: v.start_date,
      status: v.status,
      notes: v.notes || null,
    })
    .select("id")
    .single();
  if (error || !batch) return { ok: false, error: error?.message ?? "Could not create batch." };

  const rows = v.schedule.map((s) => ({ batch_id: batch.id, ...s }));
  const { error: schedErr } = await supabase.from("batch_schedule").insert(rows);
  if (schedErr) return { ok: false, error: schedErr.message };

  revalidatePath("/admin/batches");
  return { ok: true, data: { id: batch.id }, message: "Batch created.", warning: warning ?? undefined };
}

export async function updateBatchAction(id: string, raw: BatchFormInput): Promise<ActionResult<{ id: string }>> {
  await requireStaff();
  const parsed = batchFormSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid batch data." };
  const v = parsed.data;
  const warning = await findClash(v.schedule, id);
  const supabase = await createClient();
  const { error } = await supabase.from("batches").update({
    name: v.name,
    course_level_id: v.course_level_id,
    class_type: v.class_type,
    start_time: v.start_time,
    start_date: v.start_date,
    status: v.status,
    notes: v.notes || null,
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("batch_schedule").delete().eq("batch_id", id);
  const { error: schedErr } = await supabase.from("batch_schedule").insert(v.schedule.map((s) => ({ batch_id: id, ...s })));
  if (schedErr) return { ok: false, error: schedErr.message };
  revalidatePath("/admin/batches");
  revalidatePath(`/admin/batches/${id}`);
  return { ok: true, data: { id }, message: "Batch updated.", warning: warning ?? undefined };
}

/**
 * Delete a batch. Schedule, enrollments and attendance rows cascade with it;
 * fees keep their student link and simply lose the batch reference.
 */
export async function deleteBatchAction(id: string): Promise<ActionResult<{ id: string }>> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("batches").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/batches");
  revalidatePath("/admin", "layout");
  return { ok: true, data: { id }, message: "Batch deleted." };
}
