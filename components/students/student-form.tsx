"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2Icon, CopyIcon, LoaderCircleIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createStudentAction, updateStudentAction } from "@/lib/actions/students";
import { studentFormSchema, type StudentFormInput, type StudentFormValues } from "@/lib/validation/students";
import { StudentQr } from "@/components/students/student-qr";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type BatchOption = { id: string; name: string; status?: string; class_type?: string };

type Props = {
  batches: BatchOption[];
  initial?: Partial<StudentFormValues> & { id?: string };
  mode?: "create" | "edit";
};

export function StudentForm({ batches, initial, mode = "create" }: Props) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ studentId: string; studentCode: string; studentNumber: number; tempPassword: string } | null>(null);

  const form = useForm<StudentFormInput, unknown, StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      full_name: initial?.full_name ?? "",
      father_name: initial?.father_name ?? "",
      date_of_birth: initial?.date_of_birth ?? "",
      cnic_or_bform: initial?.cnic_or_bform ?? "",
      address: initial?.address ?? "",
      photo_url: initial?.photo_url ?? "",
      phone: initial?.phone ?? "",
      parent_phone: initial?.parent_phone ?? "",
      whatsapp: initial?.whatsapp ?? "",
      whatsapp_same_as_phone: initial?.whatsapp_same_as_phone ?? false,
      admission_date: initial?.admission_date ?? new Date().toISOString().slice(0, 10),
      batch_ids: initial?.batch_ids ?? [],
      monthly_fee: initial?.monthly_fee ?? 0,
      admission_fee: initial?.admission_fee ?? 0,
      discount: initial?.discount ?? 0,
      discount_type: initial?.discount_type ?? "amount",
      discount_reason: initial?.discount_reason ?? "",
      notes: initial?.notes ?? "",
      status: initial?.status ?? "active",
    },
  });

  const sameAsPhone = form.watch("whatsapp_same_as_phone");

  function toggleBatch(batchId: string, checked: boolean) {
    const current = form.getValues("batch_ids") ?? [];
    form.setValue(
      "batch_ids",
      checked ? [...current, batchId] : current.filter((id) => id !== batchId),
      { shouldDirty: true },
    );
  }

  function onSubmit(values: StudentFormValues) {
    setServerError(null);
    startTransition(async () => {
      const result =
        mode === "edit" && initial?.id
          ? await updateStudentAction(initial.id, values)
          : await createStudentAction(values);

      if (!result.ok) {
        setServerError(result.error);
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof StudentFormValues, { message });
          }
        }
        return;
      }

      if (mode === "create" && "studentCode" in result.data) {
        setCreated(result.data as { studentId: string; studentCode: string; studentNumber: number; tempPassword: string });
        toast.success("Student created");
      } else {
        toast.success(result.message ?? "Student updated");
      }
    });
  }

  if (created) {
    return (
      <Card className="border-success/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-success">
            <CheckCircle2Icon className="size-5" /> Student admitted
          </CardTitle>
          <CardDescription>Share these credentials once. The temporary password is not shown again.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-3">
              <StudentQr value={created.studentNumber} size={72} />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Student ID (QR)</p>
                <p className="font-mono text-2xl font-semibold">{created.studentNumber}</p>
                <p className="text-[11px] text-muted-foreground">{created.studentCode}</p>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Temporary password</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-lg font-semibold">{created.tempPassword}</p>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => navigator.clipboard.writeText(created.tempPassword)}>
                  <CopyIcon className="size-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button nativeButton={false} render={<Link href={`/admin/students/${created.studentId}`} />}>Open profile</Button>
            <Button type="button" variant="outline" onClick={() => window.print()}>Print ID / Receipt</Button>
            <Button type="button" variant="outline" onClick={() => { setCreated(null); form.reset(); }}>Add another</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const err = (name: keyof StudentFormValues) => form.formState.errors[name]?.message as string | undefined;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <Alert variant="destructive"><AlertDescription>{serverError}</AlertDescription></Alert>}

      <Card>
        <CardHeader><CardTitle>Personal details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="full_name">Full name *</Label><Input id="full_name" {...form.register("full_name")} />{err("full_name") && <p className="text-xs text-destructive">{err("full_name")}</p>}</div>
          <div className="space-y-2"><Label htmlFor="father_name">Father name</Label><Input id="father_name" {...form.register("father_name")} /></div>
          <div className="space-y-2"><Label htmlFor="date_of_birth">Date of birth</Label><Input id="date_of_birth" type="date" {...form.register("date_of_birth")} /></div>
          <div className="space-y-2"><Label htmlFor="cnic_or_bform">CNIC / B-Form</Label><Input id="cnic_or_bform" {...form.register("cnic_or_bform")} /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="address">Address</Label><Textarea id="address" {...form.register("address")} /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="photo_url">Photo URL (optional)</Label><Input id="photo_url" placeholder="https://..." {...form.register("photo_url")} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="phone">Phone *</Label><Input id="phone" {...form.register("phone")} />{err("phone") && <p className="text-xs text-destructive">{err("phone")}</p>}</div>
          <div className="space-y-2"><Label htmlFor="parent_phone">Parent phone</Label><Input id="parent_phone" {...form.register("parent_phone")} /></div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" disabled={sameAsPhone} {...form.register("whatsapp")} />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox checked={sameAsPhone} onCheckedChange={(v) => form.setValue("whatsapp_same_as_phone", Boolean(v), { shouldDirty: true })} />
              Same as phone
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Admission & fee</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="admission_date">Admission date *</Label><Input id="admission_date" type="date" {...form.register("admission_date")} /></div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", (v as "active" | "frozen" | "left" | "completed") ?? "active")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="frozen">Frozen</SelectItem>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="monthly_fee">Monthly fee (PKR)</Label><Input id="monthly_fee" type="number" min="0" {...form.register("monthly_fee")} /></div>
          <div className="space-y-2"><Label htmlFor="admission_fee">Admission fee (PKR)</Label><Input id="admission_fee" type="number" min="0" {...form.register("admission_fee")} /></div>
          <div className="space-y-2"><Label htmlFor="discount">Discount</Label><Input id="discount" type="number" min="0" {...form.register("discount")} /></div>
          <div className="space-y-2">
            <Label>Discount type</Label>
            <Select value={form.watch("discount_type")} onValueChange={(v) => form.setValue("discount_type", (v as "amount" | "percent") ?? "amount")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="amount">Amount</SelectItem><SelectItem value="percent">Percent</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="discount_reason">Discount reason</Label><Input id="discount_reason" {...form.register("discount_reason")} /></div>
          <div className="space-y-2 md:col-span-2">
            <Label>Assign batches</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {batches.map((batch) => {
                const checked = (form.watch("batch_ids") ?? []).includes(batch.id);
                return (
                  <label key={batch.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <Checkbox checked={checked} onCheckedChange={(v) => toggleBatch(batch.id, Boolean(v))} />
                    <span>{batch.name}</span>
                  </label>
                );
              })}
              {batches.length === 0 && <p className="text-xs text-muted-foreground">No active batches yet.</p>}
            </div>
          </div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" {...form.register("notes")} /></div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <LoaderCircleIcon className="size-4 animate-spin" />}
          {mode === "edit" ? "Save changes" : "Create student"}
        </Button>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href="/admin/students" />}>Cancel</Button>
      </div>
    </form>
  );
}
