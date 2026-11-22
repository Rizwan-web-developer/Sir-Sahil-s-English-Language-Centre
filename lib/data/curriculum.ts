import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getCurriculumTree(sessionType?: "conversation" | "grammar") {
  const supabase = await createClient();
  let q = supabase
    .from("levels")
    .select("id, name, session_type, sort_order, description, modules(id, name, sort_order, description, estimated_classes, topics(id, name, sort_order, description, estimated_classes, topic_assignments(id, title, instructions, sort_order, due_offset_days, submission_type, max_marks)))")
    .order("sort_order");
  if (sessionType) q = q.eq("session_type", sessionType);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Array<Record<string, unknown>>;
}

export async function getTeachingData(batchId: string, sessionType: "conversation" | "grammar") {
  const supabase = await createClient();
  const [batchRes, levelsRes, progressRes, studentsRes, assignmentRes] = await Promise.all([
    supabase.from("batches").select("id, name, class_type, start_time, current_conversation_level_id, current_grammar_level_id").eq("id", batchId).maybeSingle(),
    supabase.from("levels").select("id, name, sort_order, modules(id, name, sort_order, topics(id, name, sort_order, topic_assignments(id, title, max_marks)))").eq("session_type", sessionType).order("sort_order"),
    supabase.from("batch_progress").select("id, topic_id, completed_on, note, skipped, skip_reason").eq("batch_id", batchId).eq("session_type", sessionType),
    supabase.from("batch_students").select("student:students(id, full_name, student_code, status)").eq("batch_id", batchId).eq("active", true),
    supabase.from("topic_assignments").select("id, title, topic_id, max_marks, topics(name)").eq("session_type", sessionType).order("sort_order"),
  ]);

  const batch = batchRes.data as Record<string, unknown> | null;
  const levels: Array<Record<string, unknown>> = ((levelsRes.data ?? []) as Array<Record<string, unknown>>).map((l) => {
    const modules = (((l.modules as Array<Record<string, unknown>>) ?? []) as Array<Record<string, unknown>>)
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
      .map((m) => ({
        ...m,
        topics: (((m.topics as Array<Record<string, unknown>>) ?? []) as Array<Record<string, unknown>>)
          .sort((a, b) => Number(a.sort_order) - Number(b.sort_order)),
      }));
    return { ...l, modules } as Record<string, unknown>;
  }).sort((a, b) => Number(a.sort_order) - Number(b.sort_order));

  const progress = (progressRes.data ?? []) as Array<Record<string, unknown>>;
  const completedTopicIds = new Set(progress.filter((p) => !p.skipped).map((p) => String(p.topic_id)));
  const skippedTopicIds = new Set(progress.filter((p) => p.skipped).map((p) => String(p.topic_id)));
  const orderedTopics: Array<Record<string, unknown>> = [];
  for (const l of levels) for (const m of (l.modules as Array<Record<string, unknown>>)) for (const t of (m.topics as Array<Record<string, unknown>>)) orderedTopics.push({ ...t, levelId: String(l.id), levelName: String(l.name), moduleId: String(m.id), moduleName: String(m.name) });
  const lastCompleted = progress.filter((p) => !p.skipped).sort((a,b)=>String(b.completed_on).localeCompare(String(a.completed_on)))[0] ?? null;
  const nextTopic = orderedTopics.find((t) => !completedTopicIds.has(String(t.id)) && !skippedTopicIds.has(String(t.id))) ?? null;
  const students = (studentsRes.data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return Array.isArray(row.student) ? row.student[0] : row.student;
  }).filter(Boolean) as Array<Record<string, unknown>>;
  const assignments = (assignmentRes.data ?? []).map((a) => {
    const row = a as Record<string, unknown>;
    const topic = Array.isArray(row.topics) ? row.topics[0] : row.topics;
    return { ...row, topicName: (topic as Record<string, unknown> | null)?.name ?? "" };
  });

  return {
    batch,
    students,
    assignments,
    levels,
    progress,
    completedTopicIds: Array.from(completedTopicIds),
    skippedTopicIds: Array.from(skippedTopicIds),
    lastCompleted,
    nextTopic,
    orderedTopics,
    completedCount: completedTopicIds.size,
    remainingCount: Math.max(orderedTopics.length - completedTopicIds.size - skippedTopicIds.size, 0),
    totalCount: orderedTopics.length,
  };
}
