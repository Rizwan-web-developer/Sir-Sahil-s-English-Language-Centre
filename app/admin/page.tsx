import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  CalendarDaysIcon,
  CalendarX2Icon,
  LayersIcon,
  ReceiptTextIcon,
  ScanBarcodeIcon,
  ScanLineIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SessionBadge } from "@/components/shared/session-badge";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";
import { getAdminOverview } from "@/lib/data/dashboard";
import { formatDate, formatLongDate, formatPKR, formatTime } from "@/lib/format";
import { dayLabel, t } from "@/lib/i18n";
import { isoDayOfWeek } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const quickLinks: Array<{
  label: string;
  href: string;
  icon: LucideIcon;
}> = [
  { label: t.nav.students, href: "/admin/students", icon: UsersIcon },
  { label: t.nav.batches, href: "/admin/batches", icon: LayersIcon },
  { label: t.nav.attendance, href: "/admin/attendance", icon: ScanLineIcon },
  { label: t.nav.fees, href: "/admin/fees", icon: WalletIcon },
];

export default async function AdminDashboardPage() {
  const { profile } = await requireStaff();
  const overview = await getAdminOverview();
  const weekday = isoDayOfWeek(overview.today);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={formatLongDate(overview.today)}
        title={t.dashboard.adminTitle}
        description={t.dashboard.adminSubtitle}
        actions={
          <>
            <Link
              href="/admin/students"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium transition-colors hover:bg-muted"
            >
              <UsersIcon className="size-3.5" />
              {t.dashboard.manageStudents}
            </Link>
            {profile.role === "owner" && (
              <Link
                href="/owner"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <BadgeCheckIcon className="size-3.5" />
                {t.common.goToOwner}
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.dashboard.activeStudents}
          value={overview.activeStudents}
          hint="Enrolled and active"
          icon={UsersIcon}
        />
        <StatCard
          label={t.dashboard.activeBatches}
          value={overview.activeBatches}
          hint={t.classType.weekday + " & " + t.classType.weekend}
          icon={LayersIcon}
          tone="gold"
        />
        <StatCard
          label={t.dashboard.todayAttendance}
          value={overview.attendanceToday}
          hint={dayLabel(weekday)}
          icon={ScanLineIcon}
          tone="neutral"
        />
        <StatCard
          label={t.dashboard.monthCollection}
          value={formatPKR(overview.monthCollection)}
          hint={`${overview.pendingFeeRecords} ${t.dashboard.feesToRecover.toLowerCase()}`}
          icon={WalletIcon}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <CalendarDaysIcon className="size-4 text-muted-foreground" />
              {t.dashboard.todayClasses}
            </CardTitle>
            <CardDescription>
              {dayLabel(weekday)} · {formatDate(overview.today)}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            {overview.todayClasses.length === 0 ? (
              <EmptyState
                compact
                icon={CalendarX2Icon}
                title={t.dashboard.noClassesToday}
                description={t.dashboard.noClassesHint}
              />
            ) : (
              <ul className="divide-y">
                {overview.todayClasses.map((cls) => (
                  <li key={cls.id} className="flex items-center gap-3 py-3 first:pt-2">
                    <div className="w-14 shrink-0">
                      <p className="text-xs font-semibold">
                        {formatTime(cls.start_time)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatTime(cls.end_time)}
                      </p>
                    </div>
                    <span className="h-8 w-px bg-border" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {cls.batch?.name ?? t.common.batch}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {cls.batch?.class_type === "weekend"
                          ? t.classType.weekend
                          : t.classType.weekday}{" "}
                        · {t.common.session}
                      </p>
                    </div>
                    <SessionBadge type={cls.session_type} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.dashboard.quickActions}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex items-center gap-2 rounded-lg border bg-background/60 px-2.5 py-2.5 text-xs font-medium transition-colors hover:border-primary/30 hover:bg-primary/5"
                  >
                    <span className="grid size-7 place-items-center rounded-md bg-primary/8 text-primary">
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{link.label}</span>
                    <ArrowRightIcon className="size-3 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-gold/30 bg-gold/[0.06]">
            <CardContent className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-gold/20 text-gold-foreground dark:text-gold">
                <ScanBarcodeIcon className="size-5" />
              </span>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">Barcode attendance</p>
                  <Badge
                    variant="outline"
                    className="border-gold/40 bg-background/50 text-[10px]"
                  >
                    {t.common.phase} 4
                  </Badge>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  USB scanner, typed student code, name search and camera fallback
                  — built for the reception desk.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <ReceiptTextIcon className="size-4 text-muted-foreground" />
            {t.dashboard.feesToRecover}
          </CardTitle>
          <CardDescription>
            {overview.pendingFeeRecords === 0
              ? "No outstanding fee records. Collections will appear here once billing starts."
              : `${overview.pendingFeeRecords} records need follow-up.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-3">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-background text-primary ring-1 ring-border">
                <WalletIcon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">
                  {formatPKR(overview.monthCollection)} collected
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Current month · {t.settings.currency} PKR
                </p>
              </div>
            </div>
            <Link
              href="/admin/fees"
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium",
                "transition-colors hover:bg-muted",
              )}
            >
              {t.common.viewAll}
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
