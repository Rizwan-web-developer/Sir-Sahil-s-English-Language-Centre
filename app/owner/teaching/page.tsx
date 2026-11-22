import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { TeachingPanel } from "@/components/owner/teaching-panel";
import { requireOwner } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTeachingData } from "@/lib/data/curriculum";

export const metadata: Metadata = { title: "Teaching Panel" };

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
        eyebrow="Owner only"
        title="Teaching Panel"
        description="Select batch and session, then mark topics completed. Reception cannot access this area."
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
