import type { Metadata } from "next";

import { PasswordChangeForm } from "@/components/admin/password-change-form";
import { SettingsForm } from "@/components/admin/settings-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireStaff } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireStaff();
  const settings = await getSettings();
  const initial: Record<string, string> = {
    platform_name: typeof settings.platform_name === "string" ? settings.platform_name : "",
    platform_logo_url: typeof settings.platform_logo_url === "string" ? settings.platform_logo_url : "",
  };
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Management" title="Settings" description="Platform branding and password." />
      <SettingsForm initial={initial} />
      <PasswordChangeForm />
    </div>
  );
}
