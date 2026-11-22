import test from "node:test";
import assert from "node:assert/strict";

import { allocatePayment } from "../lib/utils/fees";

test("allocatePayment applies oldest-first and marks paid/partial", () => {
  const result = allocatePayment([
    { id: "a", due: 5000, discount: 0, paid: 0, status: "pending" },
    { id: "b", due: 5000, discount: 500, paid: 0, status: "pending" },
  ], 7000);

  assert.deepEqual(result.updates, [
    { id: "a", amount_paid: 5000, status: "paid" },
    { id: "b", amount_paid: 2000, status: "partial" },
  ]);
  assert.equal(result.remaining, 0);
});
