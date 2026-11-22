import type { Metadata } from "next";
import { ClipboardCheckIcon } from "lucide-react";

import { AssignmentTaskCard } from "@/components/portal/assignment-task-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireStudent } from "@/lib/auth/session";
import { getPortalAssignmentTasks } from "@/lib/data/portal";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Assignments" };

export default async function PortalAssignmentsPage() {
  const { profile } = await requireStudent();
  const tasks = await getPortalAssignmentTasks(profile.id);
  const reviewed = tasks.filter((t) => t.submission?.status === "reviewed");
  const marked = reviewed.filter((t) => t.submission?.marks !== null && t.submission?.marks !== undefined);
  const avg = marked.length ? Math.round(marked.reduce((s, t) => s + Number(t.submission?.marks ?? 0), 0) / marked.length) : null;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={t.nav.portalGroup} title={t.nav.assignments} description="Assignments for topics completed in your batch. Upload videos, track review and feedback." />

      <div className="grid grid-cols-2 gap-3">
        <Card className="gap-1 py-4"><CardContent className="px-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Reviewed</p><p className="font-heading text-2xl font-semibold">{reviewed.length}</p><p className="text-[11px] text-muted-foreground">of {tasks.length} assignments</p></CardContent></Card>
        <Card className="gap-1 py-4"><CardContent className="px-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Average marks</p><p className="font-heading text-2xl font-semibold">{avg === null ? "—" : `${avg}/100`}</p><p className="text-[11px] text-muted-foreground">{marked.length} marked</p></CardContent></Card>
      </div>

      {tasks.length === 0 ? (
        <EmptyState icon={ClipboardCheckIcon} title={t.empty.submissionsTitle} description="Assignments appear here when your teacher completes topics in your batch." />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => <AssignmentTaskCard key={task.assignment_id} task={task} />)}
        </div>
      )}
    </div>
  );
}
