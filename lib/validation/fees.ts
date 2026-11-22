import { z } from "zod";

export const paymentMethodSchema = z.enum([
  "cash",
  "bank_transfer",
  "jazzcash",
  "easypaisa",
  "card",
  "other",
]);

export const feeStatusSchema = z.enum([
  "pending",
  "partial",
  "paid",
  "waived",
  "overdue",
]);

export const generateDuesSchema = z.object({
  period_month: z.string().regex(/^\d{4}-\d{2}-01$/, "Use first day of month (YYYY-MM-01)."),
});

export const collectPaymentSchema = z.object({
  student_id: z.string().uuid(),
  fee_record_ids: z.array(z.string().uuid()).min(1, "Select at least one fee record."),
  amount: z.coerce.number().positive("Amount must be greater than 0."),
  method: paymentMethodSchema,
  paid_on: z.string().min(1, "Payment date is required."),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CollectPaymentInput = z.input<typeof collectPaymentSchema>;
export type CollectPaymentValues = z.output<typeof collectPaymentSchema>;

export const voidPaymentSchema = z.object({
  payment_id: z.string().uuid(),
  reason: z.string().trim().min(3, "Reason is required.").max(500),
});
