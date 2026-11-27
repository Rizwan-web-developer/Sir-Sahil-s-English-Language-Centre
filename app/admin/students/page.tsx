import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon, UsersIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StudentFilters } from "@/components/students/student-filters";
import { StudentRowActions } from "@/components/students/student-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireStaff } from "@/lib/auth/session";
import { getBatchOptions, getStudentsList } from "@/lib/data/students";
// formatPKR available if fee column is added later.
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Students" };

const feeBadge: Record<string, string> = {
  paid: "border-success/30 bg-success/10 text-success",
  partial: "border-gold/40 bg-gold/10 text-gold-foreground dark:text-gold",
  pending: "border-gold/40 bg-gold/10 text-gold-foreground dark:text-gold",
  overdue: "border-destructive/30 bg-destructive/10 text-destructive",
  waived: "border-border bg-muted text-muted-foreground",
  none: "border-border bg-muted text-muted-foreground",
};

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; batch?: string; page?: string }>;
}) {
  await requireStaff();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const [list, batches] = await Promise.all([
    getStudentsList({
      q: sp.q,
      status: (sp.status as "active" | "frozen" | "left" | "completed" | "all" | undefined) ?? "all",
      batch: sp.batch,
      page,
      pageSize: 20,
    }),
    getBatchOptions(),
  ]);

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const makeHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.status) params.set("status", sp.status);
    if (sp.batch) params.set("batch", sp.batch);
    params.set("page", String(nextPage));
    return `/admin/students?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admissions"
        title={t.nav.students}
        description="Student records, batch placement, and admission status."
        actions={
          <Button nativeButton={false} render={<Link href="/admin/students/new" />}>
            <PlusIcon className="size-4" />
            Add student
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <StudentFilters batches={batches.map((b) => ({ id: b.id, name: b.name }))} />

          {list.rows.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="No students found"
              description="Add a student or adjust your search filters."
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.rows.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <Link href={`/admin/students/${student.id}`} className="font-medium hover:underline">
                            {student.full_name}
                          </Link>
                          <div className="text-[11px] text-muted-foreground">{student.father_name || "—"}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">{student.student_number}</TableCell>
                        <TableCell className="text-xs">{student.whatsapp || student.phone}</TableCell>
                        <TableCell className="text-xs">{student.batches.map((b) => b.name).join(", ") || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{student.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={feeBadge[student.feeStatus] ?? ""}>
                            {student.feeStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <StudentRowActions id={student.id} name={student.full_name} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{list.total} students</span>
                <div className="flex items-center gap-2">
                  <Button nativeButton={false} variant="outline" size="sm" disabled={page <= 1} render={<Link href={makeHref(page - 1)} />}>
                    Previous
                  </Button>
                  <span>Page {page} of {totalPages}</span>
                  <Button nativeButton={false} variant="outline" size="sm" disabled={page >= totalPages} render={<Link href={makeHref(page + 1)} />}>
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
