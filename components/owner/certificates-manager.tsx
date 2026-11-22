"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { approveCertificateAction, revokeCertificateAction } from "@/lib/actions/certificates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = Record<string, unknown>;

export function CertificatesManager({
  certRows,
  eligible,
  thresholds,
}: {
  certRows: Row[];
  eligible: Row[];
  thresholds: { minAttendance: number; minMarks: number; blockIfDues: boolean };
}) {
  const [isPending, startTransition] = useTransition();

  function approve(studentId: string, levelId: string) {
    startTransition(async () => {
      const res = await approveCertificateAction({ student_id: studentId, level_id: levelId });
      if (!res.ok) toast.error(res.error); else toast.success(res.message ?? "Approved");
    });
  }

  function revoke(id: string) {
    const reason = window.prompt("Reason for revoking this certificate?") ?? "";
    if (!reason.trim()) return;
    startTransition(async () => {
      const res = await revokeCertificateAction({ id, reason });
      if (!res.ok) toast.error(res.error); else toast.success(res.message ?? "Revoked");
    });
  }

  // Tabs/filters can be added; for now show all certificate rows below.

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Eligibility checklist</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Thresholds: attendance ≥ {thresholds.minAttendance}%, average marks ≥ {thresholds.minMarks}%{thresholds.blockIfDues ? ", no pending dues" : ""}. Topic-completion check is foundational in this phase.</p>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Level</TableHead><TableHead>Attendance</TableHead><TableHead>Avg marks</TableHead><TableHead>Dues</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {eligible.length === 0 ? <TableRow><TableCell colSpan={7} className="text-muted-foreground">No eligible students found yet.</TableCell></TableRow> : eligible.map((r, idx) => {
                  const st = r.student as Row;
                  const lvl = r.level as Row;
                  const cert = r.certificate as Row | null;
                  return (
                    <TableRow key={`${String(st.id)}-${String(lvl.id)}-${idx}`}>
                      <TableCell>{String(st.full_name)}<div className="text-[11px] text-muted-foreground">{String(st.student_code)}</div></TableCell>
                      <TableCell>{String(lvl.name)}</TableCell>
                      <TableCell>{String(r.attendancePct)}%</TableCell>
                      <TableCell>{String(r.avgMarks)}%</TableCell>
                      <TableCell>PKR {Number(r.dues).toLocaleString()}</TableCell>
                      <TableCell>{cert ? <Badge variant="outline" className="capitalize">{String(cert.status)}</Badge> : r.isEligible ? <Badge className="bg-success text-white">Eligible</Badge> : <Badge variant="outline">Not eligible</Badge>}</TableCell>
                      <TableCell>
                        {!cert && Boolean(r.isEligible) && <Button size="sm" disabled={isPending} onClick={() => approve(String(st.id), String(lvl.id))}>Approve / issue</Button>}
                        {cert && String(cert.status) !== "revoked" && <Button size="sm" variant="outline" disabled={isPending} onClick={() => revoke(String(cert.id))}>Revoke</Button>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Issued / pending certificates</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>Certificate</TableHead><TableHead>Student</TableHead><TableHead>Level</TableHead><TableHead>Status</TableHead><TableHead>Issued</TableHead></TableRow></TableHeader>
              <TableBody>
                {certRows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-muted-foreground">No certificates yet.</TableCell></TableRow> : certRows.map((c) => {
                  const st = c.student as Row | null;
                  const lvl = c.level as Row | null;
                  return (
                    <TableRow key={String(c.id)}>
                      <TableCell className="font-mono text-xs">{String(c.certificate_no)}</TableCell>
                      <TableCell>{String(st?.full_name ?? "—")}</TableCell>
                      <TableCell>{String(lvl?.name ?? "—")}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{String(c.status)}</Badge></TableCell>
                      <TableCell>{String(c.issued_on ?? "—")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
