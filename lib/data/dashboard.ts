import "server-only";

import {
  currentMonthStart,
  isoDayOfWeek,
  todayInKarachi,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type {
  BatchSchedule,
  FeeRecord,
  ScheduleWithBatch,
  SessionType,
  Student,
  SubmissionStatus,
} from "@/types/domain";

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export type AdminOverview = {
  activeStudents: number;
  activeBatches: number;
  attendanceToday: number;
  monthCollection: number;
  pendingFeeRecords: number;
  todayClasses: ScheduleWithBatch[];
  today: string;
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = await createClient();
  const today = todayInKarachi();
  const monthStart = currentMonthStart();
  const weekday = isoDayOfWeek(today);

  const [students, batches, attendance, payments, pendingFees, schedule] =
    await Promise.all([
      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("is_archived", false)
        .eq("status", "active"),
      supabase
        .from("batches")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .eq("date", today),
      supabase.from("payments").select("amount").gte("paid_on", monthStart),
      supabase
        .from("fee_records")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "partial", "overdue"]),
      supabase
        .from("batch_schedule")
        .select(
          "id, batch_id, day_of_week, session_type, start_time, end_time, batch:batches(id, name, class_type)",
        )
        .eq("day_of_week", weekday)
        .order("start_time", { ascending: true }),
    ]);

  const monthCollection = (payments.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  );

  const todayClasses = (schedule.data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      ...(record as unknown as ScheduleWithBatch),
      batch: first(record.batch as ScheduleWithBatch["batch"] | null),
    };
  });

  return {
    activeStudents: students.count ?? 0,
    activeBatches: batches.count ?? 0,
    attendanceToday: attendance.count ?? 0,
    monthCollection,
    pendingFeeRecords: pendingFees.count ?? 0,
    todayClasses,
    today,
  };
}

export type OwnerBatchProgress = {
  batch: {
    id: string;
    name: string;
    class_type: "weekday" | "weekend";
    start_time: string;
  };
  last: Partial<Record<SessionType, { topic: string; completed_on: string }>>;
  started: number;
};

export type OwnerOverview = {
  activeBatches: number;
  topicsToday: number;
  pendingSubmissions: number;
  pendingCertificates: number;
  batches: OwnerBatchProgress[];
  today: string;
};

export async function getOwnerOverview(): Promise<OwnerOverview> {
  const supabase = await createClient();
  const today = todayInKarachi();

  const [batches, progress, submissions, certificates, topicsToday] =
    await Promise.all([
      supabase
        .from("batches")
        .select("id, name, class_type, start_time")
        .eq("status", "active")
        .order("start_time", { ascending: true }),
      supabase
        .from("batch_progress")
        .select(
          "batch_id, session_type, completed_on, topic:topics(name, module:modules(name, level:levels(name)))",
        )
        .order("completed_on", { ascending: false })
        .limit(400),
      supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted"),
      supabase
        .from("certificates")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("batch_progress")
        .select("id", { count: "exact", head: true })
        .eq("completed_on", today),
    ]);

  const latest = new Map<
    string,
    Partial<Record<SessionType, { topic: string; completed_on: string }>>
  >();
  const counts = new Map<string, number>();

  for (const row of progress.data ?? []) {
    const record = row as Record<string, unknown>;
    const batchId = record.batch_id as string;
    const sessionType = record.session_type as SessionType;
    const topic = first(record.topic as { name?: string } | null);

    counts.set(batchId, (counts.get(batchId) ?? 0) + 1);

    if (!latest.has(batchId)) latest.set(batchId, {});
    const perBatch = latest.get(batchId)!;

    if (!perBatch[sessionType] && topic?.name) {
      perBatch[sessionType] = {
        topic: topic.name,
        completed_on: String(record.completed_on ?? ""),
      };
    }
  }

  const batchRows = (batches.data ?? []).map((row) => {
    const batch = row as OwnerBatchProgress["batch"];
    return {
      batch,
      last: latest.get(batch.id) ?? {},
      started: counts.get(batch.id) ?? 0,
    };
  });

  return {
    activeBatches: batchRows.length,
    topicsToday: topicsToday.count ?? 0,
    pendingSubmissions: submissions.count ?? 0,
    pendingCertificates: certificates.count ?? 0,
    batches: batchRows,
    today,
  };
}

