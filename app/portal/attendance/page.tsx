import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheckIcon,
  CalendarOffIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

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
import { requireStudent } from "@/lib/auth/session";
import {
  currentPortalMonth,
  getPortalAttendance,
  type PortalAttendanceRecord,
} from "@/lib/data/portal";
import { formatDate, formatMonth, isoDayOfWeek } from "@/lib/format";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types/domain";

export const metadata: Metadata = { title: "Attendance" };

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: "bg-success",
  late: "bg-gold",
  leave: "bg-muted-foreground/50",
  absent: "bg-destructive",
};

const STATUS_BADGES: Record<AttendanceStatus, string> = {
  present: "border-success/30 bg-success/10 text-success",
  late: "border-gold/40 bg-gold/10 text-gold-foreground dark:text-gold",
  leave: "border-border bg-muted text-muted-foreground",
  absent: "border-destructive/30 bg-destructive/10 text-destructive",
};

/** Present wins over late, then leave, then absent when a day has two sessions. */
const PRIORITY: Record<AttendanceStatus, number> = {
  present: 3,
  late: 2,
  leave: 1,
  absent: 0,
};

function shiftMonth(month: string, delta: number): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthIndex - 1 + delta, 1));
  return shifted.toISOString().slice(0, 7);
}

function parseMonth(value: string | undefined): string {
  if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value;
  return currentPortalMonth();
}

export default async function PortalAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { profile } = await requireStudent();
  const params = await searchParams;
  const month = parseMonth(params.m);
  const attendance = await getPortalAttendance(profile.id, month);

  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw);
  const daysInMonth = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const startsOn = isoDayOfWeek(`${month}-01`);

  const dayStatus = new Map<string, AttendanceStatus>();
  for (const record of attendance.records) {
    const current = dayStatus.get(record.date);
    if (!current || PRIORITY[record.status] > PRIORITY[current]) {
      dayStatus.set(record.date, record.status);
    }
  }

  const grouped = new Map<string, PortalAttendanceRecord[]>();
  for (const record of attendance.records) {
    const list = grouped.get(record.date) ?? [];
    list.push(record);
    grouped.set(record.date, list);
  }

  // Single grammar session only.

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t.nav.portalGroup}
        title={t.nav.attendance}
        description="Every class day — marked at reception."
      />

      <div className="grid grid-cols-2 gap-3">
        <Card className="gap-1 py-4">
          <CardContent className="px-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Overall attendance</p>
            <p className="font-heading text-2xl font-semibold">{attendance.rate === null ? "—" : `${attendance.rate}%`}</p>
            <p className="text-[11px] text-muted-foreground">{attendance.counts.present + attendance.counts.late} / {attendance.totalMarked} sessions</p>
          </CardContent>
        </Card>
        <Card className="gap-1 py-4">
          <CardContent className="space-y-1 px-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">This month</p>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {(["present", "late", "absent", "leave"] as const).map((key) => (
                <Badge key={key} variant="outline" className={cn("capitalize", STATUS_BADGES[key])}>
                  {attendance.counts[key]} {t.attendance[key]}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">
              {formatMonth(`${month}-01`)}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Link
                href={`/portal/attendance?m=${shiftMonth(month, -1)}`}
                aria-label="Previous month"
                className="grid size-8 place-items-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronLeftIcon className="size-4" />
              </Link>
              <Link
                href="/portal/attendance"
                className="rounded-md border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {t.common.today}
              </Link>
              <Link
                href={`/portal/attendance?m=${shiftMonth(month, 1)}`}
                aria-label="Next month"
                className="grid size-8 place-items-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronRightIcon className="size-4" />
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t.days.short.map((day) => (
              <span key={day} className="py-1">
                {day.slice(0, 1)}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startsOn - 1 }).map((_, index) => (
              <span key={`pad-${index}`} aria-hidden />
            ))}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const date = `${month}-${String(day).padStart(2, "0")}`;
              const status = dayStatus.get(date);

              return (
                <div
                  key={date}
                  className={cn(
                    "relative grid aspect-square place-items-center rounded-md border text-xs",
                    status
                      ? "border-border bg-card font-medium"
                      : "border-transparent text-muted-foreground/70",
                  )}
                  title={status ? `${date} · ${t.attendance[status]}` : date}
                >
                  {day}
                  {status && (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute bottom-1 size-1 rounded-full",
                        STATUS_STYLES[status],
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3 text-[10px] text-muted-foreground">
            {(["present", "late", "absent", "leave"] as const).map((key) => (
              <span key={key} className="flex items-center gap-1.5">
                <span className={cn("size-1.5 rounded-full", STATUS_STYLES[key])} />
                {t.attendance[key]}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarCheckIcon className="size-4 text-muted-foreground" />
            Marked sessions
          </CardTitle>
          <CardDescription>Latest first, one entry per session.</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {attendance.records.length === 0 ? (
            <EmptyState
              compact
              icon={CalendarOffIcon}
              title={t.empty.attendanceTitle}
              description="Attendance appears here as soon as reception scans your ID card."
            />
          ) : (
            <div className="divide-y">
              {[...grouped.entries()].map(([date, records]) => (
                <div key={date} className="py-2.5 first:pt-0 last:pb-0">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {formatDate(date, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {records.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center gap-2 rounded-lg border bg-background/60 px-2 py-1.5"
                      >
                        <SessionBadge
                          type={record.session_type}
                          showDot={false}
                          className="h-5 px-1.5 text-[10px]"
                        />
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-5 capitalize",
                            STATUS_BADGES[record.status],
                          )}
                        >
                          {t.attendance[record.status]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
