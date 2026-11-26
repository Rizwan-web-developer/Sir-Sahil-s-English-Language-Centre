import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { StudentForm } from "@/components/students/student-form";
import { requireStaff } from "@/lib/auth/session";
import { getBatchOptions } from "@/lib/data/students";
import { getSettings, settingString } from "@/lib/settings";

export const metadata: Metadata = { title: "Add Student" };

export default async function NewStudentPage() {
  await requireStaff();
  const [batches, settings] = await Promise.all([getBatchOptions(), getSettings()]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admissions"
        title="Add student"
        description="Create a student record, assign batches, and set CNIC login password."
      />
      <StudentForm
        batches={batches.filter((b) => b.status === "active")}
        instituteName={settingString(settings, "platform_name", "") || settingString(settings, "institute_name", "Sir Sahil's English Language Centre")}
        institutePhone={settingString(settings, "institute_phone", "")}
        instituteAddress={settingString(settings, "institute_address", "")}
        logoUrl={settingString(settings, "platform_logo_url", "") || settingString(settings, "institute_logo_url", "") || null}
      />
    </div>
  );
}
