import type { Metadata } from "next";

import { AnnouncementForm } from "@/components/admin/announcement-form";
import { AnnouncementDelete } from "@/components/admin/announcement-delete";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";
import { getAdminAnnouncements } from "@/lib/data/announcements";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  await requireStaff();
  const supabase = await createClient();
  const [{ data: batches }, announcements] = await Promise.all([
    supabase.from("batches").select("id, name").eq("status", "active").order("name"),
    getAdminAnnouncements(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Communication" title="Announcements" description="Post announcements for all students or a specific batch." />
      <AnnouncementForm batches={(batches ?? []).map((b) => ({ id: String(b.id), name: String(b.name) }))} />
      <Card>
        <CardHeader><CardTitle>Recent announcements</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {announcements.length === 0 ? <p className="text-sm text-muted-foreground">No announcements yet.</p> : announcements.map((a) => (
            <div key={a.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{a.title}</p>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">{formatDate(a.created_at)}</p>
                  <AnnouncementDelete id={a.id} title={a.title} />
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">Target: {a.target_type === "all" ? "All students" : `Batch: ${a.batch_name ?? a.batch_id}`}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
