import "server-only";

import { todayInKarachi } from "@/lib/format";
import { dayLabel } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import type {
  AttendanceStatus,
  BatchSchedule,
  CertificateStatus,
  FeeRecord,
  Payment,
  SessionType,
  SubmissionStatus,
} from "@/types/domain";

import { getOwnStudent, getPortalBatch, type PortalBatch } from "./dashboard";

/** Supabase returns embedded relations either as an object or an array. */
function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function monthBounds(month: string): { start: string; end: string } {
  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export type TimetableDay = {
  day: number;
  label: string;
  sessions: BatchSchedule[];
};

export type PortalTimetable = {
  batch: PortalBatch | null;
  days: TimetableDay[];
};

/** Full weekly timetable for the student's active batch. */
export async function getPortalTimetable(
  profileId: string,
): Promise<PortalTimetable> {
  const student = await getOwnStudent(profileId);
  const empty: PortalTimetable = { batch: null, days: [] };

  if (!student) return empty;

  const batch = await getPortalBatch(student.id);
  if (!batch) return empty;

  const supabase = await createClient();
  const { data } = await supabase
    .from("batch_schedule")
    .select("id, batch_id, day_of_week, session_type, start_time, end_time")
    .eq("batch_id", batch.id)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  const sessions = (data ?? []) as BatchSchedule[];
  const days: TimetableDay[] = [];

  for (let day = 1; day <= 7; day += 1) {
    const daySessions = sessions.filter((session) => session.day_of_week === day);
    if (daySessions.length > 0) {
      days.push({ day, label: dayLabel(day), sessions: daySessions });
    }
  }

  return { batch, days };
}

export type PortalCertificate = {
  id: string;
  certificate_no: string;
  status: CertificateStatus;
  issued_on: string | null;
  level: string;
  session_type: string | null;
};

/** Certificates approved/issued for the signed-in student. */
export async function getPortalCertificates(
  profileId: string,
): Promise<PortalCertificate[]> {
  const student = await getOwnStudent(profileId);
  if (!student) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("certificates")
    .select(
      "id, certificate_no, status, issued_on, level:levels(name, session_type)",
    )
    .eq("student_id", student.id)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const levelValue = record.level as
      | { name?: string; session_type?: string }
      | Array<{ name?: string; session_type?: string }>
      | null;
    const level = Array.isArray(levelValue) ? levelValue[0] : levelValue;

    return {
      id: String(record.id),
      certificate_no: String(record.certificate_no),
      status: record.status as CertificateStatus,
      issued_on: (record.issued_on as string | null) ?? null,
      level: level?.name ?? "Level",
      session_type: level?.session_type ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------
export type PortalAttendanceRecord = {
  id: string;
  date: string;
  session_type: SessionType;
  status: AttendanceStatus;
  batch_name: string | null;
};

export type PortalAttendance = {
  month: string;
  records: PortalAttendanceRecord[];
  counts: Record<AttendanceStatus, number>;
  /** Present + late, as a share of marked sessions. */
  rate: number | null;
  totalMarked: number;
};

/** Attendance for one calendar month (YYYY-MM) in the student's timezone. */
export async function getPortalAttendance(
  profileId: string,
  month: string,
): Promise<PortalAttendance> {
  const empty: PortalAttendance = {
    month,
    records: [],
    counts: { present: 0, absent: 0, late: 0, leave: 0 },
    rate: null,
    totalMarked: 0,
  };

  const student = await getOwnStudent(profileId);
  if (!student) return empty;

  const { start, end } = monthBounds(month);
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendance")
    .select("id, date, session_type, status, batch:batches(name)")
    .eq("student_id", student.id)
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: false })
    .order("session_type", { ascending: true });

  const records = (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const batch = first(record.batch as { name?: string } | null);
    return {
      id: String(record.id),
      date: String(record.date),
      session_type: record.session_type as SessionType,
      status: record.status as AttendanceStatus,
      batch_name: batch?.name ?? null,
    };
  });

  const counts: Record<AttendanceStatus, number> = {
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
  };
  for (const record of records) counts[record.status] += 1;

  const totalMarked = records.length;
  const rate =
    totalMarked > 0
      ? Math.round(((counts.present + counts.late) / totalMarked) * 100)
      : null;

  return { month, records, counts, rate, totalMarked };
}

// ---------------------------------------------------------------------------
// Course progress
// ---------------------------------------------------------------------------
export type ProgressTopic = {
  id: string;
  name: string;
  completed_on: string | null;
};

export type ProgressModule = {
  id: string;
  name: string;
  topics: ProgressTopic[];
  completed: number;
};

