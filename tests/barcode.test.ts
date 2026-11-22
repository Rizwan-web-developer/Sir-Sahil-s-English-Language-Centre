import test from "node:test";
import assert from "node:assert/strict";

import { normalizeStudentCode } from "../lib/utils/barcode";

test("normalizeStudentCode handles SELC codes and digits", () => {
  assert.equal(normalizeStudentCode("SELC-0001"), "SELC-0001");
  assert.equal(normalizeStudentCode("selc-12"), "SELC-12");
  assert.equal(normalizeStudentCode("0012"), "SELC-0012");
  assert.equal(normalizeStudentCode("12"), "SELC-0012");
  assert.equal(normalizeStudentCode("  123  "), "SELC-0123");
  assert.equal(normalizeStudentCode(""), "");
});
