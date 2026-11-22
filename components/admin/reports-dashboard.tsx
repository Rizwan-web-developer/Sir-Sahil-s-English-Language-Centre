"use client";

import { useMemo, useState } from "react";
import { DownloadIcon, PrinterIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPKR } from "@/lib/format";

type Props = {
  data: {
    incomeTotal: number;
    outstanding: number;
    defaulterCount: number;
    totalStudents: number;
    paymentRows: Array<Record<string, unknown>>;
    feeRows: Array<Record<string, unknown>>;
    attendanceRows: Array<Record<string, unknown>>;
  };
};

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "";
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

function download(name: string, rows: Array<Record<string, unknown>>) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsDashboard({ data }: Props) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const payments = useMemo(() => data.paymentRows.filter((r) => {
    const d = String(r.paid_on ?? "");
    return (!from || d >= from) && (!to || d <= to);
  }), [data.paymentRows, from, to]);

  const fees = useMemo(() => data.feeRows.filter((r) => {
    const d = String(r.period_month ?? "").slice(0, 10);
    return (!from || d >= from.slice(0, 7)) && (!to || d <= to.slice(0, 7));
  }), [data.feeRows, from, to]);

  const attendance = useMemo(() => data.attendanceRows.filter((r) => {
    const d = String(r.date ?? "");
    return (!from || d >= from) && (!to || d <= to);
  }), [data.attendanceRows, from, to]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div className="space-y-1"><label className="text-xs text-muted-foreground">From</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1"><label className="text-xs text-muted-foreground">To</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <Button variant="outline" onClick={() => window.print()}><PrinterIcon className="size-4" />Print</Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-1 py-4"><CardContent className="px-4"><p className="text-xs text-muted-foreground">Income (filtered payments)</p><p className="font-heading text-2xl font-semibold">{formatPKR(payments.reduce((s, r) => s + Number(r.amount ?? 0), 0))}</p></CardContent></Card>
        <Card className="gap-1 py-4"><CardContent className="px-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className="font-heading text-2xl font-semibold">{formatPKR(data.outstanding)}</p></CardContent></Card>
        <Card className="gap-1 py-4"><CardContent className="px-4"><p className="text-xs text-muted-foreground">Defaulters</p><p className="font-heading text-2xl font-semibold">{data.defaulterCount}</p></CardContent></Card>
        <Card className="gap-1 py-4"><CardContent className="px-4"><p className="text-xs text-muted-foreground">Students</p><p className="font-heading text-2xl font-semibold">{data.totalStudents}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between"><CardTitle>Payments report</CardTitle><Button size="sm" variant="outline" onClick={() => download("payments-report.csv", payments)}><DownloadIcon className="size-4" />CSV</Button></CardHeader>
        <CardContent><div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Receipt</TableHead><TableHead>Method</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader><TableBody>
          {payments.slice(0, 50).map((r, i) => <TableRow key={i}><TableCell>{String(r.paid_on ?? "")}</TableCell><TableCell>{String(r.receipt_no ?? "—")}</TableCell><TableCell className="capitalize">{String(r.method ?? "")}</TableCell><TableCell>{formatPKR(Number(r.amount ?? 0))}</TableCell></TableRow>)}
          {payments.length === 0 && <TableRow><TableCell colSpan={4} className="text-muted-foreground">No payments in filter.</TableCell></TableRow>}
        </TableBody></Table></div></CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between"><CardTitle>Fee outstanding / defaulters</CardTitle><Button size="sm" variant="outline" onClick={() => download("fees-report.csv", fees)}><DownloadIcon className="size-4" />CSV</Button></CardHeader>
        <CardContent><div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Period</TableHead><TableHead>Status</TableHead><TableHead>Balance</TableHead></TableRow></TableHeader><TableBody>
          {fees.slice(0, 50).map((r, i) => {
            const student = (Array.isArray(r.student) ? r.student[0] : r.student) as Record<string, unknown> | null;
            const balance = Math.max(0, Number(r.amount_due) - Number(r.discount) - Number(r.amount_paid));
            return <TableRow key={i}><TableCell>{String(student?.full_name ?? "—")}</TableCell><TableCell>{String(r.period_month ?? "").slice(0, 7)}</TableCell><TableCell className="capitalize">{String(r.status ?? "")}</TableCell><TableCell>{formatPKR(balance)}</TableCell></TableRow>;
          })}
          {fees.length === 0 && <TableRow><TableCell colSpan={4} className="text-muted-foreground">No fee records in filter.</TableCell></TableRow>}
        </TableBody></Table></div></CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between"><CardTitle>Attendance report</CardTitle><Button size="sm" variant="outline" onClick={() => download("attendance-report.csv", attendance)}><DownloadIcon className="size-4" />CSV</Button></CardHeader>
        <CardContent><div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Student</TableHead><TableHead>Batch</TableHead><TableHead>Session</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
          {attendance.slice(0, 50).map((r, i) => {
            const student = (Array.isArray(r.student) ? r.student[0] : r.student) as Record<string, unknown> | null;
            const batch = (Array.isArray(r.batch) ? r.batch[0] : r.batch) as Record<string, unknown> | null;
            return <TableRow key={i}><TableCell>{String(r.date ?? "")}</TableCell><TableCell>{String(student?.full_name ?? "—")}</TableCell><TableCell>{String(batch?.name ?? "—")}</TableCell><TableCell className="capitalize">{String(r.session_type ?? "")}</TableCell><TableCell className="capitalize">{String(r.status ?? "")}</TableCell></TableRow>;
          })}
          {attendance.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground">No attendance in filter.</TableCell></TableRow>}
        </TableBody></Table></div></CardContent>
      </Card>
    </div>
  );
}
