import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireStaff } from "@/lib/auth/session";
import { getAuditLogs } from "@/lib/data/audit";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Audit Log" };

export default async function AuditLogPage() {
  await requireStaff();
  const logs = await getAuditLogs(150);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Owner only" title="Audit log" description="Sensitive actions recorded by the system." />
      <Card>
        <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-muted-foreground">No audit entries yet.</TableCell></TableRow>
                ) : logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs">{formatDateTime(log.created_at)}</TableCell>
                    <TableCell className="text-xs">{log.user_name}<div className="text-muted-foreground capitalize">{log.user_role}</div></TableCell>
                    <TableCell className="text-xs font-medium">{log.action}</TableCell>
                    <TableCell className="text-xs">{log.entity}{log.entity_id ? <div className="font-mono text-[11px] text-muted-foreground">{log.entity_id.slice(0, 8)}</div> : null}</TableCell>
                    <TableCell className="max-w-[320px] truncate text-xs text-muted-foreground">{log.details ? JSON.stringify(log.details) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
