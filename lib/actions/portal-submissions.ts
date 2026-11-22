"use server";

import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStudent } from "@/lib/auth/session";
import { getOwnStudent } from "@/lib/data/dashboard";
import { isR2Configured, createPresignedUploadUrl } from "@/lib/storage/r2";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Result<T = undefined> = { ok: true; data: T; message?: string } | { ok: false; error: string };

const presignSchema = z.object({
  assignment_id: z.string().uuid(),
  file_name: z.string().min(1),
  content_type: z.string().min(1),
  size_bytes: z.number().int().positive(),
});

export async function createAssignmentUploadUrlAction(input: unknown): Promise<Result<{ uploadUrl: string; key: string }>> {
  const session = await requireStudent();
  const parsed = presignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid upload request." };
  if (!isR2Configured()) return { ok: false, error: "Video storage (R2) is not configured yet. Contact the institute." };

  const allowed = ["video/mp4", "video/quicktime", "video/webm"];
  if (!allowed.includes(parsed.data.content_type)) return { ok: false, error: "Only MP4, MOV, or WEBM videos are allowed." };
  const maxBytes = 200 * 1024 * 1024;
  if (parsed.data.size_bytes > maxBytes) return { ok: false, error: "Video must be 200 MB or smaller." };

  const student = await getOwnStudent(session.profile.id);
  if (!student) return { ok: false, error: "Student record not found." };

  const ext = parsed.data.file_name.split(".").pop()?.toLowerCase() || "mp4";
  const key = `submissions/${student.id}/${parsed.data.assignment_id}/${randomUUID()}.${ext}`;
  const uploadUrl = await createPresignedUploadUrl(key, parsed.data.content_type);
  return { ok: true, data: { uploadUrl, key } };
}

const submitSchema = z.object({
  assignment_id: z.string().uuid(),
  video_key: z.string().min(1),
  text_answer: z.string().max(5000).optional().nullable(),
});

export async function submitAssignmentAction(input: unknown): Promise<Result> {
  const session = await requireStudent();
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid submission." };
  const student = await getOwnStudent(session.profile.id);
  if (!student) return { ok: false, error: "Student record not found." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("submissions")
    .select("id, status")
    .eq("student_id", student.id)
    .eq("assignment_id", parsed.data.assignment_id)
    .maybeSingle();

  if (existing && String((existing as Record<string, unknown>).status) === "reviewed") {
    return { ok: false, error: "This submission has already been reviewed." };
  }

  const payload = {
    student_id: student.id,
    assignment_id: parsed.data.assignment_id,
    video_key: parsed.data.video_key,
    text_answer: parsed.data.text_answer ?? null,
    status: "submitted" as const,
    submitted_at: new Date().toISOString(),
    reviewed_at: null,
    reviewed_by: null,
  };

  const query = existing
    ? supabase.from("submissions").update(payload).eq("id", String((existing as Record<string, unknown>).id))
    : supabase.from("submissions").insert(payload);

  const { error } = await query;
  if (error) return { ok: false, error: error.message };

  try {
    const admin = createAdminClient();
    const [{ data: owners }, { data: assignment }] = await Promise.all([
      admin.from("profiles").select("id").eq("role", "owner").eq("is_active", true),
      admin.from("topic_assignments").select("title").eq("id", parsed.data.assignment_id).maybeSingle(),
    ]);
    const title = (assignment as Record<string, unknown> | null)?.title ?? "Assignment";
    const rows = (owners ?? []).map((o) => ({
      user_id: (o as Record<string, unknown>).id,
      title: "New assignment submission",
      body: `${student.full_name} submitted \"${String(title)}\".`,
      type: "assignment_submission",
      link: "/owner/assignments?status=submitted",
    }));
    if (rows.length) await admin.from("notifications").insert(rows);
  } catch {
    // Notification failure should not block submission.
  }

  revalidatePath("/portal/assignments");
  revalidatePath("/owner/assignments");
  return { ok: true, data: undefined, message: "Assignment submitted." };
}
