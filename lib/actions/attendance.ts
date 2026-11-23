"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth/session";
import { currentMonthStart, formatMonth, isoDayOfWeek, nowTimeInKarachi, todayInKarachi } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { normalizeStudentCode } from "@/lib/utils/barcode";
import type { SessionType } from "@/types/domain";

type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; code?: string };

type StudentRow = {
  id: string;
  full_name: string;
  student_code: string;
  student_number: number | string | null;
  photo_url: string | null;
  status: string;
  is_archived: boolean;
};

const STUDENT_FIELDS = "id, full_name, student_code, student_number, photo_url, status, is_archived";

type StudentSummary = {
  id: string;
  full_name: string;
  student_code: string;
  /** Short numeric ID printed as QR on the ID card. */
  student_number: number;
  photo_url: string | null;
};

function summarizeStudent(row: Record<string, unknown>): StudentSummary {
  return {
    id: String(row.id),
    full_name: String(row.full_name),
    student_code: String(row.student_code),
    student_number: Number(row.student_number ?? 0),
    photo_url: (row.photo_url as string | null) ?? null,
  };
}

/**
 * Resolve a student from either the numeric ID (3306) or the SELC code
 * (SELC-0001). Scanner / QR input normally carries the numeric ID.
 */
async function findStudentByCode(raw: string): Promise<StudentRow | null> {
  const supabase = await createClient();
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    const { data } = await supabase
      .from("students")
      .select(STUDENT_FIELDS)
      .eq("student_number", Number(trimmed))
      .maybeSingle();
    if (data) return data as StudentRow;
  }

  const code = normalizeStudentCode(trimmed);
  if (code) {
    const { data } = await supabase
      .from("students")
      .select(STUDENT_FIELDS)
      .eq("student_code", code)
      .maybeSingle();
    if (data) return data as StudentRow;
  }

  return null;
}

/** Fee picture for the current month (paid / pending / no record). */
async function getCurrentMonthFee(studentId: string) {
  const supabase = await createClient();
  const period = currentMonthStart();
  const { data } = await supabase
    .from("fee_records")
    .select("period_month, amount_due, discount, amount_paid, status, due_date")
    .eq("student_id", studentId)
    .eq("period_month", period)
    .maybeSingle();

  if (!data) {
    return {
      period,
      hasRecord: false,
      status: "no_record" as const,
      amountDue: 0,
      amountPaid: 0,
      balance: 0,
      paidInFull: false,
      dueDate: null as string | null,
    };
  }

  const row = data as Record<string, unknown>;
  const amountDue = Number(row.amount_due ?? 0) - Number(row.discount ?? 0);
  const amountPaid = Number(row.amount_paid ?? 0);
  const balance = Math.max(0, amountDue - amountPaid);
  const status = String(row.status ?? "pending");
  const paidInFull = status === "paid" || status === "waived" || balance <= 0;

  return {
    period,
    hasRecord: true,
    status,
    amountDue,
    amountPaid,
    balance,
    paidInFull,
    dueDate: (row.due_date as string | null) ?? null,
  };
}

export async function markAttendanceAction(args: {
  codeOrStudentId: string;
  by: "code" | "student_id";
  batch_id: string;
  session_type: SessionType;
  date: string;
  status: "present" | "late" | "absent" | "leave";
  marked_via: "scanner" | "manual_code" | "search" | "camera" | "manual_edit";
  note?: string;
}): Promise<
  ActionResult<{
    student: StudentSummary;
    status: string;
    alreadyMarked: boolean;
    feePending: number;
  }>
> {
  await requireStaff();
  const supabase = await createClient();

  let student: StudentRow | null = null;
  if (args.by === "student_id") {
    const { data } = await supabase
      .from("students")
      .select(STUDENT_FIELDS)
      .eq("id", args.codeOrStudentId)
      .maybeSingle();
    student = (data as StudentRow | null) ?? null;
  } else {
    student = await findStudentByCode(args.codeOrStudentId);
  }

  if (!student || student.is_archived) return { ok: false, error: "Unknown student ID.", code: "unknown" };
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
        student: summarizeStudent(student),
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
      student: summarizeStudent(student),
      status: args.status,
      alreadyMarked: false,
      feePending,
    },
    message: "Attendance marked.",
  };
}

/**
 * Quick attendance used by the sidebar popup and the always-on scanner.
 *
 * The caller only needs the student ID (numeric or SELC code). Batch and
 * session are resolved from the student's active enrollments and today's
 * timetable; both can be overridden explicitly.
 */
