"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { uploadInstituteLogoAction } from "@/lib/actions/profile";
import { updateSettingsAction } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = { initial: Record<string, string> };

export function SettingsForm({ initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [isPending, startTransition] = useTransition();
  const [isUploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);

  function save() {
    startTransition(async () => {
      const payload = {
        platform_name: (values.platform_name ?? "").trim(),
        platform_logo_url: values.platform_logo_url ?? "",
      };
      const res = await updateSettingsAction(payload);
      if (!res.ok) toast.error(res.error);
      else toast.success(res.message ?? "Saved");
    });
  }

  function uploadLogo(file: File | undefined) {
    if (!file) return;
    startUpload(async () => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "platform");
      const res = await uploadInstituteLogoAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setValues((v) => ({ ...v, platform_logo_url: res.data.url }));
      toast.success("Logo updated everywhere");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform</CardTitle>
        <CardDescription>Platform name and logo are used everywhere, including favicon.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="platform_name">Platform name</Label>
          <Input
            id="platform_name"
            value={values.platform_name ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, platform_name: e.target.value }))}
            placeholder="Sir Sahil's English Language Centre"
          />
        </div>

        <div className="space-y-2">
          <Label>Platform logo</Label>
          <div className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
            {values.platform_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={values.platform_logo_url} alt="Platform logo" className="h-14 w-auto max-w-[180px] object-contain" />
            ) : (
              <div className="text-sm text-muted-foreground">No logo uploaded</div>
            )}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0])} />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={isUploading}>
              {isUploading ? "Uploading..." : "Upload logo"}
            </Button>
          </div>
        </div>

        <Button onClick={save} disabled={isPending}>{isPending ? "Saving..." : "Save settings"}</Button>
      </CardContent>
    </Card>
  );
}
