import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { StudentIdCard } from "@/components/students/id-card";
import { PrintButton } from "@/components/shared/print-button";
import { requireStaff } from "@/lib/auth/session";
import { getStudentDetail } from "@/lib/data/students";
import { getSettings, settingString } from "@/lib/settings";

export const metadata: Metadata = { title: "Student ID Card" };

export default async function StudentIdCardPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const [detail, settings] = await Promise.all([getStudentDetail(id), getSettings()]);
  if (!detail) notFound();
  const batch = (detail.batchEnrollments as Array<Record<string, unknown>>).find((e) => e.active);
  const batchObj = (batch?.batch as Record<string, unknown> | undefined) ?? undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ID Card"
        title={`${detail.student.full_name} — ID Card`}
        description="Print-ready CR80 front/back card with numeric ID, QR code, and barcode."
        actions={<PrintButton label="Print ID card" />}
      />
      <div className="print:m-0">
        <StudentIdCard
          student={{
            full_name: detail.student.full_name,
            student_code: detail.student.student_code,
            student_number: detail.student.student_number,
            photo_url: detail.student.photo_url,
            batch_name: String(batchObj?.name ?? "—"),
            timing: batchObj?.start_time ? String(batchObj.start_time).slice(0, 5) : "—",
          }}
          instituteName={settingString(settings, "platform_name", "") || settingString(settings, "institute_name", "Sir Sahil's English Language Centre")}
          institutePhone={settingString(settings, "institute_phone", "")}
          instituteAddress={settingString(settings, "institute_address", "")}
          logoUrl={settingString(settings, "platform_logo_url", "") || settingString(settings, "institute_logo_url", "") || null}
        />
      </div>
      <p className="text-xs text-muted-foreground print:hidden">Tip: use browser print and set scale to 100% for CR80 card printing.</p>
    </div>
  );
}
