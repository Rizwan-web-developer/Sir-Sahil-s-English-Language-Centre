"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2Icon, CopyIcon, CreditCardIcon, LoaderCircleIcon, UploadIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createStudentAction, updateStudentAction } from "@/lib/actions/students";
import { studentFormSchema, type StudentFormInput, type StudentFormValues } from "@/lib/validation/students";
import { createClient } from "@/lib/supabase/client";
import { StudentIdCard } from "@/components/students/id-card";
import { StudentQr } from "@/components/students/student-qr";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type BatchOption = { id: string; name: string; status?: string; class_type?: string };

type Props = {
  batches: BatchOption[];
  initial?: Partial<StudentFormValues> & { id?: string };
  mode?: "create" | "edit";
  instituteName?: string;
  institutePhone?: string;
  instituteAddress?: string;
  logoUrl?: string | null;
};

export function StudentForm({ batches, initial, mode = "create", instituteName, institutePhone, instituteAddress, logoUrl }: Props) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [created, setCreated] = useState<{ studentId: string; studentCode: string; studentNumber: number; fullName: string } | null>(null);

  const form = useForm<StudentFormInput, unknown, StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      full_name: initial?.full_name ?? "",
      father_name: initial?.father_name ?? "",
      date_of_birth: initial?.date_of_birth ?? "",
      cnic_or_bform: initial?.cnic_or_bform ?? "",
      address: initial?.address ?? "",
      photo_url: initial?.photo_url ?? "",
      whatsapp_number: initial?.whatsapp_number ?? "+92",
      guardian_whatsapp: initial?.guardian_whatsapp ?? "+92",
      admission_date: initial?.admission_date ?? new Date().toISOString().slice(0, 10),
      batch_ids: initial?.batch_ids ?? [],
      monthly_fee: initial?.monthly_fee ?? 0,
      admission_fee: initial?.admission_fee ?? 0,
      discount: initial?.discount ?? 0,
      discount_type: initial?.discount_type ?? "amount",
      discount_reason: initial?.discount_reason ?? "",
      notes: initial?.notes ?? "",
      status: initial?.status ?? "active",
      password: "",
    },
  });

  const photoUrl = form.watch("photo_url");

  function toggleBatch(batchId: string, checked: boolean) {
    const current = form.getValues("batch_ids") ?? [];
    form.setValue("batch_ids", checked ? [...current, batchId] : current.filter((id) => id !== batchId), { shouldDirty: true });
  }

  async function uploadPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `students/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("student-photos").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("student-photos").getPublicUrl(path);
      form.setValue("photo_url", data.publicUrl, { shouldDirty: true, shouldValidate: true });
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Photo upload failed");
    } finally {
      setPhotoUploading(false);
    }
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

      if (mode === "create" && "studentNumber" in result.data) {
        setCreated({ ...result.data, fullName: values.full_name } as { studentId: string; studentCode: string; studentNumber: number; fullName: string });
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
          <CardDescription>Student ID and QR are ready. Login is CNIC + password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
            <StudentQr value={created.studentNumber} size={84} />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Student ID</p>
              <p className="font-mono text-3xl font-semibold">{created.studentNumber}</p>
              <p className="text-sm text-muted-foreground">{created.fullName}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Sheet open={cardOpen} onOpenChange={setCardOpen}>
              <SheetTrigger render={<Button type="button" />}>
                <CreditCardIcon className="size-4" />Open ID Card
              </SheetTrigger>
              <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
                <SheetHeader>
                  <SheetTitle>Student ID Card</SheetTitle>
                  <SheetDescription>Branded card with QR. Print and give to student.</SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <StudentIdCard
                    student={{
                      full_name: created.fullName,
                      student_code: created.studentCode,
                      student_number: created.studentNumber,
                      photo_url: form.getValues("photo_url") || null,
                      batch_name: null,
                      timing: null,
                    }}
                    instituteName={instituteName}
                    institutePhone={institutePhone}
                    instituteAddress={instituteAddress}
                    logoUrl={logoUrl}
                  />
                  <Button type="button" onClick={() => window.print()}>Print ID Card</Button>
                </div>
              </SheetContent>
            </Sheet>
            <Button nativeButton={false} variant="outline" render={<Link href={`/admin/students/${created.studentId}`} />}>Open details</Button>
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
          <div className="space-y-2"><Label htmlFor="cnic_or_bform">CNIC / B-Form *</Label><Input id="cnic_or_bform" {...form.register("cnic_or_bform")} />{err("cnic_or_bform") && <p className="text-xs text-destructive">{err("cnic_or_bform")}</p>}</div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="address">Address</Label><Textarea id="address" {...form.register("address")} /></div>
          <div className="space-y-2 md:col-span-2">
            <Label>Photo</Label>
            <div className="flex items-center gap-4">
              <div className="size-20 overflow-hidden rounded-lg border bg-muted/30">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="Student" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No photo</div>
                )}
              </div>
              <div className="space-y-2">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={photoUploading}>
                  {photoUploading ? <LoaderCircleIcon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
                  Upload photo
                </Button>
                {photoUrl ? <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue("photo_url", "", { shouldDirty: true })}>Remove</Button> : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contact &amp; login</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="whatsapp_number">WhatsApp Number *</Label>
            <Input id="whatsapp_number" placeholder="+923001234567" {...form.register("whatsapp_number")} />
            {err("whatsapp_number") && <p className="text-xs text-destructive">{err("whatsapp_number")}</p>}
            <p className="text-[11px] text-muted-foreground">Must be in +92 format, e.g. +923001234567.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="guardian_whatsapp">Guardian WhatsApp Number *</Label>
            <Input id="guardian_whatsapp" placeholder="+923001234567" {...form.register("guardian_whatsapp")} />
            {err("guardian_whatsapp") && <p className="text-xs text-destructive">{err("guardian_whatsapp")}</p>}
            <p className="text-[11px] text-muted-foreground">Must be in +92 format, e.g. +923001234567.</p>
          </div>
          {mode === "create" && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="password">Password *</Label>
              <Input id="password" type="text" {...form.register("password")} placeholder="Set student login password" />
              {err("password") && <p className="text-xs text-destructive">{err("password")}</p>}
              <p className="text-[11px] text-muted-foreground">Student login: CNIC/B-Form + this password.</p>
            </div>
          )}
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
        <Button type="submit" disabled={isPending || photoUploading}>
          {isPending && <LoaderCircleIcon className="size-4 animate-spin" />}
          {mode === "edit" ? "Save changes" : "Create student"}
        </Button>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href="/admin/students" />}>Cancel</Button>
      </div>
    </form>
  );
}
