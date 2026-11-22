export type FeeAllocationRow = {
  id: string;
  due: number;
  discount: number;
  paid: number;
  status: string;
};

export function allocatePayment(rows: FeeAllocationRow[], amount: number) {
  let remaining = Math.max(0, amount);
  const updates: Array<{ id: string; amount_paid: number; status: "paid" | "partial" }> = [];
  for (const r of rows) {
    if (remaining <= 0) break;
    const balance = Math.max(0, r.due - r.discount - r.paid);
    if (balance <= 0) continue;
    const apply = Math.min(balance, remaining);
    const nextPaid = r.paid + apply;
    const nextStatus = nextPaid >= r.due - r.discount ? "paid" : "partial";
    updates.push({ id: r.id, amount_paid: nextPaid, status: nextStatus });
    remaining -= apply;
  }
  return { updates, remaining };
}
