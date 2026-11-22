import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isoDayOfWeek, todayInKarachi } from "@/lib/format";

export async function getAttendanceScanData() {
  const supabase = await createClient();
  const today = todayInKarachi();
  const weekday = isoDayOfWeek(today);

  const { data: schedules } = await supabase
    .from("batch_schedule")
    .select("id, batch_id, day_of_week, session_type, start_time, end_time, batch:batches(id, name, class_type, status)")
    .eq("day_of_week", weekday)
    .order("start_time");

  const rows = (schedules ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return { ...row, batch: Array.isArray(row.batch) ? row.batch[0] : row.batch } as Record<string, unknown>;
  }).filter((r) => (r.batch as Record<string, unknown> | null)?.status === "active");

  const batchIds = Array.from(new Set(rows.map((r) => String(r.batch_id))));
  const { data: students } = batchIds.length
    ? await supabase.from("batch_students").select("batch_id, student_id, student:students(id, full_name, student_code, phone, photo_url, status)").eq("active", true).in("batch_id", batchIds)
    : { data: [] };

  const { data: marked } = batchIds.length
    ? await supabase.from("attendance").select("*").eq("date", today).in("batch_id", batchIds)
    : { data: [] };

  return {
    today,
    weekday,
    schedules: rows,
    enrollments: (students ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return { ...row, student: Array.isArray(row.student) ? row.student[0] : row.student };
    }),
    marked: marked ?? [],
  };
}
