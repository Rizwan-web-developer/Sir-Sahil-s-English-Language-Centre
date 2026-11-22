import "server-only";

import { createClient } from "@/lib/supabase/server";
import { todayInKarachi, currentMonthStart } from "@/lib/format";

type AnyRow = Record<string, unknown>;

export async function getFeeDashboard() {
  const supabase = await createClient();
  const month = currentMonthStart();
  const today = todayInKarachi();

  const [{ data: monthRecords }, { data: payments }, { data: overdue }] = await Promise.all([
    supabase.from("fee_records").select("amount_due, discount, amount_paid, status").eq("period_month", month),
    supabase.from("payments").select("amount, method, paid_on").gte("paid_on", month).lte("paid_on", today),
    supabase.from("fee_records").select("id, student_id, period_month, amount_due, discount, amount_paid, due_date, status, student:students(id, full_name, student_code, phone)").in("status", ["pending", "partial", "overdue"]).order("due_date", { ascending: true }).limit(200),
  ]);

  const recs = (monthRecords ?? []) as AnyRow[];
  const expected = recs.reduce((s, r) => s + Number(r.amount_due ?? 0) - Number(r.discount ?? 0), 0);
  const collected = ((payments ?? []) as AnyRow[]).reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const pending = recs.filter((r) => ["pending", "partial", "overdue"].includes(String(r.status))).reduce((s, r) => s + Math.max(0, Number(r.amount_due ?? 0) - Number(r.discount ?? 0) - Number(r.amount_paid ?? 0)), 0);
  const overdueAmount = ((overdue ?? []) as AnyRow[]).reduce((s, r) => s + Math.max(0, Number(r.amount_due ?? 0) - Number(r.discount ?? 0) - Number(r.amount_paid ?? 0)), 0);

  const defaulters = ((overdue ?? []) as AnyRow[]).map((r) => {
    const studentRaw = r.student;
    const student = (Array.isArray(studentRaw) ? studentRaw[0] : studentRaw) as AnyRow | null;
    const balance = Math.max(0, Number(r.amount_due) - Number(r.discount) - Number(r.amount_paid));
    const daysOverdue = Math.max(0, Math.floor((new Date(today).getTime() - new Date(String(r.due_date)).getTime()) / 86400000));
    return { ...r, student, balance, daysOverdue };
  });

  return {
    expected, collected, pending, overdueAmount,
    collectionRate: expected > 0 ? Math.round((collected / expected) * 100) : 0,
    defaulters,
    todayPayments: payments ?? [],
  };
}

export async function getStudentFeeRecords(studentId: string) {
  const supabase = await createClient();
  const [{ data: records }, { data: payments }] = await Promise.all([
    supabase.from("fee_records").select("*").eq("student_id", studentId).order("period_month", { ascending: true }),
    supabase.from("payments").select("*").eq("student_id", studentId).order("paid_on", { ascending: false }),
  ]);
  return { records: records ?? [], payments: payments ?? [] };
}

export async function getStudentsForCollection(q: string) {
  const supabase = await createClient();
  const like = `%${q.trim()}%`;
  const { data } = await supabase
    .from("students")
    .select("id, full_name, student_code, phone, status, monthly_fee, discount")
    .eq("is_archived", false)
    .or(`full_name.ilike.${like},phone.ilike.${like},student_code.ilike.${like}`)
    .limit(20);
  return data ?? [];
}
