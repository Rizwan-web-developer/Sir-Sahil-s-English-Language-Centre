"use server";

import { revalidatePath } from "next/cache";

import { requireOwner } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Result<T = undefined> = { ok: true; data: T; message?: string } | { ok: false; error: string };

function nextCertNo(last: string | null) {
  const year = new Date().getFullYear();
  const m = String(last ?? "").match(/(\d+)$/);
  const n = m ? Number(m[1]) : 0;
  return `CERT-${year}-${String(n + 1).padStart(6, "0")}`;
}

export async function approveCertificateAction(args: { student_id: string; level_id: string }): Promise<Result<{ id: string }>> {
  const session = await requireOwner();
  const supabase = await createClient();

  const { data: existing } = await supabase.from("certificates").select("id").eq("student_id", args.student_id).eq("level_id", args.level_id).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("certificates").update({ status: "approved", approved_by: session.profile.id }).eq("id", (existing as Record<string, unknown>).id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/owner/certificates");
    return { ok: true, data: { id: String((existing as Record<string, unknown>).id) }, message: "Certificate approved." };
  }

  const { data: last } = await supabase.from("certificates").select("certificate_no").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const certificateNo = nextCertNo((last as Record<string, unknown> | null)?.certificate_no as string | null);
  const { data, error } = await supabase.from("certificates").insert({
    certificate_no: certificateNo,
    student_id: args.student_id,
    level_id: args.level_id,
    status: "approved",
    approved_by: session.profile.id,
    issued_on: new Date().toISOString().slice(0, 10),
  }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not create certificate." };
  revalidatePath("/owner/certificates");
  return { ok: true, data: { id: String((data as Record<string, unknown>).id) }, message: "Certificate issued." };
}

export async function revokeCertificateAction(args: { id: string; reason: string }): Promise<Result> {
  await requireOwner();
  const supabase = await createClient();
  const { error } = await supabase.from("certificates").update({
    status: "revoked",
    revoke_reason: args.reason,
    revoked_at: new Date().toISOString(),
  }).eq("id", args.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/owner/certificates");
  revalidatePath("/portal/certificates");
  return { ok: true, data: undefined, message: "Certificate revoked." };
}
