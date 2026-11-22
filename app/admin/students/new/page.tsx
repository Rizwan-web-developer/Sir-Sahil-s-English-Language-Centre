import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { StudentForm } from "@/components/students/student-form";
import { requireStaff } from "@/lib/auth/session";
import { getBatchOptions } from "@/lib/data/students";

export const metadata: Metadata = { title: "Add Student" };

export default async function NewStudentPage() {
  await requireStaff();
  const batches = await getBatchOptions();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admissions"
        title="Add student"
        description="Create a student record, assign batches, and generate portal login."
      />
      <StudentForm batches={batches.filter((b) => b.status === "active")} />
    </div>
  );
}
