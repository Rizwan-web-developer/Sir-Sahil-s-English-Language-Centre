export type EligibilityInput = {
  attendancePct: number;
  avgMarks: number;
  dues: number;
  minAttendance: number;
  minMarks: number;
  blockIfDues: boolean;
};

export function evaluateCertificateEligibility(input: EligibilityInput) {
  const attendanceOk = input.attendancePct >= input.minAttendance;
  const marksOk = input.avgMarks >= input.minMarks;
  const duesOk = !input.blockIfDues || input.dues <= 0;
  return {
    attendanceOk,
    marksOk,
    duesOk,
    eligible: attendanceOk && marksOk && duesOk,
  };
}

export function attendanceRate(statuses: Array<"present" | "absent" | "late" | "leave">) {
  if (statuses.length === 0) return null;
  const present = statuses.filter((s) => s === "present" || s === "late").length;
  return Math.round((present / statuses.length) * 100);
}
