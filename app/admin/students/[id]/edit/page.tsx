import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { StudentForm } from "@/components/students/student-form";
import { requireStaff } from "@/lib/auth/session";
import { getBatchOptions, getStudentById } from "@/lib/data/students";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit Student" };

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const [student, batches, enrollments] = await Promise.all([
    getStudentById(id),
    getBatchOptions(),
    (async () => {
      const supabase = await createClient();
      const { data } = await supabase.from("batch_students").select("batch_id").eq("student_id", id).eq("active", true);
      return (data ?? []).map((r) => String(r.batch_id));
    })(),
  ]);
  if (!student) notFound();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admissions" title="Edit student" description={`Update ${student.full_name}'s record.`} />
      <StudentForm
        mode="edit"
        batches={batches.filter((b) => b.status === "active" || enrollments.includes(b.id))}
        initial={{
          id: student.id,
          full_name: student.full_name,
          father_name: student.father_name ?? "",
          date_of_birth: student.date_of_birth ?? "",
          cnic_or_bform: student.cnic_or_bform ?? "",
          address: student.address ?? "",
          photo_url: student.photo_url ?? "",
          phone: student.phone,
          parent_phone: student.parent_phone ?? "",
          whatsapp: student.whatsapp ?? "",
          whatsapp_same_as_phone: student.whatsapp === student.phone,
          admission_date: student.admission_date,
          batch_ids: enrollments,
          monthly_fee: Number(student.monthly_fee),
          admission_fee: 0,
          discount: Number(student.discount),
          discount_type: "amount",
          discount_reason: "",
          notes: student.notes ?? "",
          status: student.status,
        }}
      />
    </div>
  );
}
