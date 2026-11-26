import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { CourseManager } from "@/components/course/course-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireStaff } from "@/lib/auth/session";
import { getBatchDetail } from "@/lib/data/batches";
import { getCurriculumTree } from "@/lib/data/curriculum";
import { formatDate, formatTime } from "@/lib/format";

export const metadata: Metadata = { title: "Batch Detail" };

const dayNames = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type AnyRow = Record<string, unknown>;

export default async function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const [detail, tree] = await Promise.all([getBatchDetail(id), getCurriculumTree("grammar")]);
  if (!detail) notFound();
  const batch = detail.batch as AnyRow;
  const schedule = detail.schedule as AnyRow[];
  const enrollments = detail.enrollments as AnyRow[];
  const course = detail.course;
  const classLabel = String(batch.class_type) === "weekend" ? "Weekend" : "Regular classes";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Batch"
        title={String(batch.name)}
        description={`${classLabel}${course ? ` · ${course.name}` : ""} · starts ${formatTime(String(batch.start_time))}`}
        actions={<Button nativeButton={false} variant="outline" render={<Link href={`/admin/batches/${id}/edit`} />}>Edit batch</Button>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Status</p><Badge variant="outline" className="mt-1 capitalize">{String(batch.status)}</Badge></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Course</p><p className="font-medium">{course?.name ?? "Not selected"}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Start date</p><p className="font-medium">{formatDate(String(batch.start_date))}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Active students</p><p className="font-medium">{enrollments.filter((e) => Boolean(e.active)).length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Schedule</CardTitle></CardHeader>
        <CardContent>
          <Table><TableHeader><TableRow><TableHead>Day</TableHead><TableHead>Session</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
            <TableBody>
              {schedule.map((s) => (
                <TableRow key={String(s.id)}><TableCell>{dayNames[Number(s.day_of_week)]}</TableCell><TableCell className="capitalize">{String(s.session_type)}</TableCell><TableCell>{formatTime(String(s.start_time))} - {formatTime(String(s.end_time))}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Course modules &amp; topics</CardTitle>
          <p className="text-xs text-muted-foreground">
            {course ? `Managing the ${course.name} course for this batch.` : "Select a course in the batch edit form to manage modules and topics."}
          </p>
        </CardHeader>
        <CardContent>
          {course ? (
            <CourseManager tree={tree} onlyLevelId={course.id} hideAddCourse />
          ) : (
            <p className="text-sm text-muted-foreground">No course selected for this batch.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Students</CardTitle></CardHeader>
        <CardContent>
          <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Student ID</TableHead><TableHead>Joined</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {enrollments.length === 0 ? <TableRow><TableCell colSpan={4} className="text-muted-foreground">No students enrolled.</TableCell></TableRow> :
                enrollments.map((e) => {
                  const st = e.student as AnyRow | null;
                  return (
                    <TableRow key={String(e.id)}>
                      <TableCell><Link href={`/admin/students/${String(st?.id ?? "")}`} className="hover:underline">{String(st?.full_name ?? "—")}</Link></TableCell>
                      <TableCell className="font-mono text-xs">{String(st?.student_number ?? st?.student_code ?? "—")}</TableCell>
                      <TableCell>{formatDate(String(e.joined_on))}</TableCell>
                      <TableCell><Badge variant="outline">{e.active ? "Active" : "Inactive"}</Badge></TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
