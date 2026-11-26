import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { CourseManager } from "@/components/course/course-manager";
import { requireOwner } from "@/lib/auth/session";
import { getCurriculumTree } from "@/lib/data/curriculum";

export const metadata: Metadata = { title: "Curriculum" };

export default async function CurriculumPage() {
  await requireOwner();
  const session = "grammar" as const;
  const tree = await getCurriculumTree(session);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Teacher"
        title="Course & curriculum"
        description="Beginner, Pre-Intermediate, Intermediate, Advanced and Proficiency — add or remove modules and topics."
      />
      <CourseManager tree={tree} />
    </div>
  );
}
