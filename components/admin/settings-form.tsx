"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateSettingsAction } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = { initial: Record<string, string> };

const fields: Array<{ key: string; label: string; multiline?: boolean }> = [
  { key: "institute_name", label: "Institute name" },
  { key: "institute_phone", label: "Phone" },
  { key: "institute_address", label: "Address", multiline: true },
  { key: "receipt_footer", label: "Receipt footer", multiline: true },
  { key: "attendance_threshold", label: "Attendance threshold (%)" },
  { key: "min_assignment_average", label: "Minimum assignment average (%)" },
  { key: "fee_due_day", label: "Fee due day" },
  { key: "payment_jazzcash", label: "JazzCash details", multiline: true },
  { key: "payment_easypaisa", label: "Easypaisa details", multiline: true },
  { key: "payment_bank", label: "Bank details", multiline: true },
];

export function SettingsForm({ initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await updateSettingsAction(values);
      if (!res.ok) toast.error(res.error); else toast.success(res.message ?? "Saved");
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Institute settings</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className={f.multiline ? "space-y-2 md:col-span-2" : "space-y-2"}>
              <Label>{f.label}</Label>
              {f.multiline ? (
                <Textarea value={values[f.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
              ) : (
                <Input value={values[f.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
              )}
            </div>
          ))}
        </div>
        <Button onClick={save} disabled={isPending}>Save settings</Button>
      </CardContent>
    </Card>
  );
}
