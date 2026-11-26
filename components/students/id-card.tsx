"use client";

import { StudentBarcode } from "@/components/students/student-barcode";
import { StudentQr } from "@/components/students/student-qr";

type IdCardProps = {
  student: {
    full_name: string;
    student_code: string;
    student_number: number;
    photo_url?: string | null;
    batch_name?: string | null;
    timing?: string | null;
  };
  instituteName?: string;
  institutePhone?: string;
  instituteAddress?: string;
  logoUrl?: string | null;
};

export function StudentIdCard({
  student,
  instituteName = "Sir Sahil's English Language Centre",
  institutePhone = "",
  instituteAddress = "",
  logoUrl,
}: IdCardProps) {
  return (
    <div className="grid gap-4 print:grid-cols-2">
      <div className="w-[340px] rounded-xl border bg-white text-slate-900 shadow-sm overflow-hidden">
        <div className="bg-[#0d2544] px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-8 w-8 rounded bg-white/10 object-contain p-0.5" />
            ) : null}
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#c9a227]">Student ID Card</p>
              <p className="font-heading text-sm font-semibold">{instituteName}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-4">
          <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 border">
            {student.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={student.photo_url} alt={student.full_name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-xl font-semibold text-slate-500">
                {student.full_name.split(/\s+/).slice(0,2).map(p => p[0]).join("")}
              </div>
            )}
          </div>
          <div className="min-w-0 text-xs space-y-1">
            <p className="font-semibold text-sm leading-tight">{student.full_name}</p>
            <p><span className="text-slate-500">ID No:</span> <span className="font-mono font-semibold">{student.student_number}</span></p>
            <p><span className="text-slate-500">Code:</span> <span className="font-mono">{student.student_code}</span></p>
            <p><span className="text-slate-500">Batch:</span> {student.batch_name || "—"}</p>
            <p><span className="text-slate-500">Timing:</span> {student.timing || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 pb-4">
          <div className="flex-1 rounded-md bg-slate-50 p-2 flex justify-center">
            <StudentBarcode value={String(student.student_number)} height={44} width={1.6} />
          </div>
          <StudentQr value={student.student_number} size={72} />
        </div>
      </div>

      <div className="w-[340px] rounded-xl border bg-white text-slate-900 shadow-sm overflow-hidden">
        <div className="bg-[#0d2544] px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-8 w-8 rounded bg-white/10 object-contain p-0.5" />
            ) : null}
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#c9a227]">Card Back</p>
              <p className="font-heading text-sm font-semibold">{instituteName}</p>
            </div>
          </div>
        </div>
        <div className="p-4 text-xs space-y-2">
          <p><span className="font-medium">Address:</span> {instituteAddress || "—"}</p>
          <p><span className="font-medium">Phone:</span> {institutePhone || "—"}</p>
          <div className="rounded-md bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
            <p className="font-medium text-slate-800 mb-1">Rules</p>
            <p>This card is property of {instituteName}. Present it at reception for attendance. If found, please return to the institute.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
