import type { Metadata } from "next";
import Link from "next/link";
import { LayersIcon, PlusIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BatchRowActions } from "@/components/batches/batch-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireStaff } from "@/lib/auth/session";
import { getBatchesList } from "@/lib/data/batches";
import { formatTime } from "@/lib/format";

export const metadata: Metadata = { title: "Batches" };

export default async function BatchesPage() {
  await requireStaff();
  const batches = await getBatchesList() as Array<Record<string, unknown>>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Timetable"
        title="Batches"
        description="Weekday and weekend batches and schedules."
        actions={
          <div className="flex gap-2">
            <Button nativeButton={false} variant="outline" render={<Link href="/admin/batches/timetable" />}>Timetable</Button>
            <Button nativeButton={false} render={<Link href="/admin/batches/new" />}><PlusIcon className="size-4" />New batch</Button>
          </div>
        }
      />
      <Card><CardContent className="pt-6">
        {batches.length === 0 ? (
          <EmptyState icon={LayersIcon} title="No batches yet" description="Create your first batch and define its schedule." />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Course</TableHead><TableHead>Type</TableHead><TableHead>Start</TableHead><TableHead>Students</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {batches.map((b) => (
                  <TableRow key={String(b.id)}>
                    <TableCell><Link href={`/admin/batches/${String(b.id)}`} className="font-medium hover:underline">{String(b.name)}</Link></TableCell>
                    <TableCell className="text-xs">{String(b.course_name ?? "—")}</TableCell>
                    <TableCell className="capitalize">{String(b.class_type) === "weekend" ? "Weekend" : "Regular"}</TableCell>
                    <TableCell>{formatTime(String(b.start_time))}</TableCell>
                    <TableCell>{String(b.studentCount)}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{String(b.status)}</Badge></TableCell>
                    <TableCell className="text-right"><BatchRowActions id={String(b.id)} name={String(b.name)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}
