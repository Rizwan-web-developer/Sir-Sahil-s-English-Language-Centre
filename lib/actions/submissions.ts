"use server";

import { revalidatePath } from "next/cache";

import { requireOwner } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Result<T = undefined> = { ok: true; data: T; message?: string } | { ok: false; error: string };

export async function reviewSubmissionAction(args: {
  id: string;
  marks: number;
  feedback?: string;
  status: "reviewed" | "resubmit_requested";
}): Promise<Result> {
  await requireOwner();
  const supabase = await createClient();
  const { error } = await supabase.from("submissions").update({
    marks: args.marks,
    feedback: args.feedback ?? null,
    status: args.status,
    reviewed_at: new Date().toISOString(),
  }).eq("id", args.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/owner/assignments");
  revalidatePath("/portal/assignments");
  return { ok: true, data: undefined, message: args.status === "reviewed" ? "Submission reviewed." : "Resubmission requested." };
}
