"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole, requireStaff } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  studentFormSchema,
  studentStatusChangeSchema,
  type StudentFormInput,
} from "@/lib/validation/students";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function zodFieldErrors(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function normalizePhone(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function makeTempPassword() {
  const part = Math.random().toString(36).slice(-6);
  return `Selc@${part}${Math.floor(10 + Math.random() * 89)}`;
}

async function findDuplicateStudent(input: {
  id?: string;
  phone: string;
  cnic_or_bform?: string | null;
  full_name: string;
  father_name?: string | null;
}) {
  const supabase = await createClient();
  const phone = normalizePhone(input.phone);
  const cnic = (input.cnic_or_bform ?? "").trim();
  const { data } = await supabase
    .from("students")
    .select("id, full_name, student_code, phone, cnic_or_bform, father_name, is_archived")
    .eq("is_archived", false)
    .limit(200);

  return (data ?? []).find((row) => {
    if (input.id && row.id === input.id) return false;
    const rowPhone = normalizePhone(row.phone);
    const rowCnic = String(row.cnic_or_bform ?? "").trim();
    const samePhone = phone && rowPhone && phone === rowPhone;
    const sameCnic = cnic && rowCnic && cnic.toLowerCase() === rowCnic.toLowerCase();
    const sameName =
      row.full_name.trim().toLowerCase() === input.full_name.trim().toLowerCase() &&
      String(row.father_name ?? "").trim().toLowerCase() ===
        String(input.father_name ?? "").trim().toLowerCase();
    return samePhone || sameCnic || (sameName && Boolean(input.father_name));
  });
}

export async function createStudentAction(
  raw: StudentFormInput,
): Promise<ActionResult<{ studentId: string; studentCode: string; studentNumber: number; tempPassword: string }>> {
  await requireStaff();
  const parsed = studentFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid student data.", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const values = parsed.data;
  const duplicate = await findDuplicateStudent({
    phone: values.phone,
    cnic_or_bform: values.cnic_or_bform,
    full_name: values.full_name,
    father_name: values.father_name,
  });
  if (duplicate) {
    return {
      ok: false,
      error: `Possible duplicate: ${duplicate.full_name} (${duplicate.student_code}) already exists with matching phone/CNIC/name.`,
    };
  }

  const admin = createAdminClient();
  const supabase = await createClient();
  const tempPassword = makeTempPassword();

  // Create a placeholder auth user first; we'll rename email to <student_code>@selc.local after insert.
  const placeholderEmail = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@selc.local`;
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: placeholderEmail,
    password: tempPassword,
    email_confirm: true,
    app_metadata: { role: "student" },
    user_metadata: { full_name: values.full_name, phone: values.phone },
  });
  if (authError || !authData.user) {
    return { ok: false, error: authError?.message ?? "Could not create student login." };
  }

  const discountAmount =
    values.discount_type === "percent"
      ? Math.min(values.monthly_fee, (values.monthly_fee * values.discount) / 100)
      : values.discount;

  const { data: student, error: insertError } = await supabase
    .from("students")
    .insert({
      profile_id: authData.user.id,
      full_name: values.full_name,
      father_name: values.father_name || null,
      phone: values.phone,
      parent_phone: values.parent_phone || null,
      whatsapp: values.whatsapp_same_as_phone ? values.phone : values.whatsapp || null,
      cnic_or_bform: values.cnic_or_bform || null,
      address: values.address || null,
      photo_url: values.photo_url || null,
      date_of_birth: values.date_of_birth || null,
      admission_date: values.admission_date,
      status: values.status ?? "active",
      monthly_fee: values.monthly_fee,
      discount: discountAmount,
      notes: [values.notes, values.discount_reason ? `Discount reason: ${values.discount_reason}` : null, values.admission_fee ? `Admission fee: PKR ${values.admission_fee}` : null]
        .filter(Boolean)
        .join("\n") || null,
      is_archived: false,
    })
    .select("id, student_code, student_number")
    .single();

  if (insertError || !student) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { ok: false, error: insertError?.message ?? "Could not create student record." };
  }

  const finalEmail = `${String(student.student_code).toLowerCase()}@selc.local`;
  await admin.auth.admin.updateUserById(authData.user.id, { email: finalEmail, email_confirm: true });
  await admin.from("profiles").update({ must_change_password: true }).eq("id", authData.user.id);

  if (values.batch_ids?.length) {
    const rows = values.batch_ids.map((batchId) => ({
      batch_id: batchId,
      student_id: student.id,
      active: true,
      joined_on: values.admission_date,
    }));
    await supabase.from("batch_students").upsert(rows, { onConflict: "batch_id,student_id" });
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin/batches");
  return {
    ok: true,
    data: {
      studentId: student.id,
      studentCode: student.student_code,
      studentNumber: Number(student.student_number),
      tempPassword,
    },
    message: "Student created.",
  };
}

export async function updateStudentAction(
  id: string,
  raw: StudentFormInput,
): Promise<ActionResult<{ studentId: string }>> {
  await requireStaff();
  const parsed = studentFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid student data.", fieldErrors: zodFieldErrors(parsed.error) };
  }
  const values = parsed.data;
  const duplicate = await findDuplicateStudent({
    id,
    phone: values.phone,
    cnic_or_bform: values.cnic_or_bform,
    full_name: values.full_name,
    father_name: values.father_name,
  });
  if (duplicate) {
    return { ok: false, error: `Possible duplicate: ${duplicate.full_name} (${duplicate.student_code}).` };
  }

  const supabase = await createClient();
  const discountAmount =
    values.discount_type === "percent"
      ? Math.min(values.monthly_fee, (values.monthly_fee * values.discount) / 100)
      : values.discount;

  const { error } = await supabase
    .from("students")
    .update({
      full_name: values.full_name,
      father_name: values.father_name || null,
      phone: values.phone,
      parent_phone: values.parent_phone || null,
      whatsapp: values.whatsapp_same_as_phone ? values.phone : values.whatsapp || null,
      cnic_or_bform: values.cnic_or_bform || null,
      address: values.address || null,
      photo_url: values.photo_url || null,
      date_of_birth: values.date_of_birth || null,
      admission_date: values.admission_date,
      status: values.status ?? "active",
      monthly_fee: values.monthly_fee,
      discount: discountAmount,
      notes: values.notes || null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  // Sync batch enrollments (active set = selected batch_ids).
  const selected = new Set(values.batch_ids ?? []);
  const { data: existingEnrollments } = await supabase
    .from("batch_students")
    .select("id, batch_id, active")
    .eq("student_id", id);

  for (const row of existingEnrollments ?? []) {
    const shouldBeActive = selected.has(String(row.batch_id));
    if (row.active && !shouldBeActive) {
      await supabase
        .from("batch_students")
        .update({ active: false, left_on: new Date().toISOString().slice(0, 10) })
        .eq("id", row.id);
    }
    if (!row.active && shouldBeActive) {
      await supabase
        .from("batch_students")
        .update({ active: true, left_on: null })
        .eq("id", row.id);
    }
    selected.delete(String(row.batch_id));
  }
  for (const batchId of selected) {
    await supabase.from("batch_students").insert({
      batch_id: batchId,
      student_id: id,
      active: true,
      joined_on: values.admission_date,
    });
  }

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${id}`);
  revalidatePath("/admin/batches");
  return { ok: true, data: { studentId: id }, message: "Student updated." };
}

export async function setStudentStatusAction(input: {
  id: string;
  status: "active" | "frozen" | "left" | "completed";
  reason?: string;
  date?: string;
}): Promise<ActionResult> {
  await requireStaff();
  const parsed = studentStatusChangeSchema.safeParse({ ...input, confirm: undefined });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };

  const supabase = await createClient();
  const noteParts = [parsed.data.reason, parsed.data.date ? `Date: ${parsed.data.date}` : null].filter(Boolean);
  const { data: existing } = await supabase.from("students").select("notes").eq("id", parsed.data.id).maybeSingle();
  const notes = [existing?.notes, noteParts.length ? `[${parsed.data.status.toUpperCase()}] ${noteParts.join(" - ")}` : null]
    .filter(Boolean)
    .join("\n");

  const { error } = await supabase
    .from("students")
    .update({ status: parsed.data.status, notes: notes || null })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${parsed.data.id}`);
  return { ok: true, data: undefined, message: "Student status updated." };
}

export async function archiveStudentAction(id: string): Promise<ActionResult> {
  await requireRole(["owner", "reception"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({ is_archived: true, status: "left" })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/students");
  redirect("/admin/students");
}
