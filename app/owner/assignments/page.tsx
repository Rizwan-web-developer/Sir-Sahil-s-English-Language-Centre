import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { SubmissionReview } from "@/components/owner/submission-review";
import { requireOwner } from "@/lib/auth/session";
import { getOwnerSubmissions } from "@/lib/data/submissions";

export const metadata: Metadata = { title: "Assignments" };

export default async function OwnerAssignmentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireOwner();
  const sp = await searchParams;
  const status = sp.status ?? "submitted";
  const submissions = await getOwnerSubmissions(status);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Owner only" title="Assignment review" description="Review submitted videos, award marks, and request resubmission." />
      <SubmissionReview submissions={submissions} currentStatus={status} />
    </div>
  );
}
