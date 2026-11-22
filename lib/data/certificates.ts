import "server-only";

import { createClient } from "@/lib/supabase/server";
import { settingNumber } from "@/lib/settings";
import { getSettings } from "@/lib/settings";

type Row = Record<string, unknown>;

export async function getOwnerCertificatesData() {
  const supabase = await createClient();
  const settings = await getSettings();
  const minAttendance = settingNumber(settings, "certificate_min_attendance", 75);
  const minMarks = settingNumber(settings, "certificate_min_marks", 50);
  const blockIfDues = Boolean(settings.certificate_block_if_dues === true || settings.certificate_block_if_dues === "true");

  const [{ data: certs }, { data: students }, { data: levels }, { data: attendance }, { data: submissions }, { data: feeRecords }] = await Promise.all([
    supabase.from("certificates").select("id, certificate_no, student_id, level_id, status, issued_on, verification_token, grade, revoke_reason, student:students(full_name, student_code), level:levels(name, session_type)").order("created_at", { ascending: false }),
    supabase.from("students").select("id, full_name, student_code, status").eq("is_archived", false).eq("status", "active").limit(200),
    supabase.from("levels").select("id, name, session_type, sort_order").order("sort_order"),
    supabase.from("attendance").select("student_id, status"),
    supabase.from("submissions").select("student_id, marks, status, assignment:topic_assignments(topic:topics(module:modules(level_id)))"),
    supabase.from("fee_records").select("student_id, amount_due, discount, amount_paid, status").in("status", ["pending", "partial", "overdue"]),
  ]);

  const attendanceByStudent = new Map<string, { present: number; total: number }>();
  for (const a of (attendance ?? []) as Row[]) {
    const sid = String(a.student_id);
    const v = attendanceByStudent.get(sid) ?? { present: 0, total: 0 };
    v.total += 1;
    if (a.status === "present" || a.status === "late") v.present += 1;
    attendanceByStudent.set(sid, v);
  }

  const marksByStudentLevel = new Map<string, number[]>();
  for (const s of (submissions ?? []) as Row[]) {
    const sid = String(s.student_id);
    const marks = s.marks === null || s.marks === undefined ? null : Number(s.marks);
    if (marks === null || Number.isNaN(marks)) continue;
    const assignment = (Array.isArray(s.assignment) ? s.assignment[0] : s.assignment) as Row | null;
    const topic = assignment ? (Array.isArray(assignment.topic) ? assignment.topic[0] : assignment.topic) as Row | null : null;
    const mod = topic ? (Array.isArray(topic.module) ? topic.module[0] : topic.module) as Row | null : null;
    const levelId = String(mod?.level_id ?? "");
    if (!levelId) continue;
    const key = `${sid}:${levelId}`;
    const arr = marksByStudentLevel.get(key) ?? [];
    arr.push(marks);
    marksByStudentLevel.set(key, arr);
  }

  const duesByStudent = new Map<string, number>();
  for (const f of (feeRecords ?? []) as Row[]) {
    const sid = String(f.student_id);
    const bal = Math.max(0, Number(f.amount_due) - Number(f.discount) - Number(f.amount_paid));
    duesByStudent.set(sid, (duesByStudent.get(sid) ?? 0) + bal);
  }

  const certRows = (certs ?? []).map((c) => {
    const row = c as Row;
    return {
      ...row,
      student: Array.isArray(row.student) ? row.student[0] : row.student,
      level: Array.isArray(row.level) ? row.level[0] : row.level,
    };
  }) as Row[];

  const eligible: Row[] = [];
  for (const st of (students ?? []) as Row[]) {
    const sid = String(st.id);
    const att = attendanceByStudent.get(sid);
    const attendancePct = att && att.total ? Math.round((att.present / att.total) * 100) : 0;
    const dues = duesByStudent.get(sid) ?? 0;
    for (const lvl of (levels ?? []) as Row[]) {
      const lid = String(lvl.id);
      const markArr = marksByStudentLevel.get(`${sid}:${lid}`) ?? [];
      const avgMarks = markArr.length ? Math.round(markArr.reduce((a, b) => a + b, 0) / markArr.length) : 0;
      const existingCert = certRows.find((c) => String(c.student_id) === sid && String(c.level_id) === lid);
      const hasDuesBlock = blockIfDues && dues > 0;
      const isEligible = attendancePct >= minAttendance && avgMarks >= minMarks && !hasDuesBlock;
      if (isEligible || existingCert) {
        eligible.push({
          student: st,
          level: lvl,
          attendancePct,
          avgMarks,
          dues,
          hasDuesBlock,
          isEligible,
          certificate: existingCert ?? null,
        });
      }
    }
  }

  return { certRows, eligible, thresholds: { minAttendance, minMarks, blockIfDues } };
}
