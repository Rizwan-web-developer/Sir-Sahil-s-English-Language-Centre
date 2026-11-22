import type { Metadata } from "next";

import { AccountPanel } from "@/components/account/account-panel";
import { PageHeader } from "@/components/shared/page-header";
import { requireOwner } from "@/lib/auth/session";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Account" };

export default async function OwnerAccountPage() {
  const { profile, email } = await requireOwner();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security"
        title={t.account.title}
        description={t.account.subtitle}
      />
      <AccountPanel
        name={profile.full_name}
        email={email}
        role={profile.role}
      />
    </div>
  );
}
