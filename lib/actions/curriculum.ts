"use server";

import { revalidatePath } from "next/cache";

import { requireOwner, requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Result<T = undefined> = { ok: true; data: T; message?: string } | { ok: false; error: string };

type CurriculumKind = "level" | "module" | "topic" | "assignment";

/** Both staff roles maintain the curriculum structure. Teaching stays owner-only. */
async function requireCurriculumManager() {
  return requireRole(["owner", "reception"]);
}

/** Refresh every panel that renders the course tree. */
function revalidateCurriculum() {
  revalidatePath("/", "layout");
}

const TABLE: Record<CurriculumKind, string> = {
  level: "levels",
  module: "modules",
  topic: "topics",
  assignment: "topic_assignments",
};

const PARENT_COLUMN: Partial<Record<CurriculumKind, string>> = {
  module: "level_id",
  topic: "module_id",
  assignment: "topic_id",
};

const NAME_COLUMN: Record<CurriculumKind, string> = {
  level: "name",
  module: "name",
  topic: "name",
  assignment: "title",
};

const DESCRIPTION_COLUMN: Record<CurriculumKind, string> = {
  level: "description",
  module: "description",
  topic: "description",
  assignment: "instructions",
};

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

/**
 * Create a level (course), module, topic or assignment.
 * When `sort_order` is omitted the item is appended to its parent.
 */
export async function createCurriculumItemAction(args: {
  kind: CurriculumKind;
  parentId?: string;
  session_type: "grammar";
  name: string;
  description?: string;
  sort_order?: number;
}): Promise<Result<{ id: string }>> {
  await requireCurriculumManager();
  const supabase = await createClient();
  const table = TABLE[args.kind];

  let sortOrder = args.sort_order;
  if (sortOrder === undefined) {
    let q = supabase.from(table).select("sort_order").order("sort_order", { ascending: false }).limit(1);
    if (args.kind === "level") q = q.eq("session_type", args.session_type);
    else if (args.parentId) q = q.eq(PARENT_COLUMN[args.kind] as string, args.parentId);
    const { data } = await q;
    sortOrder = Number((data?.[0] as { sort_order?: number } | undefined)?.sort_order ?? 0) + 1;
  }

  const payload: Record<string, unknown> = {
    [NAME_COLUMN[args.kind]]: args.name,
    session_type: args.session_type,
    sort_order: sortOrder,
  };
  if (args.description) payload[DESCRIPTION_COLUMN[args.kind]] = args.description;

  if (args.kind === "level") {
    // levels carry only the name/description/session; nothing else is required.
  } else {
    if (!args.parentId) return { ok: false, error: "Select a parent item first." };
    payload[PARENT_COLUMN[args.kind] as string] = args.parentId;
  }

  if (args.kind === "assignment") {
    payload.due_offset_days = 2;
    payload.submission_type = "video";
    payload.max_marks = 10;
  }

  const { data, error } = await supabase.from(table).insert(payload).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not create item." };
  revalidateCurriculum();
  return { ok: true, data: { id: String((data as Record<string, unknown>).id) }, message: "Created." };
}

/** Rename an existing curriculum item. */
export async function updateCurriculumItemAction(args: {
  kind: CurriculumKind;
  id: string;
  name: string;
  description?: string;
}): Promise<Result> {
  await requireCurriculumManager();
  const supabase = await createClient();
  const payload: Record<string, unknown> = { [NAME_COLUMN[args.kind]]: args.name };
  if (args.description !== undefined) payload[DESCRIPTION_COLUMN[args.kind]] = args.description;
  const { error } = await supabase.from(TABLE[args.kind]).update(payload).eq("id", args.id);
  if (error) return { ok: false, error: error.message };
  revalidateCurriculum();
  return { ok: true, data: undefined, message: "Updated." };
}

/** Delete an item. Modules/topics/assignments cascade with their parent. */
export async function deleteCurriculumItemAction(args: {
  kind: CurriculumKind;
  id: string;
}): Promise<Result> {
  await requireCurriculumManager();
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE[args.kind]).delete().eq("id", args.id);
  if (error) return { ok: false, error: error.message };
  revalidateCurriculum();
  return { ok: true, data: undefined, message: "Deleted." };
}

/** Convenience wrappers used by the course manager. */
export async function createModuleAction(parentId: string, name: string): Promise<Result<{ id: string }>> {
  return createCurriculumItemAction({ kind: "module", parentId, session_type: "grammar", name });
}

export async function createTopicAction(parentId: string, name: string): Promise<Result<{ id: string }>> {
  return createCurriculumItemAction({ kind: "topic", parentId, session_type: "grammar", name });
}
