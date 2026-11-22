"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff, requireStudent } from "@/lib/auth/session";
import { getOwnStudent } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true; message?: string } | { ok: false; error: string };

export async function createProfileChangeRequestAction(input: unknown): Promise<Result> {
  const session = await requireStudent();
  const parsed = z.object({ message: z.string().trim().min(5).max(1000) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  const student = await getOwnStudent(session.profile.id);
  if (!student) return { ok: false, error: "Student record not found." };
  const supabase = await createClient();
  const { error } = await supabase.from("profile_change_requests").insert({
    student_id: student.id,
    requested_by: session.profile.id,
    message: parsed.data.message,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/portal/account");
  revalidatePath("/admin/students");
  return { ok: true, message: "Request sent to reception." };
}

export async function resolveProfileChangeRequestAction(id: string, status: "reviewed" | "resolved"): Promise<Result> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("profile_change_requests").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/students");
  return { ok: true, message: "Request updated." };
}
