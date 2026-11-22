import type { Metadata } from "next";

import { ReportsDashboard } from "@/components/admin/reports-dashboard";
import { PageHeader } from "@/components/shared/page-header";
import { requireStaff } from "@/lib/auth/session";
import { getReportsOverview } from "@/lib/data/reports";

export const metadata: Metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  await requireStaff();
  const data = await getReportsOverview();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Insights" title="Reports" description="Income, fee recovery, defaulters, and attendance. Export CSV or print." />
      <ReportsDashboard data={data} />
    </div>
  );
}