export async function quickAttendanceAction(args: {
  code: string;
  batch_id?: string;
  session_type?: SessionType;
  date?: string;
  via?: "scanner" | "manual_code" | "search" | "camera" | "manual_edit";
  status?: "present" | "late";
}): Promise<
  ActionResult<{
    student: StudentSummary;
    batch: { id: string; name: string; start_time: string | null } | null;
    session_type: SessionType;
    status: string;
    alreadyMarked: boolean;
    fee: Awaited<ReturnType<typeof getCurrentMonthFee>>;
  }>
> {
  await requireStaff();
  const supabase = await createClient();
  const date = args.date ?? todayInKarachi();

  const student = await findStudentByCode(args.code);
  if (!student || student.is_archived) return { ok: false, error: "No student found for this ID.", code: "unknown" };
  if (student.status === "frozen" || student.status === "left") {
    return { ok: false, error: `${student.full_name} is ${student.status}.`, code: "inactive" };
  }

  const { data: enrollmentRows } = await supabase
    .from("batch_students")
    .select("batch_id, batch:batches(id, name, start_time, status)")
    .eq("student_id", student.id)
    .eq("active", true);

  const enrollments = (enrollmentRows ?? [])
    .map((row) => {
      const r = row as Record<string, unknown>;
      const batch = (Array.isArray(r.batch) ? r.batch[0] : r.batch) as Record<string, unknown> | null;
      if (!batch || String(batch.status) !== "active") return null;
      return {
        batch_id: String(r.batch_id),
        name: String(batch.name ?? ""),
        start_time: (batch.start_time as string | null) ?? null,
      };
    })
    .filter(Boolean) as Array<{ batch_id: string; name: string; start_time: string | null }>;

  if (enrollments.length === 0) {
    return { ok: false, error: `${student.full_name} is not enrolled in an active batch.`, code: "not_enrolled" };
  }

  let placement = args.batch_id ? enrollments.find((e) => e.batch_id === args.batch_id) ?? null : null;
  let sessionType: SessionType = args.session_type ?? "grammar";

  if (!placement) {
    const weekday = isoDayOfWeek(date);
    const now = nowTimeInKarachi();
    const { data: scheduleRows } = await supabase
      .from("batch_schedule")
      .select("batch_id, session_type, start_time, end_time")
      .eq("day_of_week", weekday)
      .in("batch_id", enrollments.map((e) => e.batch_id));

    const schedules = (scheduleRows ?? []) as Array<Record<string, unknown>>;
    const current = schedules.find((s) => {
      const start = String(s.start_time).slice(0, 5);
      const end = String(s.end_time).slice(0, 5);
      return start <= now && now < end;
    });
    const upcoming = schedules.find((s) => String(s.start_time).slice(0, 5) > now);
    const chosen = current ?? upcoming ?? schedules[0] ?? null;

    placement =
      (chosen ? enrollments.find((e) => e.batch_id === String(chosen.batch_id)) : null) ??
      enrollments[0];
    if (!args.session_type) {
      sessionType = "grammar";
    }
  }

  // Duplicate check - scanning twice should never throw.
  const { data: existing } = await supabase
    .from("attendance")
    .select("id, status")
    .eq("student_id", student.id)
    .eq("batch_id", placement.batch_id)
    .eq("session_type", sessionType)
    .eq("date", date)
    .maybeSingle();

  const fee = await getCurrentMonthFee(student.id);
  const studentSummary = summarizeStudent(student);

  if (existing) {
    return {
      ok: true,
      data: {
        student: studentSummary,
        batch: placement
          ? { id: placement.batch_id, name: placement.name, start_time: placement.start_time }
          : null,
        session_type: sessionType,
        status: String((existing as Record<string, unknown>).status),
        alreadyMarked: true,
        fee,
      },
      message: "Already marked.",
    };
  }

  const status = args.status ?? "present";
  const { error } = await supabase.from("attendance").insert({
    student_id: student.id,
    batch_id: placement.batch_id,
    session_type: sessionType,
    date,
    status,
    marked_via: args.via ?? "manual_code",
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/attendance");
  revalidatePath("/admin");
  return {
    ok: true,
    data: {
      student: studentSummary,
      batch: { id: placement.batch_id, name: placement.name, start_time: placement.start_time },
      session_type: sessionType,
      status,
      alreadyMarked: false,
      fee,
    },
    message: "Attendance marked.",
  };
}

export async function searchAttendanceStudentsAction(query: string): Promise<
  ActionResult<Array<{ id: string; full_name: string; student_code: string; student_number: number; photo_url: string | null; status: string }>>
> {
  await requireStaff();
  const supabase = await createClient();
  const q = query.trim();
  if (!q) return { ok: true, data: [] };

  let req = supabase
    .from("students")
    .select("id, full_name, student_code, student_number, photo_url, status")
    .eq("is_archived", false)
    .order("full_name")
    .limit(10);

  const like = `%${q}%`;
  const filters = [`full_name.ilike.${like}`, `student_code.ilike.${like}`];
  if (/^\d+$/.test(q)) filters.push(`student_number.eq.${q}`);
  req = req.or(filters.join(","));

  const { data, error } = await req;
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row.id),
        full_name: String(row.full_name),
        student_code: String(row.student_code),
        student_number: Number(row.student_number ?? 0),
        photo_url: (row.photo_url as string | null) ?? null,
        status: String(row.status),
      };
    }),
  };
}

