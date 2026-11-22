import "server-only";

import { createClient } from "@/lib/supabase/server";

type BatchRow = { id: string; [key: string]: unknown };
type CountRow = { batch_id: string };

export async function getBatchesList() {
  const supabase = await createClient();
  const { data: batches, error } = await supabase
    .from("batches")
    .select("*")
    .order("start_time", { ascending: true });
  if (error) throw error;

  const ids = ((batches ?? []) as BatchRow[]).map((b) => String(b.id));
  const { data: counts } = ids.length
    ? await supabase.from("batch_students").select("batch_id").in("batch_id", ids).eq("active", true)
    : { data: [] as CountRow[] };
  const countMap = new Map<string, number>();
  for (const row of (counts ?? []) as CountRow[]) {
    const k = String(row.batch_id);
    countMap.set(k, (countMap.get(k) ?? 0) + 1);
  }

  return ((batches ?? []) as BatchRow[]).map((b) => ({ ...b, studentCount: countMap.get(String(b.id)) ?? 0 }));
}

export async function getBatchDetail(id: string) {
  const supabase = await createClient();
  const [batchRes, scheduleRes, studentsRes] = await Promise.all([
    supabase.from("batches").select("*").eq("id", id).maybeSingle(),
    supabase.from("batch_schedule").select("*").eq("batch_id", id).order("day_of_week").order("start_time"),
    supabase.from("batch_students").select("id, student_id, joined_on, left_on, active, student:students(id, full_name, student_code, phone, status)").eq("batch_id", id).order("joined_on", { ascending: false }),
  ]);
  if (batchRes.error) throw batchRes.error;
  if (!batchRes.data) return null;
  return {
    batch: batchRes.data,
    schedule: scheduleRes.data ?? [],
    enrollments: (studentsRes.data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return { ...row, student: Array.isArray(row.student) ? row.student[0] : row.student };
    }),
  };
}

export async function getAllBatchesForTimetable() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("batch_schedule")
    .select("id, batch_id, day_of_week, session_type, start_time, end_time, batch:batches(id, name, class_type, status)")
    .order("day_of_week")
    .order("start_time");
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return { ...row, batch: Array.isArray(row.batch) ? row.batch[0] : row.batch };
  });
}
