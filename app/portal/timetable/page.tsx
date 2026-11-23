import type { Metadata } from "next";
import { CalendarOffIcon, ClockIcon } from "lucide-react";

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
import { getPortalTimetable } from "@/lib/data/portal";
import {
  formatTime,
  formatTimeRange,
  isoDayOfWeek,
  todayInKarachi,
} from "@/lib/format";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Timetable" };

export default async function PortalTimetablePage() {
  const { profile } = await requireStudent();
  const timetable = await getPortalTimetable(profile.id);
  const today = isoDayOfWeek(todayInKarachi());

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t.nav.portalGroup}
        title={t.nav.timetable}
        description="Your weekly Grammar classes."
      />

      {!timetable.batch || timetable.days.length === 0 ? (
        <EmptyState
          icon={CalendarOffIcon}
          title="No timetable yet"
          description="Once you are added to a batch, your weekly schedule will appear here."
        />
      ) : (
        <>
          <Card className="bg-[#0d2544] text-white">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base text-white">
                  {timetable.batch.name}
                </CardTitle>
                <Badge
                  variant="outline"
                  className="border-white/20 bg-white/10 text-[10px] text-white"
                >
                  {t.classType[timetable.batch.class_type]}
                </Badge>
              </div>
              <CardDescription className="text-white/60">
                Batch starts at {formatTime(timetable.batch.start_time)} · 2
                sessions per class day
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="space-y-3">
            {timetable.days.map((day) => {
              const isToday = day.day === today;

              return (
                <Card
                  key={day.day}
                  className={cn(
                    isToday && "border-primary/30 ring-1 ring-primary/10",
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm">{day.label}</CardTitle>
                      {isToday && (
                        <Badge
                          variant="outline"
                          className="border-gold/40 bg-gold/10 text-[10px] text-gold-foreground dark:text-gold"
                        >
                          {t.common.today}
                        </Badge>
                      )}
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {day.sessions.length} sessions
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {day.sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center gap-3 rounded-lg border bg-background/60 px-3 py-2"
                      >
                        <ClockIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-xs font-medium tabular-nums">
                          {formatTimeRange(session.start_time, session.end_time)}
                        </span>
                        <SessionBadge
                          type={session.session_type}
                          className="ml-auto"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="rounded-lg border border-dashed px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
            Weekend batches follow their own schedule. If a class is cancelled,
            reception will share an update — attendance is only marked for
            sessions that take place.
          </p>
        </>
      )}
    </div>
  );
}