export async function getAttendanceStudentDetailAction(studentId: string): Promise<
  ActionResult<{
    student: StudentSummary & { status: string };
    today: string;
    todayAttendance: { status: string; session_type: SessionType; batch_name: string | null } | null;
    fees: Array<{ period: string; label: string; status: string; paidInFull: boolean; amountDue: number; amountPaid: number; balance: number; isFuture: boolean; isCurrent: boolean }>;
  }>
> {
  await requireStaff();
  const supabase = await createClient();
  const today = todayInKarachi();

  const { data: studentRow, error: sErr } = await supabase
    .from("students")
    .select("id, full_name, student_code, student_number, photo_url, status, is_archived, admission_date")
    .eq("id", studentId)
    .maybeSingle();
  if (sErr || !studentRow || (studentRow as Record<string, unknown>).is_archived) {
    return { ok: false, error: "Student not found." };
  }
  const s = studentRow as Record<string, unknown>;

  // Today's attendance (any grammar session today)
  const { data: attRows } = await supabase
    .from("attendance")
    .select("status, session_type, batch:batches(name)")
    .eq("student_id", studentId)
    .eq("date", today)
    .order("marked_at", { ascending: false })
    .limit(1);
  const att = (attRows?.[0] as Record<string, unknown> | undefined) ?? undefined;
  const attBatch = (Array.isArray(att?.batch) ? att?.batch[0] : att?.batch) as Record<string, unknown> | null | undefined;
  const todayAttendance = att
    ? { status: String(att.status), session_type: "grammar" as SessionType, batch_name: attBatch?.name ? String(attBatch.name) : null }
    : null;

  // 6-month fee window starting from admission month
  const admission = String(s.admission_date ?? today).slice(0, 10);
  const start = new Date(admission.slice(0, 7) + "-01T00:00:00Z");
  const months: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    months.push(d.toISOString().slice(0, 10));
  }
  const currentMonth = currentMonthStart();

  const { data: feeRows } = await supabase
    .from("fee_records")
    .select("period_month, amount_due, discount, amount_paid, status")
    .eq("student_id", studentId)
    .in("period_month", months);

  const feeMap = new Map<string, Record<string, unknown>>();
  for (const r of feeRows ?? []) {
    const row = r as Record<string, unknown>;
    feeMap.set(String(row.period_month).slice(0, 10), row);
  }

  const fees = months.map((period) => {
    const row = feeMap.get(period);
    const amountDue = row ? Number(row.amount_due ?? 0) - Number(row.discount ?? 0) : 0;
    const amountPaid = row ? Number(row.amount_paid ?? 0) : 0;
    const balance = Math.max(0, amountDue - amountPaid);
    const status = row ? String(row.status ?? "pending") : "no_record";
    const paidInFull = status === "paid" || status === "waived" || (row ? balance <= 0 : false);
    return {
      period,
      label: formatMonth(period),
      status,
      paidInFull,
      amountDue,
      amountPaid,
      balance,
      isFuture: period > currentMonth,
      isCurrent: period === currentMonth,
    };
  });

  return {
    ok: true,
    data: {
      student: { ...summarizeStudent(s), status: String(s.status) },
      today,
      todayAttendance,
      fees,
    },
  };
}

export async function finalizeAttendanceAction(args: {
  batch_id: string;
  session_type: SessionType;
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
  const existingMap = new Map(
    (existing ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return [String(row.student_id), String(row.status)];
    }),
  );

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
