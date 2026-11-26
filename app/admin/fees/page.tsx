import type { Metadata } from "next";
import Link from "next/link";
import { WalletIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { GenerateDuesButton } from "@/components/fees/generate-dues-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireStaff } from "@/lib/auth/session";
import { getFeeDashboard } from "@/lib/data/fees";
import { formatPKR } from "@/lib/format";

export const metadata: Metadata = { title: "Fees" };

export default async function FeesPage() {
  await requireStaff();
  const data = await getFeeDashboard();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Fees & recovery"
        description="Monthly dues, collections, and overdue recovery."
        actions={
          <div className="flex flex-wrap gap-2">
            <GenerateDuesButton />
            <Button nativeButton={false} render={<Link href="/admin/fees/collect" />}>Collect fee</Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Expected this month" value={formatPKR(data.expected)} icon={WalletIcon} />
        <StatCard label="Collected" value={formatPKR(data.collected)} icon={WalletIcon} tone="gold" />
        <StatCard label="Pending" value={formatPKR(data.pending)} icon={WalletIcon} tone="neutral" />
        <StatCard label="Overdue" value={formatPKR(data.overdueAmount)} icon={WalletIcon} />
      </div>

      <Card>
        <CardHeader><CardTitle>Defaulters / pending recovery</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Phone</TableHead><TableHead>Month</TableHead><TableHead>Balance</TableHead><TableHead>Days overdue</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {data.defaulters.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-muted-foreground">No pending dues. Generate dues or check back later.</TableCell></TableRow>
                ) : data.defaulters.map((r) => {
                  const row = r as Record<string, unknown>;
                  const student = row.student as Record<string, unknown> | null;
                  const phone = String(student?.phone ?? "");
                  return (
                  <TableRow key={String(row.id)}>
                    <TableCell><div className="font-medium">{String(student?.full_name ?? "—")}</div><div className="text-[11px] text-muted-foreground">ID {String(student?.student_number ?? "—")}</div></TableCell>
                    <TableCell className="text-xs">{phone || "—"}</TableCell>
                    <TableCell className="text-xs">{String(row.period_month).slice(0, 7)}</TableCell>
                    <TableCell>{formatPKR(Number(row.balance))}</TableCell>
                    <TableCell>{String(row.daysOverdue)}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{String(row.status)}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button nativeButton={false} size="sm" variant="outline" render={<Link href={`/admin/fees/collect?student=${String(row.student_id)}`} />}>Collect</Button>
                        {phone && <Button nativeButton={false} size="sm" variant="ghost" render={<a href={`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Dear ${String(student?.full_name ?? "student")}, your fee balance of ${formatPKR(Number(row.balance))} for ${String(row.period_month).slice(0,7)} is pending at Sir Sahil's English Language Centre. Please pay at your earliest convenience.`)}`} target="_blank" rel="noreferrer" />}>WhatsApp</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
