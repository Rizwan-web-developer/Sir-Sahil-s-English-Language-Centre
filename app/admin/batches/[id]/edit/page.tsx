import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { BatchForm } from "@/components/batches/batch-form";
import { requireStaff } from "@/lib/auth/session";
import { getBatchDetail } from "@/lib/data/batches";

export const metadata: Metadata = { title: "Edit Batch" };

type AnyRow = Record<string, unknown>;

export default async function EditBatchPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const detail = await getBatchDetail(id);
  if (!detail) notFound();
  const batch = detail.batch as AnyRow;
  const schedule = detail.schedule as AnyRow[];
  const weekdays = Array.from(new Set(schedule.map((s) => Number(s.day_of_week)))).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Timetable" title="Edit batch" description={`Update ${String(batch.name)} and its schedule.`} />
      <BatchForm
        mode="edit"
        initial={{
          id: String(batch.id),
          name: String(batch.name),
          class_type: String(batch.class_type) as "weekday" | "weekend",
          start_date: String(batch.start_date),
          start_time: String(batch.start_time).slice(0, 5),
          capacity: Number(batch.capacity),
          status: String(batch.status) as "active" | "closed",
          notes: String(batch.notes ?? ""),
          weekdays: weekdays.length ? weekdays : [1, 2, 3, 4, 5],
          schedule: schedule.map((s) => ({
            day_of_week: Number(s.day_of_week),
            session_type: "grammar" as const,
            start_time: String(s.start_time).slice(0, 5),
            end_time: String(s.end_time).slice(0, 5),
          })),
        }}
      />
    </div>
  );
}
