import { z } from "zod";

export const studentStatusSchema = z.enum([
  "active",
  "frozen",
  "left",
  "completed",
]);

function normalizePkWhatsApp(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+92${digits.slice(1)}`;
  if (value.trim().startsWith("+")) return `+${digits}`;
  return value.trim();
}

function whatsappSchema(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .transform(normalizePkWhatsApp)
    .refine((v) => /^\+92\d{10}$/.test(v), `${label} must be in +92XXXXXXXXXX format.`);
}

export const studentFormSchema = z.object({
  full_name: z.string().trim().min(2, "Student name is required.").max(120),
  father_name: z.string().trim().max(120).optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  cnic_or_bform: z.string().trim().min(5, "CNIC / B-Form is required.").max(30),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  photo_url: z.string().trim().max(500).optional().or(z.literal("")),
  whatsapp_number: whatsappSchema("WhatsApp number"),
  guardian_whatsapp: whatsappSchema("Guardian WhatsApp number"),
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
