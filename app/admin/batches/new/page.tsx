import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { BatchForm } from "@/components/batches/batch-form";
import { requireStaff } from "@/lib/auth/session";
import { getCourseOptions, getCurriculumTree } from "@/lib/data/curriculum";

export const metadata: Metadata = { title: "New Batch" };

export default async function NewBatchPage() {
  await requireStaff();
  const [courses, tree] = await Promise.all([getCourseOptions(), getCurriculumTree("grammar")]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Timetable"
        title="Create batch"
        description="Select a course, regular or weekend classes, and add modules and topics."
      />
      <BatchForm mode="create" courses={courses} tree={tree} />
    </div>
  );
}
