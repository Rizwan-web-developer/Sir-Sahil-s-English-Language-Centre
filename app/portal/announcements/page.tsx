import type { Metadata } from "next";
import { MegaphoneIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudent } from "@/lib/auth/session";
import { getPortalAnnouncements } from "@/lib/data/announcements";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Announcements" };

export default async function PortalAnnouncementsPage() {
  const { profile } = await requireStudent();
  const announcements = await getPortalAnnouncements(profile.id, 30);
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Updates" title="Announcements" description="Messages from the institute for you and your batch." />
      {announcements.length === 0 ? (
        <EmptyState icon={MegaphoneIcon} title="No announcements" description="Announcements from Sir Sahil and reception will appear here." />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardHeader><CardTitle className="text-sm">{a.title}</CardTitle><p className="text-[11px] text-muted-foreground">{formatDate(a.created_at)}</p></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap text-muted-foreground">{a.body}</p></CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
