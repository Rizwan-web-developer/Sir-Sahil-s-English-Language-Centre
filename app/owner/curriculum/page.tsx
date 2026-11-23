import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { CurriculumBuilder } from "@/components/owner/curriculum-builder";
import { requireOwner } from "@/lib/auth/session";
import { getCurriculumTree } from "@/lib/data/curriculum";

export const metadata: Metadata = { title: "Curriculum" };

export default async function CurriculumPage() {
  await requireOwner();
  const session = "grammar" as const;
  const tree = await getCurriculumTree(session);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Owner only" title="Curriculum builder" description="Manage Grammar track: levels, modules, topics, assignments." />
      <CurriculumBuilder session={session} tree={tree} />
    </div>
  );
}