export type ProgressLevel = {
  id: string;
  name: string;
  session_type: SessionType;
  modules: ProgressModule[];
  totalTopics: number;
  completedTopics: number;
  percent: number;
};

export type PortalProgress = {
  batch: PortalBatch | null;
  levels: ProgressLevel[];
};

/**
 * Curriculum tree with the batch's completions applied. Progress belongs to
 * the batch (not the student), which is how the institute teaches.
 */
export async function getPortalProgress(
  profileId: string,
): Promise<PortalProgress> {
  const student = await getOwnStudent(profileId);
  if (!student) return { batch: null, levels: [] };

  const batch = await getPortalBatch(student.id);
  if (!batch) return { batch: null, levels: [] };

  const supabase = await createClient();
  const [curriculum, completions] = await Promise.all([
    supabase
      .from("levels")
      .select(
        "id, name, session_type, sort_order, modules(id, name, sort_order, topics(id, name, sort_order))",
      )
      .order("session_type", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase
      .from("batch_progress")
      .select("topic_id, completed_on")
      .eq("batch_id", batch.id),
  ]);

  const completed = new Map<string, string>();
  for (const row of completions.data ?? []) {
    completed.set(String(row.topic_id), String(row.completed_on));
  }

  const levels = (curriculum.data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const rawModules = (record.modules as Array<Record<string, unknown>>) ?? [];

    const modules: ProgressModule[] = rawModules
      .slice()
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
      .map((moduleRow) => {
        const rawTopics =
          (moduleRow.topics as Array<Record<string, unknown>>) ?? [];
        const topics: ProgressTopic[] = rawTopics
          .slice()
          .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
          .map((topicRow) => {
            const topicId = String(topicRow.id);
            return {
              id: topicId,
              name: String(topicRow.name),
              completed_on: completed.get(topicId) ?? null,
            };
          });

        return {
          id: String(moduleRow.id),
          name: String(moduleRow.name),
          topics,
          completed: topics.filter((topic) => topic.completed_on).length,
        };
      });

    const totalTopics = modules.reduce(
      (sum, module) => sum + module.topics.length,
      0,
    );
    const completedTopics = modules.reduce(
      (sum, module) => sum + module.completed,
      0,
    );

    return {
      id: String(record.id),
      name: String(record.name),
      session_type: record.session_type as SessionType,
      modules,
      totalTopics,
      completedTopics,
      percent:
        totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0,
    };
  });

  return { batch, levels };
}

// ---------------------------------------------------------------------------
// Fees
// ---------------------------------------------------------------------------
export type PortalFeeRecord = FeeRecord & {
  payments: Payment[];
  balance: number;
};

export type PortalFees = {
  records: PortalFeeRecord[];
  totalDue: number;
  totalPaid: number;
  /** Agreed monthly fee on the student record (before invoice discounts). */
  monthlyFee: number | null;
};

