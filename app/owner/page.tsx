import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  AwardIcon,
  BellIcon,
  ClipboardCheckIcon,
  GraduationCapIcon,
  LayersIcon,
  TargetIcon,
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SessionBadge } from "@/components/shared/session-badge";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { requireOwner } from "@/lib/auth/session";
import { getOwnerOverview } from "@/lib/data/dashboard";
import { formatDate, formatLongDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import type { SessionType } from "@/types/domain";

export const metadata: Metadata = { title: "Teacher Dashboard" };

const sessionTypes: SessionType[] = ["grammar"];

export default async function OwnerOverviewPage() {
  const { profile } = await requireOwner();
  const overview = await getOwnerOverview();
  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, link, read_at, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(8);
  const unread = (notifications ?? []).filter((n) => !(n as Record<string, unknown>).read_at).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={formatLongDate(overview.today)}
        title={`Welcome, ${profile.full_name}`}
        description="Select a batch, track course progress, mark topics completed, and review assignment submissions."
        actions={
          <Link href="/owner/teaching" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <GraduationCapIcon className="size-3.5" />
            Open Batches & Course
          </Link>
        }
      />


      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.dashboard.activeBatches} value={overview.activeBatches} hint="Active batches" icon={LayersIcon} />
        <StatCard label={t.dashboard.topicsToday} value={overview.topicsToday} hint="Across both sessions" icon={TargetIcon} tone="gold" />
        <StatCard label="Pending submissions" value={overview.pendingSubmissions} hint="Need review" icon={ClipboardCheckIcon} tone="neutral" />
        <StatCard label="Notifications" value={unread} hint="Unread updates" icon={BellIcon} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2"><GraduationCapIcon className="size-4 text-muted-foreground" />Batch progress</CardTitle>
            <CardDescription>Open a batch to see students, course progress, and mark topics completed.</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {overview.batches.length === 0 ? (
              <EmptyState compact icon={LayersIcon} title={t.empty.batchesTitle} description={t.empty.genericHint} />
            ) : (
              <div className="space-y-2">
                {overview.batches.map(({ batch, last, started }) => (
                  <Link key={batch.id} href={`/owner/teaching?batch=${batch.id}`} className="group block rounded-lg border bg-background/60 p-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.03]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{batch.name}</p>
                        <Badge variant="outline" className="text-[10px] capitalize">{t.classType[batch.class_type]}</Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {started > 0 ? `${started} topics completed` : t.dashboard.notStarted}
                        <ArrowRightIcon className="ml-1 inline size-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {sessionTypes.map((type) => (
                        <div key={type} className="flex min-w-0 items-center gap-2">
                          <SessionBadge type={type} className="shrink-0" />
                          <span className="truncate text-[11px] text-muted-foreground">
                            {last[type] ? `${last[type]!.topic} • ${formatDate(last[type]!.completed_on)}` : t.dashboard.notStarted}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BellIcon className="size-4" />Notifications</CardTitle><CardDescription>Assignment submissions and updates.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {(notifications ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No notifications yet.</p> : (notifications ?? []).map((n) => {
                const row = n as Record<string, unknown>;
                const unreadRow = !row.read_at;
                return (
                  <Link key={String(row.id)} href={String(row.link ?? "/owner/assignments")} className={`block rounded-lg border p-3 text-sm ${unreadRow ? "border-gold/40 bg-gold/5" : ""}`}>
                    <p className="font-medium">{String(row.title)}</p>
                    <p className="text-xs text-muted-foreground">{String(row.body)}</p>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Teacher shortcuts</CardTitle></CardHeader>
            <CardContent className="grid gap-1.5">
              {[
                { label: "Batches & Course", href: "/owner/teaching", icon: GraduationCapIcon },
                { label: "Assignment Submissions", href: "/owner/assignments?status=submitted", icon: ClipboardCheckIcon },
                { label: "Courses", href: "/owner/curriculum", icon: TargetIcon },
                { label: "Certificates", href: "/owner/certificates", icon: AwardIcon },
              ].map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <Icon className="size-3.5" />
                    {link.label}
                    <ArrowRightIcon className="ml-auto size-3" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
