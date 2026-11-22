"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { normalizeStudentCode } from "@/lib/utils/barcode";

type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; code?: string };

export async function markAttendanceAction(args: {
  codeOrStudentId: string;
  by: "code" | "student_id";
  batch_id: string;
  session_type: "conversation" | "grammar";
  date: string;
  status: "present" | "late" | "absent" | "leave";
  marked_via: "scanner" | "manual_code" | "search" | "camera" | "manual_edit";
  note?: string;
}): Promise<ActionResult<{ student: { id: string; full_name: string; student_code: string; photo_url: string | null }; status: string; alreadyMarked: boolean; feePending: number }>> {
  await requireStaff();
  const supabase = await createClient();

  let student: Record<string, unknown> | null = null;
  if (args.by === "student_id") {
    const { data } = await supabase.from("students").select("id, full_name, student_code, photo_url, status, is_archived").eq("id", args.codeOrStudentId).maybeSingle();
    student = data as Record<string, unknown> | null;
  } else {
    const code = normalizeStudentCode(args.codeOrStudentId);
    const { data } = await supabase.from("students").select("id, full_name, student_code, photo_url, status, is_archived").eq("student_code", code).maybeSingle();
    student = data as Record<string, unknown> | null;
  }

  if (!student || student.is_archived) return { ok: false, error: "Unknown student code.", code: "unknown" };
  if (student.status === "frozen" || student.status === "left") {
    return { ok: false, error: `Student is ${String(student.status)}.`, code: "inactive" };
  }

  // Check enrollment in batch
  const { data: enrollment } = await supabase
    .from("batch_students")
    .select("id")
    .eq("batch_id", args.batch_id)
    .eq("student_id", String(student.id))
    .eq("active", true)
    .maybeSingle();
  if (!enrollment) return { ok: false, error: "Student is not in this batch.", code: "wrong_batch" };

  // Duplicate check
  const { data: existing } = await supabase
    .from("attendance")
    .select("id, status, marked_at")
    .eq("student_id", String(student.id))
    .eq("batch_id", args.batch_id)
    .eq("session_type", args.session_type)
    .eq("date", args.date)
    .maybeSingle();

  if (existing) {
    return {
      ok: true,
      data: {
        student: {
          id: String(student.id),
          full_name: String(student.full_name),
          student_code: String(student.student_code),
          photo_url: (student.photo_url as string | null) ?? null,
        },
        status: String((existing as Record<string, unknown>).status),
        alreadyMarked: true,
        feePending: 0,
      },
      message: "Already marked.",
    };
  }

  const { error } = await supabase.from("attendance").insert({
    student_id: String(student.id),
    batch_id: args.batch_id,
    session_type: args.session_type,
    date: args.date,
    status: args.status,
    marked_via: args.marked_via,
    note: args.note ?? null,
  });
  if (error) return { ok: false, error: error.message };

  // Fee overdue warning (non-blocking)
  const { data: feeRows } = await supabase
    .from("fee_records")
    .select("amount_due, discount, amount_paid, status")
    .eq("student_id", String(student.id))
    .in("status", ["pending", "partial", "overdue"]);
  const feePending = (feeRows ?? []).reduce((sum, r) => {
    const row = r as Record<string, unknown>;
    return sum + Math.max(0, Number(row.amount_due) - Number(row.discount) - Number(row.amount_paid));
  }, 0);

  revalidatePath("/admin/attendance");
  return {
    ok: true,
    data: {
      student: {
        id: String(student.id),
        full_name: String(student.full_name),
        student_code: String(student.student_code),
        photo_url: (student.photo_url as string | null) ?? null,
      },
      status: args.status,
      alreadyMarked: false,
      feePending,
    },
    message: "Attendance marked.",
  };
}

export async function finalizeAttendanceAction(args: {
  batch_id: string;
  session_type: "conversation" | "grammar";
  date: string;
}): Promise<ActionResult<{ markedAbsent: number }>> {
  await requireStaff();
  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("batch_students")
    .select("student_id")
    .eq("batch_id", args.batch_id)
    .eq("active", true);
  const ids = (enrollments ?? []).map((r) => String((r as Record<string, unknown>).student_id));

  const { data: existing } = await supabase
    .from("attendance")
    .select("student_id, status")
    .eq("batch_id", args.batch_id)
    .eq("session_type", args.session_type)
    .eq("date", args.date);
  const existingMap = new Map((existing ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return [String(row.student_id), String(row.status)];
  }));

  const toInsert = ids
    .filter((id) => !existingMap.has(id))
    .map((student_id) => ({
      student_id,
      batch_id: args.batch_id,
      session_type: args.session_type,
      date: args.date,
      status: "absent" as const,
      marked_via: "manual_edit" as const,
      note: "Finalized as absent",
    }));

  if (toInsert.length > 0) {
    const { error } = await supabase.from("attendance").insert(toInsert);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/admin/attendance");
  return { ok: true, data: { markedAbsent: toInsert.length }, message: `Marked ${toInsert.length} students absent.` };
}
