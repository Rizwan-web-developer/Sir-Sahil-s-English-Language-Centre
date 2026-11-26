"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(2000),
  target_type: z.enum(["all", "batch"]),
  batch_id: z.string().uuid().optional().nullable(),
});

type Result = { ok: true; message?: string } | { ok: false; error: string };

export async function createAnnouncementAction(input: unknown): Promise<Result> {
  const session = await requireStaff();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid announcement." };
  if (parsed.data.target_type === "batch" && !parsed.data.batch_id) {
    return { ok: false, error: "Select a batch for batch-targeted announcements." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    title: parsed.data.title,
    body: parsed.data.body,
    target_type: parsed.data.target_type,
    batch_id: parsed.data.target_type === "batch" ? parsed.data.batch_id : null,
    created_by: session.profile.id,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/announcements");
  revalidatePath("/portal");
  revalidatePath("/portal/more");
  return { ok: true, message: "Announcement posted." };
}

export async function deleteAnnouncementAction(id: string): Promise<Result> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/announcements");
  revalidatePath("/portal");
  revalidatePath("/portal/more");
  return { ok: true, message: "Announcement deleted." };
}
