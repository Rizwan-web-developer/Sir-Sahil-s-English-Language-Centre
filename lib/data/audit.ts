import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getAuditLogs(limit = 100) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, entity, entity_id, details, created_at, user:profiles(full_name, role)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const user = Array.isArray(r.user) ? r.user[0] : r.user;
    return {
      id: String(r.id),
      action: String(r.action),
      entity: String(r.entity),
      entity_id: (r.entity_id as string | null) ?? null,
      details: r.details,
      created_at: String(r.created_at),
      user_name: String((user as Record<string, unknown> | null)?.full_name ?? "System"),
      user_role: String((user as Record<string, unknown> | null)?.role ?? "—"),
    };
  });
}
