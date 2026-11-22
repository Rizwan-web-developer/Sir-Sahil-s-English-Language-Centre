import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getOwnerSubmissions(status?: string) {
  const supabase = await createClient();
  let q = supabase
    .from("submissions")
    .select("id, status, marks, feedback, submitted_at, reviewed_at, video_key, text_answer, is_late, student:students(id, full_name, student_code), assignment:topic_assignments(id, title, max_marks, topic:topics(name, module:modules(name, level:levels(name, session_type))))")
    .order("submitted_at", { ascending: true })
    .limit(100);
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const student = Array.isArray(row.student) ? row.student[0] : row.student;
    const assignment = (Array.isArray(row.assignment) ? row.assignment[0] : row.assignment) as Record<string, unknown> | null;
    const topic = assignment ? (Array.isArray(assignment.topic) ? assignment.topic[0] : assignment.topic) as Record<string, unknown> | null : null;
    const mod = topic ? (Array.isArray(topic.module) ? topic.module[0] : topic.module) as Record<string, unknown> | null : null;
    const level = mod ? (Array.isArray(mod.level) ? mod.level[0] : mod.level) as Record<string, unknown> | null : null;
    return { ...row, student, assignment, topic, module: mod, level };
  }) as Array<Record<string, unknown>>;
}