/** Invoice history with the payments attached to each invoice. */
export async function getPortalFees(profileId: string): Promise<PortalFees> {
  const student = await getOwnStudent(profileId);
  if (!student) {
    return { records: [], totalDue: 0, totalPaid: 0, monthlyFee: null };
  }

  const supabase = await createClient();
  const [fees, payments] = await Promise.all([
    supabase
      .from("fee_records")
      .select("*")
      .eq("student_id", student.id)
      .order("period_month", { ascending: false }),
    supabase
      .from("payments")
      .select("*")
      .eq("student_id", student.id)
      .order("paid_on", { ascending: false }),
  ]);

  const byFee = new Map<string, Payment[]>();
  for (const payment of (payments.data ?? []) as Payment[]) {
    if (!payment.fee_record_id) continue;
    const list = byFee.get(payment.fee_record_id) ?? [];
    list.push(payment);
    byFee.set(payment.fee_record_id, list);
  }

  const records = ((fees.data ?? []) as FeeRecord[]).map((fee) => {
    const balance = Math.max(
      0,
      Number(fee.amount_due) - Number(fee.discount) - Number(fee.amount_paid),
    );
    return {
      ...fee,
      payments: byFee.get(fee.id) ?? [],
      balance,
    };
  });

  return {
    records,
    totalDue: records.reduce(
      (sum, fee) => sum + (fee.status === "waived" ? 0 : fee.balance),
      0,
    ),
    totalPaid: records.reduce((sum, fee) => sum + Number(fee.amount_paid), 0),
    monthlyFee: Number(student.monthly_fee ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------
export type PortalSubmission = {
  id: string;
  title: string;
  instructions: string | null;
  session_type: SessionType;
  topic: string | null;
  level: string | null;
  status: SubmissionStatus;
  marks: number | null;
  feedback: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  has_video: boolean;
};

/** The student's own submissions with marks and feedback. */
export async function getPortalAssignments(
  profileId: string,
): Promise<PortalSubmission[]> {
  const student = await getOwnStudent(profileId);
  if (!student) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("submissions")
    .select(
      "id, status, marks, feedback, submitted_at, reviewed_at, video_key, video_url, assignment:topic_assignments(title, instructions, session_type, topic:topics(name, module:modules(name, level:levels(name))))",
    )
    .eq("student_id", student.id)
    .order("submitted_at", { ascending: false });

  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const assignment = first<Record<string, unknown>>(
      record.assignment as Record<string, unknown> | Record<string, unknown>[] | null,
    );
    const topic = assignment
      ? first<Record<string, unknown>>(
          assignment.topic as Record<string, unknown> | Record<string, unknown>[] | null,
        )
      : null;
    const curriculumModule = topic
      ? first<Record<string, unknown>>(
          topic.module as Record<string, unknown> | Record<string, unknown>[] | null,
        )
      : null;
    const level = curriculumModule
      ? first<Record<string, unknown>>(
          curriculumModule.level as
            | Record<string, unknown>
            | Record<string, unknown>[]
            | null,
        )
      : null;

    return {
      id: String(record.id),
      title: String(assignment?.title ?? "Assignment"),
      instructions: (assignment?.instructions as string | null) ?? null,
      session_type: (assignment?.session_type as SessionType) ?? "grammar",
      topic: (topic?.name as string | undefined) ?? null,
      level: (level?.name as string | undefined) ?? null,
      status: record.status as SubmissionStatus,
      marks: record.marks === null ? null : Number(record.marks),
      feedback: (record.feedback as string | null) ?? null,
      submitted_at: String(record.submitted_at),
      reviewed_at: (record.reviewed_at as string | null) ?? null,
      has_video: Boolean(record.video_key ?? record.video_url),
    };
  });
}

export type PortalAssignmentTask = {
  assignment_id: string;
  title: string;
  instructions: string | null;
  session_type: SessionType;
  topic_name: string | null;
  level_name: string | null;
  due_days: number | null;
  submission: {
    id: string;
    status: SubmissionStatus;
    marks: number | null;
    feedback: string | null;
    video_key: string | null;
    submitted_at: string;
  } | null;
};

export async function getPortalAssignmentTasks(profileId: string): Promise<PortalAssignmentTask[]> {
  const student = await getOwnStudent(profileId);
  if (!student) return [];
  const batch = await getPortalBatch(student.id);
  if (!batch) return [];

  const supabase = await createClient();
  const { data: progress } = await supabase
    .from("batch_progress")
    .select("topic_id")
    .eq("batch_id", batch.id);
  const topicIds = Array.from(new Set((progress ?? []).map((r) => String((r as Record<string, unknown>).topic_id))));
  if (topicIds.length === 0) return [];

  const [{ data: assignments }, { data: subs }] = await Promise.all([
    supabase
      .from("topic_assignments")
      .select("id, title, instructions, session_type, topic_id, topic:topics(name, module:modules(name, level:levels(name)))")
      .in("topic_id", topicIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("submissions")
      .select("id, assignment_id, status, marks, feedback, video_key, submitted_at")
      .eq("student_id", student.id),
  ]);

  const subByAssignment = new Map<string, Record<string, unknown>>();
  for (const s of (subs ?? []) as Array<Record<string, unknown>>) subByAssignment.set(String(s.assignment_id), s);

  return (assignments ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const topic = first(r.topic as Record<string, unknown> | Record<string, unknown>[] | null);
    const mod = topic ? first(topic.module as Record<string, unknown> | Record<string, unknown>[] | null) : null;
    const level = mod ? first(mod.level as Record<string, unknown> | Record<string, unknown>[] | null) : null;
    const sub = subByAssignment.get(String(r.id));
    return {
      assignment_id: String(r.id),
      title: String(r.title),
      instructions: (r.instructions as string | null) ?? null,
      session_type: r.session_type as SessionType,
      topic_name: (topic?.name as string | undefined) ?? null,
      level_name: (level?.name as string | undefined) ?? null,
      due_days: null,
      submission: sub ? {
        id: String(sub.id),
        status: sub.status as SubmissionStatus,
        marks: sub.marks === null ? null : Number(sub.marks),
        feedback: (sub.feedback as string | null) ?? null,
        video_key: (sub.video_key as string | null) ?? null,
        submitted_at: String(sub.submitted_at),
      } : null,
    } satisfies PortalAssignmentTask;
  });
}

/** Current month key in Asia/Karachi, used by the attendance calendar. */
export function currentPortalMonth(): string {
  return todayInKarachi().slice(0, 7);
}

