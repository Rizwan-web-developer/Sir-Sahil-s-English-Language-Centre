import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { ROLE_HOME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Profile, SessionContext, UserRole } from "@/types/domain";

/**
 * Resolve the authenticated user + profile for the current request.
 * Memoised per render pass with React's cache.
 */
export const getSessionProfile = cache(async (): Promise<SessionContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, phone, avatar_url, is_active, must_change_password, default_panel, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  return {
    profile: profile as Profile,
    email: user.email ?? "",
  };
});

/** Require any authenticated, active profile. */
export async function requireSession(): Promise<SessionContext> {
  const session = await getSessionProfile();

  if (!session) {
    redirect("/login");
  }

  if (!session.profile.is_active) {
    redirect("/login?error=inactive");
  }

  if (session.profile.must_change_password) {
    redirect("/change-password");
  }

  return session;
}

/**
 * Require one of the allowed roles. If the user is signed in but in the wrong
 * area, send them to their own home instead of showing a dead end.
 */
export async function requireRole(allowed: UserRole[]): Promise<SessionContext> {
  const session = await requireSession();

  if (!allowed.includes(session.profile.role)) {
    redirect(ROLE_HOME[session.profile.role]);
  }

  return session;
}

export async function requireStaff(): Promise<SessionContext> {
  return requireRole(["owner", "reception"]);
}

export async function requireOwner(): Promise<SessionContext> {
  return requireRole(["owner"]);
}

export async function requireStudent(): Promise<SessionContext> {
  return requireRole(["student"]);
}
