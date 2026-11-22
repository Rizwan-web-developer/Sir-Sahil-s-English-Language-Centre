import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getReportsOverview() {
  const supabase = await createClient();
  const [payments, fees, attendance, students, batches] = await Promise.all([
    supabase.from("payments").select("amount, paid_on, method, receipt_no").order("paid_on", { ascending: false }).limit(500),
    supabase.from("fee_records").select("id, period_month, amount_due, discount, amount_paid, status, due_date, student:students(full_name, student_code, phone)").order("period_month", { ascending: false }).limit(500),
    supabase.from("attendance").select("date, status, session_type, student:students(full_name, student_code), batch:batches(name)").order("date", { ascending: false }).limit(500),
    supabase.from("students").select("id, full_name, student_code, status, is_archived, created_at, monthly_fee").order("created_at", { ascending: false }).limit(500),
    supabase.from("batches").select("id, name, class_type, status").order("name"),
  ]);

  const paymentRows = (payments.data ?? []) as Array<Record<string, unknown>>;
  const feeRows = (fees.data ?? []) as Array<Record<string, unknown>>;
  const attendanceRows = (attendance.data ?? []) as Array<Record<string, unknown>>;
  const studentRows = (students.data ?? []) as Array<Record<string, unknown>>;

  const incomeTotal = paymentRows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const outstanding = feeRows
    .filter((r) => ["pending", "partial", "overdue"].includes(String(r.status)))
    .reduce((s, r) => s + Math.max(0, Number(r.amount_due) - Number(r.discount) - Number(r.amount_paid)), 0);
  const defaulters = feeRows.filter((r) => String(r.status) === "overdue" || (["pending", "partial"].includes(String(r.status)) && String(r.due_date) < new Date().toISOString().slice(0, 10)));

  return {
    incomeTotal,
    outstanding,
    defaulterCount: defaulters.length,
    totalStudents: studentRows.filter((s) => !s.is_archived).length,
    paymentRows,
    feeRows,
    attendanceRows,
    studentRows,
    batchRows: (batches.data ?? []) as Array<Record<string, unknown>>,
  };
}
