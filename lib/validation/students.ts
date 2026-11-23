import { z } from "zod";

export const studentStatusSchema = z.enum([
  "active",
  "frozen",
  "left",
  "completed",
]);

export const studentFormSchema = z.object({
  full_name: z.string().trim().min(2, "Student name is required.").max(120),
  father_name: z.string().trim().max(120).optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  cnic_or_bform: z.string().trim().min(5, "CNIC / B-Form is required.").max(30),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  photo_url: z.string().trim().max(500).optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .min(10, "Phone number is required.")
    .max(20, "Phone number is too long."),
  parent_phone: z.string().trim().max(20).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
  whatsapp_same_as_phone: z.boolean().optional().default(false),
  admission_date: z.string().min(1, "Admission date is required."),
  batch_ids: z.array(z.string().uuid()).optional().default([]),
  monthly_fee: z.coerce.number().min(0, "Monthly fee cannot be negative.").default(0),
  admission_fee: z.coerce.number().min(0).optional().default(0),
  discount: z.coerce.number().min(0, "Discount cannot be negative.").default(0),
  discount_type: z.enum(["amount", "percent"]).optional().default("amount"),
  discount_reason: z.string().trim().max(300).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  status: studentStatusSchema.optional().default("active"),
  /** Login password set at creation time. Required on create, optional on edit. */
  password: z.string().trim().max(100).optional().or(z.literal("")),
});

export type StudentFormInput = z.input<typeof studentFormSchema>;
export type StudentFormValues = z.output<typeof studentFormSchema>;

export const studentArchiveSchema = z.object({
  id: z.string().uuid(),
  confirm: z.literal(true),
});

export const studentStatusChangeSchema = z.object({
  id: z.string().uuid(),
  status: studentStatusSchema,
  reason: z.string().trim().max(500).optional().or(z.literal("")),
  date: z.string().optional().or(z.literal("")),
});
