import test from "node:test";
import assert from "node:assert/strict";

import { attendanceRate, evaluateCertificateEligibility } from "../lib/utils/eligibility";

test("attendanceRate counts present and late", () => {
  assert.equal(attendanceRate(["present", "late", "absent", "leave"]), 50);
  assert.equal(attendanceRate([]), null);
});

test("evaluateCertificateEligibility respects thresholds and dues block", () => {
  assert.deepEqual(evaluateCertificateEligibility({
    attendancePct: 80, avgMarks: 60, dues: 0, minAttendance: 75, minMarks: 50, blockIfDues: false,
  }), { attendanceOk: true, marksOk: true, duesOk: true, eligible: true });

  assert.equal(evaluateCertificateEligibility({
    attendancePct: 80, avgMarks: 60, dues: 500, minAttendance: 75, minMarks: 50, blockIfDues: true,
  }).eligible, false);
});
