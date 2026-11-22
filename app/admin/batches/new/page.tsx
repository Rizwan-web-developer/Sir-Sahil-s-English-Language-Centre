import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { BatchForm } from "@/components/batches/batch-form";
import { requireStaff } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New Batch" };

export default async function NewBatchPage() {
  await requireStaff();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Timetable" title="Create batch" description="Define batch type, capacity, and session schedule." />
      <BatchForm mode="create" />
    </div>
  );
}