// ---------------------------------------------------------------------------
// Student portal
// ---------------------------------------------------------------------------
export async function getOwnStudent(profileId: string): Promise<Student | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("*")
    .eq("profile_id", profileId)
    .eq("is_archived", false)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  return (data as Student | null) ?? null;
}

export type PortalBatch = {
  id: string;
  name: string;
  class_type: "weekday" | "weekend";
  start_time: string;
};

export async function getPortalBatch(studentId: string): Promise<PortalBatch | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("batch_students")
    .select("batch:batches(id, name, class_type, start_time)")
    .eq("student_id", studentId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  return first((data as { batch?: PortalBatch | null } | null)?.batch ?? null);
}

export type PortalOverview = {
  student: Student | null;
  batch: PortalBatch | null;
  todaySchedule: BatchSchedule[];
  attendanceRate: number | null;
  presentCount: number;
  attendanceCount: number;
  feeRecord: FeeRecord | null;
  recentSubmissions: Array<{
    id: string;
    status: SubmissionStatus;
    marks: number | null;
    submitted_at: string;
    title: string;
  }>;
  today: string;
};

export async function getPortalOverview(
  profileId: string,
): Promise<PortalOverview> {
  const supabase = await createClient();
  const student = await getOwnStudent(profileId);
  const today = todayInKarachi();
  const monthStart = currentMonthStart();
  const weekday = isoDayOfWeek(today);

  if (!student) {
    return {
      student: null,
      batch: null,
      todaySchedule: [],
      attendanceRate: null,
      presentCount: 0,
      attendanceCount: 0,
      feeRecord: null,
      recentSubmissions: [],
      today,
    };
  }

  const batch = await getPortalBatch(student.id);

  const [schedule, attendance, fee, submissions] = await Promise.all([
    batch
      ? supabase
          .from("batch_schedule")
          .select("id, batch_id, day_of_week, session_type, start_time, end_time")
          .eq("batch_id", batch.id)
          .eq("day_of_week", weekday)
          .order("start_time", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("attendance")
      .select("status, date")
      .eq("student_id", student.id)
      .gte("date", monthStart),
    supabase
      .from("fee_records")
      .select("*")
      .eq("student_id", student.id)
      .eq("period_month", monthStart)
      .maybeSingle(),
    supabase
      .from("submissions")
      .select(
        "id, status, marks, submitted_at, assignment:topic_assignments(title)",
      )
      .eq("student_id", student.id)
      .order("submitted_at", { ascending: false })
      .limit(3),
  ]);

  const rows = attendance.data ?? [];
  const presentCount = rows.filter(
    (row) => row.status === "present" || row.status === "late",
  ).length;
  const attendanceRate =
    rows.length > 0 ? Math.round((presentCount / rows.length) * 100) : null;

  return {
    student,
    batch,
    todaySchedule: (schedule.data ?? []) as BatchSchedule[],
    attendanceRate,
    presentCount,
    attendanceCount: rows.length,
    feeRecord: (fee.data as FeeRecord | null) ?? null,
    recentSubmissions: (submissions.data ?? []).map((row) => {
      const record = row as Record<string, unknown>;
      const assignment = first(
        record.assignment as { title?: string } | null,
      );
      return {
        id: String(record.id),
        status: record.status as SubmissionStatus,
        marks: record.marks === null ? null : Number(record.marks),
        submitted_at: String(record.submitted_at),
        title: assignment?.title ?? "Assignment",
      };
    }),
    today,
  };
}
