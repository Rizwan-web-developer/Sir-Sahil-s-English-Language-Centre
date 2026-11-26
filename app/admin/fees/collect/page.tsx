import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { CollectFeeForm } from "@/components/fees/collect-fee-form";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireStaff } from "@/lib/auth/session";
import { getStudentFeeRecords, getStudentsForCollection } from "@/lib/data/fees";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Collect Fee" };

export default async function CollectFeePage({ searchParams }: { searchParams: Promise<{ student?: string; q?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const students = q ? await getStudentsForCollection(q) : [];
  const selectedId = sp.student ?? "";

  let selected: Record<string, unknown> | null = null;
  let records: Array<Record<string, unknown>> = [];
  if (selectedId) {
    const supabase = await createClient();
    const { data } = await supabase.from("students").select("id, full_name, student_number, phone").eq("id", selectedId).maybeSingle();
    selected = (data as Record<string, unknown> | null) ?? null;
    if (selected) {
      const fee = await getStudentFeeRecords(selectedId);
      records = (fee.records as Array<Record<string, unknown>>).filter((r) => ["pending", "partial", "overdue"].includes(String(r.status)));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Finance" title="Collect fee" description="Search student, select pending months, and record payment." />

      <Card><CardContent className="pt-6 space-y-4">
        <form className="flex gap-2">
          <Input name="q" defaultValue={q} placeholder="Search by name, phone, or student ID..." />
          <button className="rounded-md border px-3 text-sm" type="submit">Search</button>
        </form>
        {q && (
          <div className="rounded-lg border divide-y">
            {students.length === 0 ? <p className="p-3 text-sm text-muted-foreground">No students found.</p> : (students as Array<Record<string, unknown>>).map((s) => (
              <a key={String(s.id)} href={`/admin/fees/collect?student=${String(s.id)}&q=${encodeURIComponent(q)}`} className="block p-3 text-sm hover:bg-muted/40">
                <span className="font-medium">{String(s.full_name)}</span> <span className="text-muted-foreground">(ID {String(s.student_number ?? "—")} · {String(s.phone)})</span>
              </a>
            ))}
          </div>
        )}
      </CardContent></Card>

      {selected && (
        <CollectFeeForm
          student={{ id: String(selected.id), full_name: String(selected.full_name), student_number: selected.student_number as number | null, phone: String(selected.phone ?? "") }}
          records={records}
        />
      )}
    </div>
  );
}
