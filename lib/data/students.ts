import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Student, StudentStatus } from "@/types/domain";

export type StudentListFilters = {
  q?: string;
  status?: StudentStatus | "all";
  batch?: string;
  page?: number;
  pageSize?: number;
};

export type StudentListRow = Student & {
  batches: Array<{ id: string; name: string }>;
  attendancePercent: number | null;
  feeStatus: "paid" | "partial" | "pending" | "overdue" | "waived" | "none";
};

export type StudentListResult = {
  rows: StudentListRow[];
  total: number;
  page: number;
  pageSize: number;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getStudentsList(
  filters: StudentListFilters,
): Promise<StudentListResult> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const q = (filters.q ?? "").trim();

  let query = supabase
    .from("students")
    .select("*", { count: "exact" })
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) {
    const like = `%${q}%`;
    const filters = [
      `full_name.ilike.${like}`,
      `phone.ilike.${like}`,
      `student_code.ilike.${like}`,
      `father_name.ilike.${like}`,
    ];
    if (/^\d+$/.test(q)) filters.push(`student_number.eq.${q}`);
    query = query.or(filters.join(","));
  }
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, count, error } = await query;
  if (error) throw error;
  const students = (data ?? []) as Student[];
  const ids = students.map((s) => s.id);

  if (ids.length === 0) {
    return { rows: [], total: count ?? 0, page, pageSize };
  }

  const [batchRows, attendanceRows, feeRows] = await Promise.all([
    supabase
      .from("batch_students")
      .select("student_id, active, batch:batches(id, name)")
      .in("student_id", ids)
      .eq("active", true),
    supabase
      .from("attendance")
      .select("student_id, status")
      .in("student_id", ids),
    supabase
      .from("fee_records")
      .select("student_id, status, due_date")
      .in("student_id", ids)
      .order("due_date", { ascending: false }),
  ]);

  const batchesByStudent = new Map<string, Array<{ id: string; name: string }>>();
  for (const row of batchRows.data ?? []) {
    const r = row as Record<string, unknown>;
    const batch = first(r.batch as { id?: string; name?: string } | null);
    const studentId = String(r.student_id);
    if (!batch?.id) continue;
    const list = batchesByStudent.get(studentId) ?? [];
    if (!list.some((b) => b.id === batch.id)) list.push({ id: String(batch.id), name: String(batch.name) });
    batchesByStudent.set(studentId, list);
  }

  const attendanceByStudent = new Map<string, { present: number; total: number }>();
  for (const row of attendanceRows.data ?? []) {
    const studentId = String(row.student_id);
    const stat = attendanceByStudent.get(studentId) ?? { present: 0, total: 0 };
    stat.total += 1;
    if (row.status === "present" || row.status === "late") stat.present += 1;
    attendanceByStudent.set(studentId, stat);
  }

  const feeByStudent = new Map<string, StudentListRow["feeStatus"]>();
  for (const row of feeRows.data ?? []) {
    const studentId = String(row.student_id);
    if (feeByStudent.has(studentId)) continue; // newest first due to order
    const status = String(row.status) as StudentListRow["feeStatus"];
    feeByStudent.set(studentId, status === "pending" || status === "partial" || status === "paid" || status === "overdue" || status === "waived" ? status : "none");
  }

  let rows = students.map((student) => {
    const att = attendanceByStudent.get(student.id);
    return {
      ...student,
      batches: batchesByStudent.get(student.id) ?? [],
      attendancePercent: att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null,
      feeStatus: feeByStudent.get(student.id) ?? "none",
    };
  });

  if (filters.batch && filters.batch !== "all") {
    rows = rows.filter((r) => r.batches.some((b) => b.id === filters.batch));
  }

  return { rows, total: count ?? 0, page, pageSize };
}

export async function getStudentById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Student | null) ?? null;
}

export async function getStudentDetail(id: string) {
  const supabase = await createClient();
  const [studentRes, batchesRes, attendanceRes, feesRes, paymentsRes] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).maybeSingle(),
    supabase.from("batch_students").select("id, batch_id, joined_on, left_on, active, batch:batches(id, name, class_type, start_time, status)").eq("student_id", id).order("joined_on", { ascending: false }),
    supabase.from("attendance").select("*").eq("student_id", id).order("date", { ascending: false }).limit(100),
    supabase.from("fee_records").select("*").eq("student_id", id).order("period_month", { ascending: false }),
    supabase.from("payments").select("*").eq("student_id", id).order("paid_on", { ascending: false }).limit(100),
  ]);

  if (studentRes.error) throw studentRes.error;
  const student = (studentRes.data as Student | null) ?? null;
  if (!student) return null;

  return {
    student,
    batchEnrollments: (batchesRes.data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id),
        batch_id: String(r.batch_id),
        joined_on: String(r.joined_on),
        left_on: (r.left_on as string | null) ?? null,
        active: Boolean(r.active),
        batch: first(r.batch as Record<string, unknown> | null),
      };
    }),
    attendance: attendanceRes.data ?? [],
    feeRecords: feesRes.data ?? [],
    payments: paymentsRes.data ?? [],
  };
}

export async function getBatchOptions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("batches")
    .select("id, name, status, class_type")
    .order("start_time", { ascending: true });
  return (data ?? []) as Array<{ id: string; name: string; status: string; class_type: string }>;
}
