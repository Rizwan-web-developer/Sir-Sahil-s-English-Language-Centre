"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { uploadInstituteLogoAction } from "@/lib/actions/profile";
import { updateSettingsAction } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = { initial: Record<string, string> };

function LogoUpload({ type, url, onChange }: { type: "platform" | "management" | "institute"; url: string; onChange: (url: string) => void }) {
  const ref = useRef<HTMLInputElement | null>(null);
  const [isUploading, startUpload] = useTransition();

  function upload(file: File | undefined) {
    if (!file) return;
    startUpload(async () => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await uploadInstituteLogoAction(fd);
      if (!res.ok) { toast.error(res.error); return; }
      onChange(res.data.url);
      toast.success(res.message ?? "Logo updated");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`${type} logo`} className="h-14 w-auto max-w-[180px] object-contain" />
      ) : (
        <div className="text-sm text-muted-foreground">No logo uploaded</div>
      )}
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      <Button type="button" variant="outline" onClick={() => ref.current?.click()} disabled={isUploading}>
        {isUploading ? "Uploading..." : "Upload logo"}
      </Button>
    </div>
  );
}

export function SettingsForm({ initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [isPending, startTransition] = useTransition();

  const allowed = [
    "platform_name",
    "platform_logo_url",
    "management_name",
    "management_logo_url",
    "institute_name",
    "institute_phone",
    "institute_address",
    "institute_logo_url",
  ];

  function save() {
    startTransition(async () => {
      const payload: Record<string, string> = {};
      for (const key of allowed) payload[key] = values[key] ?? "";
      const res = await updateSettingsAction(payload);
      if (!res.ok) toast.error(res.error); else toast.success(res.message ?? "Saved");
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Platform</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Platform logo</Label>
            <LogoUpload type="platform" url={values.platform_logo_url ?? ""} onChange={(url) => setValues((v) => ({ ...v, platform_logo_url: url }))} />
            <p className="text-[11px] text-muted-foreground">Shown in the sidebar, mobile menu and footer across the whole platform.</p>
          </div>
          <div className="space-y-2">
            <Label>Platform name</Label>
            <Input value={values.platform_name ?? ""} onChange={(e) => setValues((v) => ({ ...v, platform_name: e.target.value }))} placeholder="SELC" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Management</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Management logo</Label>
            <LogoUpload type="management" url={values.management_logo_url ?? ""} onChange={(url) => setValues((v) => ({ ...v, management_logo_url: url }))} />
          </div>
          <div className="space-y-2">
            <Label>Management name</Label>
            <Input value={values.management_name ?? ""} onChange={(e) => setValues((v) => ({ ...v, management_name: e.target.value }))} placeholder="Management" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Institute</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Institute logo</Label>
            <LogoUpload type="institute" url={values.institute_logo_url ?? ""} onChange={(url) => setValues((v) => ({ ...v, institute_logo_url: url }))} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Institute name</Label>
              <Input value={values.institute_name ?? ""} onChange={(e) => setValues((v) => ({ ...v, institute_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Phone number</Label>
              <Input value={values.institute_phone ?? ""} onChange={(e) => setValues((v) => ({ ...v, institute_phone: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={values.institute_address ?? ""} onChange={(e) => setValues((v) => ({ ...v, institute_address: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={isPending}>{isPending ? "Saving..." : "Save settings"}</Button>
    </div>
  );
}
