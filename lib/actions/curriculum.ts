"use server";

import { revalidatePath } from "next/cache";

import { requireOwner } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Result<T = undefined> = { ok: true; data: T; message?: string } | { ok: false; error: string };

export async function markTopicCompletedAction(args: {
  batch_id: string;
  session_type: "grammar";
  topic_id: string;
  completed_on: string;
  note?: string;
}): Promise<Result> {
  await requireOwner();
  const supabase = await createClient();
  const { error } = await supabase.from("batch_progress").upsert({
    batch_id: args.batch_id,
    session_type: args.session_type,
    topic_id: args.topic_id,
    completed_on: args.completed_on,
    note: args.note || null,
    skipped: false,
    skip_reason: null,
  }, { onConflict: "batch_id,topic_id" });
  if (error) return { ok: false, error: error.message };

  // Assign topic assignments to active batch students
  const [{ data: assignments }, { data: enrollments }] = await Promise.all([
    supabase.from("topic_assignments").select("id, due_offset_days").eq("topic_id", args.topic_id),
    supabase.from("batch_students").select("student_id").eq("batch_id", args.batch_id).eq("active", true),
  ]);
  const assignmentRows = (assignments ?? []) as Array<Record<string, unknown>>;
  const studentIds = (enrollments ?? []).map((e) => String((e as Record<string, unknown>).student_id));
  if (assignmentRows.length && studentIds.length) {
    const rows: Array<Record<string, unknown>> = [];
    for (const a of assignmentRows) {
      for (const sid of studentIds) {
        rows.push({
          student_id: sid,
          assignment_id: String(a.id),
          status: "pending",
          submitted_at: new Date().toISOString(),
        });
      }
    }
    // insert ignore duplicates
    await supabase.from("submissions").upsert(rows, { onConflict: "student_id,assignment_id", ignoreDuplicates: true });
  }

  revalidatePath("/owner");
  revalidatePath("/owner/teaching");
  revalidatePath("/owner/teach");
  return { ok: true, data: undefined, message: "Topic marked completed." };
}

export async function undoTopicProgressAction(args: { batch_id: string; topic_id: string }): Promise<Result> {
  await requireOwner();
  const supabase = await createClient();
  const { error } = await supabase.from("batch_progress").delete().eq("batch_id", args.batch_id).eq("topic_id", args.topic_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/owner/teaching");
  revalidatePath("/owner/teach");
  return { ok: true, data: undefined, message: "Progress undone." };
}

export async function skipTopicAction(args: {
  batch_id: string;
  session_type: "grammar";
  topic_id: string;
  reason: string;
}): Promise<Result> {
  await requireOwner();
  const supabase = await createClient();
  const { error } = await supabase.from("batch_progress").upsert({
    batch_id: args.batch_id,
    session_type: args.session_type,
    topic_id: args.topic_id,
    completed_on: new Date().toISOString().slice(0, 10),
    skipped: true,
    skip_reason: args.reason || "Skipped",
  }, { onConflict: "batch_id,topic_id" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/owner/teaching");
  revalidatePath("/owner/teach");
  return { ok: true, data: undefined, message: "Topic skipped." };
}

export async function assignAssignmentToBatchAction(args: {
  batch_id: string;
  assignment_id: string;
}): Promise<Result> {
  await requireOwner();
  const supabase = await createClient();
  const { data: enrollments } = await supabase.from("batch_students").select("student_id").eq("batch_id", args.batch_id).eq("active", true);
  const studentIds = (enrollments ?? []).map((e) => String((e as Record<string, unknown>).student_id));
  if (!studentIds.length) return { ok: false, error: "No active students in this batch." };
  const rows = studentIds.map((sid) => ({
    student_id: sid,
    assignment_id: args.assignment_id,
    status: "pending",
    submitted_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("submissions").upsert(rows, { onConflict: "student_id,assignment_id", ignoreDuplicates: true });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/owner/teaching");
  revalidatePath("/portal/assignments");
  return { ok: true, data: undefined, message: "Assignment assigned to batch students." };
}

export async function createCurriculumItemAction(args: {
  kind: "level" | "module" | "topic" | "assignment";
  parentId?: string;
  session_type: "grammar";
  name: string;
  description?: string;
  sort_order?: number;
}): Promise<Result<{ id: string }>> {
  await requireOwner();
  const supabase = await createClient();
  let table = "";
  let payload: Record<string, unknown> = {};
  if (args.kind === "level") {
    table = "levels"; payload = { name: args.name, session_type: args.session_type, description: args.description || null, sort_order: args.sort_order ?? 1 };
  } else if (args.kind === "module") {
    table = "modules"; payload = { level_id: args.parentId, name: args.name, session_type: args.session_type, description: args.description || null, sort_order: args.sort_order ?? 1 };
  } else if (args.kind === "topic") {
    table = "topics"; payload = { module_id: args.parentId, name: args.name, session_type: args.session_type, description: args.description || null, sort_order: args.sort_order ?? 1 };
  } else {
    table = "topic_assignments"; payload = { topic_id: args.parentId, title: args.name, instructions: args.description || null, session_type: args.session_type, sort_order: args.sort_order ?? 1, due_offset_days: 2, submission_type: "video", max_marks: 10 };
  }
  const { data, error } = await supabase.from(table).insert(payload).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not create item." };
  revalidatePath("/owner/curriculum");
  revalidatePath("/owner/teaching");
  revalidatePath("/owner/teach");
  return { ok: true, data: { id: String((data as Record<string, unknown>).id) }, message: "Created." };
}
