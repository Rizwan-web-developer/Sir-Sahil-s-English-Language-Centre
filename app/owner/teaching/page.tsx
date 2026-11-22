import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { TeachingPanel } from "@/components/owner/teaching-panel";
import { requireOwner } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTeachingData } from "@/lib/data/curriculum";

export const metadata: Metadata = { title: "Batches & Course" };

export default async function OwnerTeachingPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string; session?: string }>;
}) {
  await requireOwner();
  const sp = await searchParams;
  const batchId = sp.batch ?? "";
  const sessionType = sp.session === "grammar" ? "grammar" : "conversation";
  const supabase = await createClient();
  const { data: batches } = await supabase.from("batches").select("id, name, status, class_type").eq("status", "active").order("start_time");
  const teaching = batchId ? await getTeachingData(batchId, sessionType) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Teacher"
        title="Batches & Course"
        description="Select a batch, review course progress, mark topics completed, and assign work to students."
      />
      <TeachingPanel
        batches={(batches ?? []) as Array<Record<string, unknown>>}
        selectedBatchId={batchId}
        selectedSession={sessionType}
        teaching={teaching as Record<string, unknown> | null}
      />
    </div>
  );
}
