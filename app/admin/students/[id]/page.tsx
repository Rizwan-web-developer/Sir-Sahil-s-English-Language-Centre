import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StudentStatusActions } from "@/components/students/student-status-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireStaff } from "@/lib/auth/session";
import { getStudentDetail } from "@/lib/data/students";
import { formatDate, formatPKR } from "@/lib/format";

export const metadata: Metadata = { title: "Student Profile" };
type AnyRow = Record<string, unknown>;

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const detail = await getStudentDetail(id);
  if (!detail) notFound();
  const { student, batchEnrollments, attendance, feeRecords } = detail;
  const b = batchEnrollments as AnyRow[];
  const attendanceRows = attendance as AnyRow[];
  const feeRows = feeRecords as AnyRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student profile"
        title={student.full_name}
        description={`ID ${student.student_number} · ${student.student_code} · ${student.phone}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button nativeButton={false} variant="outline" render={<Link href="/admin/students" />}><ArrowLeftIcon className="size-4" />Back</Button>
            <Button nativeButton={false} variant="outline" render={<Link href={`/admin/students/${id}/id-card`} />}>ID Card</Button>
            <Button nativeButton={false} variant="outline" render={<Link href={`/admin/students/${id}/edit`} />}><PencilIcon className="size-4" />Edit</Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="capitalize">{student.status}</Badge>
        {student.is_archived && <Badge variant="destructive">Archived</Badge>}
        <StudentStatusActions id={student.id} status={student.status} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card><CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <div><p className="text-muted-foreground text-xs">Father name</p><p className="font-medium">{student.father_name || "—"}</p></div>
            <div><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium">{student.phone}</p></div>
            <div><p className="text-muted-foreground text-xs">Parent phone</p><p className="font-medium">{student.parent_phone || "—"}</p></div>
            <div><p className="text-muted-foreground text-xs">WhatsApp</p><p className="font-medium">{student.whatsapp || "—"}</p></div>
            <div><p className="text-muted-foreground text-xs">CNIC/B-Form</p><p className="font-medium">{student.cnic_or_bform || "—"}</p></div>
            <div><p className="text-muted-foreground text-xs">DOB</p><p className="font-medium">{student.date_of_birth ? formatDate(student.date_of_birth) : "—"}</p></div>
            <div><p className="text-muted-foreground text-xs">Admission date</p><p className="font-medium">{formatDate(student.admission_date)}</p></div>
            <div><p className="text-muted-foreground text-xs">Monthly fee</p><p className="font-medium">{formatPKR(student.monthly_fee)}</p></div>
            <div><p className="text-muted-foreground text-xs">Discount</p><p className="font-medium">{formatPKR(student.discount)}</p></div>
            <div className="sm:col-span-2 lg:col-span-3"><p className="text-muted-foreground text-xs">Address</p><p className="font-medium">{student.address || "—"}</p></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="batches">
          <Card><CardHeader><CardTitle>Batches</CardTitle></CardHeader><CardContent>
            <Table><TableHeader><TableRow><TableHead>Batch</TableHead><TableHead>Joined</TableHead><TableHead>Left</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {b.length === 0 ? <TableRow><TableCell colSpan={4} className="text-muted-foreground">No batch enrollments.</TableCell></TableRow> :
                  b.map((en) => {
                    const batch = en.batch as AnyRow | null;
                    return (
                      <TableRow key={String(en.id)}>
                        <TableCell>{String(batch?.name ?? "—")}</TableCell>
                        <TableCell>{formatDate(String(en.joined_on))}</TableCell>
                        <TableCell>{en.left_on ? formatDate(String(en.left_on)) : "—"}</TableCell>
                        <TableCell><Badge variant="outline">{en.active ? "Active" : "Inactive"}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="fees">
          <Card><CardHeader><CardTitle>Fee records</CardTitle></CardHeader><CardContent>
            <Table><TableHeader><TableRow><TableHead>Month</TableHead><TableHead>Due</TableHead><TableHead>Paid</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {feeRows.length === 0 ? <TableRow><TableCell colSpan={4} className="text-muted-foreground">No fee records yet.</TableCell></TableRow> :
                  feeRows.map((f) => (
                    <TableRow key={String(f.id)}>
                      <TableCell>{formatDate(String(f.period_month), { month: "long", year: "numeric" })}</TableCell>
                      <TableCell>{formatPKR(Number(f.amount_due))}</TableCell>
                      <TableCell>{formatPKR(Number(f.amount_paid))}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{String(f.status)}</Badge></TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card><CardHeader><CardTitle>Recent attendance</CardTitle></CardHeader><CardContent>
            <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Session</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {attendanceRows.length === 0 ? <TableRow><TableCell colSpan={3} className="text-muted-foreground">No attendance marked yet.</TableCell></TableRow> :
                  attendanceRows.slice(0, 30).map((a) => (
                    <TableRow key={String(a.id)}>
                      <TableCell>{formatDate(String(a.date))}</TableCell>
                      <TableCell className="capitalize">{String(a.session_type)}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{String(a.status)}</Badge></TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{student.notes || "No notes added."}</p>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
