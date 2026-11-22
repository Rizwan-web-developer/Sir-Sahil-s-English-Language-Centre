import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { CurriculumBuilder } from "@/components/owner/curriculum-builder";
import { requireOwner } from "@/lib/auth/session";
import { getCurriculumTree } from "@/lib/data/curriculum";

export const metadata: Metadata = { title: "Curriculum" };

export default async function CurriculumPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  await requireOwner();
  const sp = await searchParams;
  const session = sp.session === "grammar" ? "grammar" : "conversation";
  const tree = await getCurriculumTree(session);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Owner only" title="Curriculum builder" description="Manage Conversation and Grammar tracks: levels, modules, topics, assignments." />
      <CurriculumBuilder session={session} tree={tree} />
    </div>
  );
}
