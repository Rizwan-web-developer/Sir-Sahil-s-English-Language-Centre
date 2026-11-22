import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { ScanKiosk } from "@/components/attendance/scan-kiosk";
import { requireStaff } from "@/lib/auth/session";
import { getAttendanceScanData } from "@/lib/data/attendance";

export const metadata: Metadata = { title: "Attendance Scan" };

export default async function AttendanceScanPage() {
  await requireStaff();
  const data = await getAttendanceScanData();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Attendance"
        title="Scan kiosk"
        description="USB scanner, manual code, search, camera, or manual sheet. Duplicate scans are protected."
      />
      <ScanKiosk
        today={data.today}
        schedules={data.schedules}
        enrollments={data.enrollments}
        marked={data.marked}
      />
    </div>
  );
}
