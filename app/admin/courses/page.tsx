import type { Metadata } from "next";

import { CourseTab } from "@/components/course/course-tab";
import { PageHeader } from "@/components/shared/page-header";
import { requireStaff } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Courses" };

export default async function AdminCoursesPage() {
  await requireStaff();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Management"
        title="Courses"
        description="Beginner, Pre-Intermediate, Intermediate, Advanced and Proficiency — add or remove modules and topics."
      />
      <CourseTab />
    </div>
  );
}
