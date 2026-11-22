import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireOwner } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireOwner();
  const settings = await getSettings();
  const initial: Record<string, string> = {};
  for (const [k, v] of Object.entries(settings)) initial[k] = typeof v === "string" ? v : String(v ?? "");
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Owner only" title="Settings" description="Institute configuration, branding, payment details, and thresholds." />
      <SettingsForm initial={initial} />
    </div>
  );
}
