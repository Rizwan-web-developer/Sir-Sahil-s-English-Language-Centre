import { z } from "zod";

import { t } from "@/lib/i18n";

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, "Enter your email, student code or phone number.")
    .max(160, "That identifier is too long."),
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(72, "Passwords cannot be longer than 72 characters."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(8, t.account.tooShort)
      .max(72, "Passwords cannot be longer than 72 characters.")
      .regex(/[A-Za-z]/, t.account.tooShort)
      .regex(/[0-9]/, t.account.tooShort),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: t.account.mismatch,
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
