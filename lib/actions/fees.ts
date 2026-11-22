"use server";

import { revalidatePath } from "next/cache";

import { requireRole, requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { collectPaymentSchema, generateDuesSchema, voidPaymentSchema, type CollectPaymentInput } from "@/lib/validation/fees";

type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string };

type FeeRecordRow = {
  id: string;
  student_id: string;
  amount_due: number;
  discount: number;
  amount_paid: number;
  due_date: string;
  status: string;
};

function nextReceiptNo(last: string | null) {
  const m = String(last ?? "").match(/(\d+)/);
  const n = m ? Number(m[1]) : 0;
  return `RCPT-${String(n + 1).padStart(6, "0")}`;
}

function computeStatus(amountDue: number, discount: number, amountPaid: number, dueDate: string, waived = false) {
  const balance = Math.max(0, amountDue - discount - amountPaid);
  if (waived) return "waived" as const;
  if (balance <= 0) return "paid" as const;
  const today = new Date().toISOString().slice(0, 10);
  if (amountPaid > 0) return "partial" as const;
  if (dueDate < today) return "overdue" as const;
  return "pending" as const;
}

export async function generateDuesAction(raw: { period_month: string }): Promise<ActionResult<{ created: number; skipped: number }>> {
  await requireStaff();
  const parsed = generateDuesSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid month." };
  const periodMonth = parsed.data.period_month;
  const supabase = await createClient();

  const { data: students, error: sErr } = await supabase
    .from("students")
    .select("id, monthly_fee, discount, status, is_archived")
    .eq("is_archived", false)
    .eq("status", "active");
  if (sErr) return { ok: false, error: sErr.message };

  const { data: existing } = await supabase
    .from("fee_records")
    .select("student_id")
    .eq("period_month", periodMonth);
  const existingSet = new Set((existing ?? []).map((r) => String((r as { student_id: string }).student_id)));

  const dueDay = 10;
  const dueDate = `${periodMonth.slice(0, 7)}-${String(dueDay).padStart(2, "0")}`;
  const rows = (students ?? [])
    .filter((s) => !existingSet.has(String((s as { id: string }).id)))
    .map((s) => {
      const st = s as { id: string; monthly_fee: number | null; discount: number | null };
      return {
        student_id: st.id,
        period_month: periodMonth,
        amount_due: Number(st.monthly_fee ?? 0),
        discount: Number(st.discount ?? 0),
        amount_paid: 0,
        due_date: dueDate,
        status: "pending" as const,
      };
    });

  if (rows.length > 0) {
    const { error } = await supabase.from("fee_records").insert(rows);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/admin/fees");
  return { ok: true, data: { created: rows.length, skipped: (students ?? []).length - rows.length }, message: `Generated ${rows.length} fee records.` };
}

export async function collectPaymentAction(raw: CollectPaymentInput): Promise<ActionResult<{ receiptNo: string; paymentId: string }>> {
  const session = await requireStaff();
  const parsed = collectPaymentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payment." };
  const v = parsed.data;
  const supabase = await createClient();

  const { data: records, error: recErr } = await supabase
    .from("fee_records")
    .select("*")
    .eq("student_id", v.student_id)
    .in("id", v.fee_record_ids)
    .order("period_month", { ascending: true });
  if (recErr || !records?.length) return { ok: false, error: recErr?.message ?? "Fee records not found." };

  const typedRecords = records as unknown as FeeRecordRow[];
  let remaining = Number(v.amount);
  const totalBalance = typedRecords.reduce((s, r) => s + Math.max(0, Number(r.amount_due) - Number(r.discount) - Number(r.amount_paid)), 0);
  if (remaining > totalBalance + 0.01) return { ok: false, error: "Amount exceeds outstanding balance for selected records." };

  const { data: lastPayment } = await supabase.from("payments").select("receipt_no").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const receiptNo = nextReceiptNo((lastPayment as { receipt_no?: string | null } | null)?.receipt_no ?? null);

  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .insert({
      student_id: v.student_id,
      amount: v.amount,
      method: v.method,
      paid_on: v.paid_on,
      receipt_no: receiptNo,
      received_by: session.profile.id,
      notes: [v.note, v.reference ? `Ref: ${v.reference}` : null].filter(Boolean).join(" | ") || null,
      fee_record_id: typedRecords.length === 1 ? typedRecords[0].id : null,
    })
    .select("id")
    .single();
  if (payErr || !payment) return { ok: false, error: payErr?.message ?? "Could not record payment." };

  for (const r of typedRecords) {
    if (remaining <= 0) break;
    const balance = Math.max(0, Number(r.amount_due) - Number(r.discount) - Number(r.amount_paid));
    const apply = Math.min(balance, remaining);
    if (apply <= 0) continue;
    const newPaid = Number(r.amount_paid) + apply;
    const status = computeStatus(Number(r.amount_due), Number(r.discount), newPaid, String(r.due_date), r.status === "waived");
    await supabase.from("fee_records").update({ amount_paid: newPaid, status }).eq("id", r.id);
    remaining -= apply;
  }

  revalidatePath("/admin/fees");
  revalidatePath(`/admin/students/${v.student_id}`);
  return { ok: true, data: { receiptNo, paymentId: String((payment as { id: string }).id) }, message: `Payment recorded. Receipt ${receiptNo}.` };
}

export async function voidPaymentAction(raw: { payment_id: string; reason: string }): Promise<ActionResult> {
  await requireRole(["owner"]);
  const parsed = voidPaymentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  const supabase = await createClient();
  const { data: payment } = await supabase.from("payments").select("*").eq("id", parsed.data.payment_id).maybeSingle();
  if (!payment) return { ok: false, error: "Payment not found." };
  const p = payment as { id: string; notes?: string | null; fee_record_id?: string | null; amount?: number };
  await supabase.from("payments").update({ amount: 0, notes: [p.notes, `VOIDED: ${parsed.data.reason}`].filter(Boolean).join(" | ") }).eq("id", p.id);
  revalidatePath("/admin/fees");
  return { ok: true, data: undefined, message: "Payment voided." };
}
