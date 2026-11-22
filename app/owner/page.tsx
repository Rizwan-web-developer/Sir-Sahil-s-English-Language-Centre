import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  AwardIcon,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireOwner } from "@/lib/auth/session";
import { getOwnerOverview } from "@/lib/data/dashboard";
import { formatDate, formatLongDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { SessionType } from "@/types/domain";

export const metadata: Metadata = { title: "Teaching overview" };

const sessionTypes: SessionType[] = ["conversation", "grammar"];

const workflow = [
  {
    title: "Choose the batch",
    description: "Pick the batch and the session you just taught.",
  },
  {
    title: "Walk the curriculum",
    description: "Level → module → topic. The next topic is always ready.",
  },
  {
    title: "Mark completed",
    description: "Progress is saved per batch, per session, per date.",
  },
];

export default async function OwnerOverviewPage() {
  const { profile } = await requireOwner();
  const overview = await getOwnerOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={formatLongDate(overview.today)}
        title={t.dashboard.ownerTitle}
        description={t.dashboard.ownerSubtitle}
        actions={
          <Link
            href="/owner/teaching"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <GraduationCapIcon className="size-3.5" />
            {t.dashboard.viewTeachingPanel}
          </Link>
        }
      />

      <section className="relative overflow-hidden rounded-2xl bg-[#0d2544] p-5 text-white shadow-sm sm:p-6">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(201,162,39,0.2),transparent_45%),radial-gradient(circle_at_90%_80%,rgba(255,255,255,0.07),transparent_50%)]"
        />
        <div
          aria-hidden
          className="absolute -right-10 -top-16 size-48 rounded-full border border-white/10"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl space-y-2">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
              <span className="h-px w-5 bg-gold" aria-hidden />
              {t.nav.teachingGroup}
            </p>
            <h2 className="font-heading text-xl font-semibold leading-snug sm:text-2xl">
              Pick up exactly where the last class ended.
            </h2>
            <p className="text-sm leading-relaxed text-white/65">
              Conversation and Grammar progress stay separate for every batch, so
              tomorrow&apos;s topic is always one click away.
            </p>
          </div>
          <Link
            href="/owner/teaching"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-gold-foreground shadow-sm transition-colors hover:bg-gold/90"
          >
            {t.dashboard.viewTeachingPanel}
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.dashboard.activeBatches}
          value={overview.activeBatches}
          hint="Weekday & weekend"
          icon={LayersIcon}
        />
        <StatCard
          label={t.dashboard.topicsToday}
          value={overview.topicsToday}
          hint="Across both session tracks"
          icon={TargetIcon}
          tone="gold"
        />
        <StatCard
          label={t.dashboard.pendingSubmissions}
          value={overview.pendingSubmissions}
          hint="Video assignments to review"
          icon={ClipboardCheckIcon}
          tone="neutral"
        />
        <StatCard
          label={t.dashboard.pendingCertificates}
          value={overview.pendingCertificates}
          hint="Level completions"
          icon={AwardIcon}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <GraduationCapIcon className="size-4 text-muted-foreground" />
              Batch progress
            </CardTitle>
            <CardDescription>
              Latest completed topic for each session track.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {overview.batches.length === 0 ? (
              <EmptyState
                compact
                icon={LayersIcon}
                title={t.empty.batchesTitle}
                description={t.empty.genericHint}
              />
            ) : (
              <div className="space-y-2">
                {overview.batches.map(({ batch, last, started }) => (
                  <Link
                    key={batch.id}
                    href="/owner/teaching"
                    className="group block rounded-lg border bg-background/60 p-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{batch.name}</p>
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize"
                        >
                          {t.classType[batch.class_type]}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {started > 0
                          ? `${started} topics completed`
                          : t.dashboard.notStarted}
                        <ArrowRightIcon className="ml-1 inline size-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>

                    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {sessionTypes.map((type) => (
                        <div
                          key={type}
                          className="flex min-w-0 items-center gap-2"
                        >
                          <SessionBadge type={type} className="shrink-0" />
                          <span className="truncate text-[11px] text-muted-foreground">
                            {last[type]
                              ? `${last[type]!.topic} · ${formatDate(last[type]!.completed_on)}`
                              : t.dashboard.notStarted}
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
            <CardHeader>
              <CardTitle>How the panel works</CardTitle>
              <CardDescription>Three steps, every class day.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {workflow.map((step, index) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Teacher shortcuts</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1.5">
              {[
                { label: t.nav.teaching, href: "/owner/teaching", icon: GraduationCapIcon },
                { label: "Curriculum", href: "/owner/curriculum", icon: TargetIcon },
                { label: t.nav.assignments, href: "/owner/assignments", icon: ClipboardCheckIcon },
                { label: t.nav.certificates, href: "/owner/certificates", icon: AwardIcon },
              ].map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
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

      <p className="text-[11px] text-muted-foreground">
        Signed in as {profile.full_name} · {t.roles.owner}
      </p>
    </div>
  );
}
