import type { Metadata } from "next";
import Link from "next/link";
import { ScanLineIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage() {
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendance")
    .select("id, date, session_type, status, marked_via, student:students(full_name, student_code), batch:batches(name)")
    .order("marked_at", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as Array<Record<string, unknown>>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Attendance"
        description="Scan, manual entry, and daily attendance records."
        actions={<Button nativeButton={false} render={<Link href="/admin/attendance/scan" />}><ScanLineIcon className="size-4" />Open scan kiosk</Button>}
      />
      <Card>
        <CardHeader><CardTitle>Recent attendance</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState icon={ScanLineIcon} title="No attendance marked yet" description="Open the scan kiosk to start marking attendance." />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Student</TableHead><TableHead>Batch</TableHead><TableHead>Session</TableHead><TableHead>Status</TableHead><TableHead>Via</TableHead></TableRow></TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const student = Array.isArray(r.student) ? r.student[0] as Record<string, unknown> : r.student as Record<string, unknown> | null;
                    const batch = Array.isArray(r.batch) ? r.batch[0] as Record<string, unknown> : r.batch as Record<string, unknown> | null;
                    return (
                      <TableRow key={String(r.id)}>
                        <TableCell>{formatDate(String(r.date))}</TableCell>
                        <TableCell>{String(student?.full_name ?? "—")} <span className="text-muted-foreground text-xs">({String(student?.student_code ?? "")})</span></TableCell>
                        <TableCell>{String(batch?.name ?? "—")}</TableCell>
                        <TableCell className="capitalize">{String(r.session_type)}</TableCell>
                        <TableCell className="capitalize">{String(r.status)}</TableCell>
                        <TableCell className="text-xs">{String(r.marked_via)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
