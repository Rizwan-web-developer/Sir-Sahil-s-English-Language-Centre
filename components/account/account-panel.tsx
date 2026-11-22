"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon, CameraIcon, KeyRoundIcon, ShieldCheckIcon } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction } from "@/lib/auth/actions";
import { uploadProfileAvatarAction } from "@/lib/actions/profile";
import { initials } from "@/lib/format";
import { t } from "@/lib/i18n";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/validation/auth";
import type { UserRole } from "@/types/domain";

type AccountPanelProps = {
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
};

export function AccountPanel({ name, email, role, avatarUrl }: AccountPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [isUploading, startUpload] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(avatarUrl ?? null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  function onSubmit(values: ChangePasswordInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await changePasswordAction(values);

      if (!result) return;

      if ("success" in result) {
        toast.success(result.success);
        form.reset();
        return;
      }

      setServerError(result.error);
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof ChangePasswordInput, { message });
        }
      }
    });
  }

  function onAvatarChange(file: File | undefined) {
    if (!file) return;
    startUpload(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadProfileAvatarAction(fd);
      if (!res.ok) { toast.error(res.error); return; }
      setCurrentAvatar(res.data.url);
      toast.success(res.message ?? "Profile photo updated.");
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr] lg:items-start">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="size-4 text-gold-foreground dark:text-gold" />
            {t.account.title}
          </CardTitle>
          <CardDescription>{t.account.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-3">
            <div className="relative">
              <div className="grid size-16 place-items-center overflow-hidden rounded-full border bg-background text-sm font-semibold">
                {currentAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentAvatar} alt={name} className="h-full w-full object-cover" />
                ) : (
                  initials(name)
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-foreground"
                aria-label="Upload profile photo"
                disabled={isUploading}
              >
                <CameraIcon className="size-3.5" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => onAvatarChange(e.target.files?.[0])}
              />
            </div>
            <div className="min-w-0">
              <p className="font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">{isUploading ? "Uploading..." : "Profile photo (circle)"}</p>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t.account.name}
            </p>
            <p className="font-medium">{name}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t.account.email}
            </p>
            <p className="break-all font-medium">{email || "—"}</p>
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t.common.role}
            </span>
            <Badge variant="outline">{t.roles[role]}</Badge>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t.account.readOnly}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-4 text-muted-foreground" />
            {t.common.changePassword}
          </CardTitle>
          <CardDescription>{t.account.tooShort}</CardDescription>
        </CardHeader>
        <CardContent>
          {serverError && (
            <Alert variant="destructive" className="mb-4">
              <CircleAlertIcon />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t.account.currentPassword}</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(form.formState.errors.currentPassword)}
                {...form.register("currentPassword")}
              />
              {form.formState.errors.currentPassword && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t.account.newPassword}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(form.formState.errors.newPassword)}
                  {...form.register("newPassword")}
                />
                {form.formState.errors.newPassword && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t.account.confirmPassword}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(form.formState.errors.confirmPassword)}
                  {...form.register("confirmPassword")}
                />
                {form.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <Button type="submit" disabled={isPending} className="gap-2">
              <KeyRoundIcon className="size-4" />
              {isPending ? t.account.updating : t.account.update}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
