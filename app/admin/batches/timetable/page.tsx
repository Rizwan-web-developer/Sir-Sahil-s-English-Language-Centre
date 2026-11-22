import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";
import { getAllBatchesForTimetable } from "@/lib/data/batches";

export const metadata: Metadata = { title: "Timetable" };

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = Array.from({ length: 9 }, (_, i) => 14 + i); // 14:00 - 22:00

function hourLabel(h: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${ampm}`;
}

export default async function TimetablePage() {
  await requireStaff();
  const rows = (await getAllBatchesForTimetable()) as Array<Record<string, unknown>>;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Timetable" title="Weekly timetable" description="All batches, 2:00 PM to 10:00 PM. Conversation and Grammar are colour-coded." />
      <Card><CardContent className="overflow-x-auto pt-6">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] gap-1 text-xs">
            <div />
            {days.map((d) => <div key={d} className="p-2 font-semibold text-center">{d}</div>)}
            {hours.map((h) => (
              <div key={`row-${h}`} className="contents">
                <div className="p-2 text-muted-foreground border-t">{hourLabel(h)}</div>
                {days.map((_, dayIdx) => {
                  const day = dayIdx + 1;
                  const slot = `${String(h).padStart(2, "0")}:00`;
                  const matches = rows.filter((r) => {
                    const batch = r.batch as Record<string, unknown> | null;
                    return Number(r.day_of_week) === day && String(r.start_time).slice(0, 5) === slot && batch?.status !== "closed";
                  });
                  return (
                    <div key={`${day}-${h}`} className="min-h-14 border-t p-1">
                      {matches.map((m) => {
                        const batch = m.batch as Record<string, unknown> | null;
                        return (
                          <div key={String(m.id)} className={`mb-1 rounded-md px-1.5 py-1 text-[10px] leading-tight ${m.session_type === "conversation" ? "bg-primary/10 text-primary" : "bg-gold/15 text-gold-foreground dark:text-gold"}`}>
                            <div className="font-medium truncate">{String(batch?.name ?? "")}</div>
                            <div className="capitalize">{String(m.session_type)}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent></Card>
    </div>
  );
}
