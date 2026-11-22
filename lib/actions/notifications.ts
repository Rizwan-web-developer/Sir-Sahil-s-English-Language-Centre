"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationReadAction(id: string) {
  const session = await requireSession();
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", session.profile.id);
  revalidatePath("/owner");
  revalidatePath("/admin");
}

export async function markAllNotificationsReadAction() {
  const session = await requireSession();
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", session.profile.id).is("read_at", null);
  revalidatePath("/owner");
  revalidatePath("/admin");
}
