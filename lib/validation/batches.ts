import { z } from "zod";

export const classTypeSchema = z.enum(["weekday", "weekend"]);
export const batchStatusSchema = z.enum(["active", "closed"]);
export const sessionTypeSchema = z.enum(["conversation", "grammar"]);
export const sessionOrderSchema = z.enum([
  "conversation_then_grammar",
  "grammar_then_conversation",
]);

export const batchScheduleInputSchema = z.object({
  day_of_week: z.coerce.number().int().min(1).max(7),
  session_type: sessionTypeSchema,
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format."),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format."),
});

export const batchFormSchema = z
  .object({
    name: z.string().trim().min(2, "Batch name is required.").max(120),
    class_type: classTypeSchema,
    start_date: z.string().min(1, "Start date is required."),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format."),
    capacity: z.coerce.number().int().min(1, "Capacity must be at least 1.").max(200),
    status: batchStatusSchema.default("active"),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    session_order: sessionOrderSchema.default("conversation_then_grammar"),
    weekdays: z.array(z.coerce.number().int().min(1).max(7)).default([1, 2, 3, 4, 5]),
    schedule: z.array(batchScheduleInputSchema).min(1, "Add at least one schedule row."),
  })
  .refine(
    (value) =>
      value.schedule.every((row) => row.start_time < row.end_time),
    { message: "Session end time must be after start time.", path: ["schedule"] },
  );

export type BatchFormInput = z.input<typeof batchFormSchema>;
export type BatchFormValues = z.output<typeof batchFormSchema>;
