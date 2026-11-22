import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  BookOpenCheckIcon,
  CalendarCheckIcon,
  CalendarOffIcon,
  CalendarDaysIcon,
  ClipboardCheckIcon,
  IdCardIcon,
  MegaphoneIcon,
  WalletIcon,
} from "lucide-react";

import { requireStudent } from "@/lib/auth/session";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SessionBadge } from "@/components/shared/session-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPortalAnnouncements } from "@/lib/data/announcements";
import { getPortalOverview } from "@/lib/data/dashboard";
import {
  formatDate,
  formatPKR,
  formatTime,
  greetingForNow,
} from "@/lib/format";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };

export default async function PortalHomePage() {
  const { profile } = await requireStudent();
  const [overview, announcements] = await Promise.all([
    getPortalOverview(profile.id),
    getPortalAnnouncements(profile.id, 3),
  ]);
  const { student, batch } = overview;

  if (!student) {
    return (
      <div className="space-y-5">
        <PageHeader
          title={t.dashboard.portalTitle}
          description={t.app.tagline}
        />
        <Card>
          <CardContent>
            <EmptyState
              icon={IdCardIcon}
              title="Student record not linked"
              description="Your login works, but it is not linked to a student profile yet. Please ask the reception to connect your account."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const balance = Math.max(
    0,
    Number(overview.feeRecord?.amount_due ?? 0) -
      Number(overview.feeRecord?.discount ?? 0) -
      Number(overview.feeRecord?.amount_paid ?? 0),
  );

  const feeStatus = overview.feeRecord?.status;
  const feeLabel = feeStatus ? t.feeStatus[feeStatus] : t.dashboard.noInvoice;

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <section className="relative overflow-hidden rounded-2xl bg-[#0d2544] p-5 text-white shadow-sm">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(201,162,39,0.2),transparent_45%),radial-gradient(circle_at_90%_85%,rgba(255,255,255,0.06),transparent_50%)]"
        />
        <div className="relative space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
            {greetingForNow()}
          </p>
          <div>
            <h1 className="font-heading text-2xl font-semibold leading-tight">
              {student.full_name}
            </h1>
            <p className="mt-1 text-xs text-white/60">{t.dashboard.portalSubtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full bg-white/10 px-2.5 py-1 font-mono tracking-wide ring-1 ring-white/10">
              {student.student_code}
            </span>
            {batch && (
              <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/10">
                {batch.name} · {t.classType[batch.class_type]}
              </span>
            )}
            {student.status !== "active" && (
              <span className="rounded-full bg-gold/20 px-2.5 py-1 font-medium text-gold">
                {t.studentStatus[student.status]}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Today's classes */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarDaysIcon className="size-4 text-muted-foreground" />
            {t.common.today}
            <span className="ml-auto text-[11px] font-normal text-muted-foreground">
              {formatDate(overview.today, { weekday: "short", day: "numeric", month: "short" })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {overview.todaySchedule.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed px-3 py-4">
              <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
                <CalendarOffIcon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{t.dashboard.noClassToday}</p>
                <p className="text-[11px] text-muted-foreground">
                  Check the timetable for your weekly schedule.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {overview.todaySchedule.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center gap-3 rounded-lg px-1 py-2"
                >
                  <div className="w-14 shrink-0">
                    <p className="text-xs font-semibold">
                      {formatTime(session.start_time)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatTime(session.end_time)}
                    </p>
                  </div>
                  <span className="h-7 w-px bg-border" aria-hidden />
                  <p className="min-w-0 flex-1 truncate text-sm">
                    {batch?.name ?? t.common.batch}
                  </p>
                  <SessionBadge type={session.session_type} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance + fee */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarCheckIcon className="size-4 text-muted-foreground" />
              {t.dashboard.attendanceRate}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-heading text-2xl font-semibold">
                {overview.attendanceRate === null
                  ? "—"
                  : `${overview.attendanceRate}%`}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {overview.presentCount} / {overview.attendanceCount} sessions
              </p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  overview.attendanceRate === null
                    ? "bg-muted-foreground/30"
                    : overview.attendanceRate >= 75
                      ? "bg-success"
                      : "bg-gold",
                )}
                style={{ width: `${overview.attendanceRate ?? 0}%` }}
              />
            </div>
            <Link
              href="/portal/attendance"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              {t.common.viewAll}
              <ArrowRightIcon className="size-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <WalletIcon className="size-4 text-muted-foreground" />
              {t.dashboard.feeStatus}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-heading text-2xl font-semibold">
                  {overview.feeRecord ? formatPKR(balance) : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {overview.feeRecord
                    ? `Due ${formatDate(overview.feeRecord.due_date)}`
                    : t.dashboard.noInvoice}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "capitalize",
                  feeStatus === "paid" &&
                    "border-success/30 bg-success/10 text-success",
                  feeStatus === "overdue" &&
                    "border-destructive/30 bg-destructive/10 text-destructive",
                  (!feeStatus || feeStatus === "pending" || feeStatus === "partial") &&
                    "border-gold/40 bg-gold/10 text-gold-foreground dark:text-gold",
                )}
              >
                {feeLabel}
              </Badge>
            </div>
            <Link
              href="/portal/fees"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              {t.common.details}
              <ArrowRightIcon className="size-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ClipboardCheckIcon className="size-4 text-muted-foreground" />
            {t.common.assignments}
          </CardTitle>
          <CardDescription>{t.dashboard.noSubmissionsHint}</CardDescription>
        </CardHeader>
        <CardContent>
          {overview.recentSubmissions.length === 0 ? (
            <EmptyState
              compact
              icon={ClipboardCheckIcon}
              title={t.dashboard.noSubmissions}
              description={t.dashboard.noSubmissionsHint}
            />
          ) : (
            <div className="space-y-2">
              {overview.recentSubmissions.map((submission) => (
                <Link
                  key={submission.id}
                  href="/portal/assignments"
                  className="flex items-center gap-3 rounded-lg border bg-background/60 px-3 py-2.5 transition-colors hover:border-primary/30"
                >
                  <span className="grid size-8 place-items-center rounded-md bg-primary/8 text-primary">
                    <BookOpenCheckIcon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{submission.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(submission.submitted_at)}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {t.submissionStatus[submission.status]}
                  </Badge>
                  {submission.marks !== null && (
                    <span className="text-sm font-semibold tabular-nums">
                      {submission.marks}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <MegaphoneIcon className="size-4 text-muted-foreground" />
            Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="rounded-lg border bg-background/60 p-3">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{a.body}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">{formatDate(a.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/portal/id-card"
          className="flex items-center gap-2 rounded-xl border bg-card p-3 text-xs font-medium transition-colors hover:border-primary/30"
        >
          <span className="grid size-8 place-items-center rounded-md bg-primary/8 text-primary">
            <IdCardIcon className="size-4" />
          </span>
          My ID Card
          <ArrowRightIcon className="ml-auto size-3 text-muted-foreground" />
        </Link>
        <Link
          href="/portal/timetable"
          className="flex items-center gap-2 rounded-xl border bg-card p-3 text-xs font-medium transition-colors hover:border-primary/30"
        >
          <span className="grid size-8 place-items-center rounded-md bg-primary/8 text-primary">
            <CalendarDaysIcon className="size-4" />
          </span>
          {t.nav.timetable}
          <ArrowRightIcon className="ml-auto size-3 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
