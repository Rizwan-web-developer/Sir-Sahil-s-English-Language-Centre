import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getOwnStudent, getPortalBatch } from "@/lib/data/dashboard";

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  target_type: "all" | "batch";
  batch_id: string | null;
  created_at: string;
  batch_name?: string | null;
};

export async function getAdminAnnouncements(limit = 50) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, body, target_type, batch_id, created_at, batch:batches(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const batch = Array.isArray(r.batch) ? r.batch[0] : r.batch;
    return {
      id: String(r.id),
      title: String(r.title),
      body: String(r.body),
      target_type: r.target_type as "all" | "batch",
      batch_id: (r.batch_id as string | null) ?? null,
      created_at: String(r.created_at),
      batch_name: (batch as { name?: string } | null)?.name ?? null,
    } satisfies AnnouncementRow;
  });
}

export async function getPortalAnnouncements(profileId: string, limit = 10) {
  const student = await getOwnStudent(profileId);
  if (!student) return [] as AnnouncementRow[];
  const batch = await getPortalBatch(student.id);
  const supabase = await createClient();
  let q = supabase
    .from("announcements")
    .select("id, title, body, target_type, batch_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (batch) {
    q = q.or(`target_type.eq.all,and(target_type.eq.batch,batch_id.eq.${batch.id})`);
  } else {
    q = q.eq("target_type", "all");
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: String((r as Record<string, unknown>).id),
    title: String((r as Record<string, unknown>).title),
    body: String((r as Record<string, unknown>).body),
    target_type: (r as Record<string, unknown>).target_type as "all" | "batch",
    batch_id: ((r as Record<string, unknown>).batch_id as string | null) ?? null,
    created_at: String((r as Record<string, unknown>).created_at),
  })) satisfies AnnouncementRow[];
}
