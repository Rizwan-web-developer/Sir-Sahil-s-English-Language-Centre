"use server";

import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/session";
import { ERROR_CODES, ROLE_HOME } from "@/lib/constants";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import {
  changePasswordSchema,
  loginSchema,
  type ChangePasswordInput,
  type LoginInput,
} from "@/lib/validation/auth";
import type { UserRole } from "@/types/domain";

export type LoginResult = { error: string } | undefined;
export type ChangePasswordResult =
  | { error: string; fieldErrors?: Record<string, string> }
  | { success: string }
  | undefined;

/**
 * Sign in staff with email or students with student code / phone.
 * Students are mapped to their generated `<code>@selc.local` auth email.
 */
export async function loginAction(input: LoginInput): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.auth.loginFailed };
  }

  const { identifier, password } = parsed.data;
  const supabase = await createClient();

  let email = identifier.trim();

  if (!email.includes("@")) {
    const { data: resolved, error: resolveError } = await supabase.rpc(
      "resolve_login_email",
      { identifier },
    );

    if (resolveError || !resolved) {
      return { error: ERROR_CODES.invalidCredentials };
    }

    email = String(resolved);
  }

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

  if (authError || !authData.user) {
    return { error: t.auth.loginFailed };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, default_panel")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: ERROR_CODES.missingProfile };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { error: ERROR_CODES.inactive };
  }

  redirect(ROLE_HOME[profile.role as UserRole]);
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Change the signed-in user's password. Re-authenticates first so a stolen
 * device cannot silently lock the real owner out.
 */
export async function changePasswordAction(
  input: ChangePasswordInput,
): Promise<ChangePasswordResult> {
  const session = await requireSession();
  const parsed = changePasswordSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { error: parsed.error.issues[0]?.message ?? t.account.tooShort, fieldErrors };
  }

  const supabase = await createClient();

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: session.email,
    password: parsed.data.currentPassword,
  });

  if (reauthError) {
    return {
      error: t.account.wrongCurrent,
      fieldErrors: { currentPassword: t.account.wrongCurrent },
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (updateError) {
    return { error: updateError.message };
  }

  await supabase.from("profiles").update({ must_change_password: false }).eq("id", session.profile.id);

  return { success: t.account.success };
}
