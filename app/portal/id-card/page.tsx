import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { StudentIdCard } from "@/components/students/id-card";
import { requireStudent } from "@/lib/auth/session";
import { getOwnStudent, getPortalBatch } from "@/lib/data/dashboard";
import { getSettings, settingString } from "@/lib/settings";

export const metadata: Metadata = { title: "My ID Card" };

export default async function PortalIdCardPage() {
  const { profile } = await requireStudent();
  const [student, settings] = await Promise.all([getOwnStudent(profile.id), getSettings()]);
  if (!student) return null;
  const batch = await getPortalBatch(student.id);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Digital ID"
        title="My ID Card"
        description="Show this screen at reception for barcode attendance. Increase screen brightness for easier scanning."
      />
      <div className="rounded-2xl border bg-white p-4 dark:bg-slate-950">
        <StudentIdCard
          student={{
            full_name: student.full_name,
            student_code: student.student_code,
            student_number: student.student_number,
            photo_url: student.photo_url,
            batch_name: batch?.name ?? "—",
            timing: batch?.start_time ? String(batch.start_time).slice(0, 5) : "—",
          }}
          instituteName={settingString(settings, "institute_name", "Sir Sahil's English Language Centre")}
          institutePhone={settingString(settings, "institute_phone", "")}
          instituteAddress={settingString(settings, "institute_address", "")}
        />
      </div>
      <p className="text-xs text-muted-foreground">Tip: you can also print/download your ID card from reception.</p>
    </div>
  );
}
