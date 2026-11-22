import type { Metadata } from "next";

import { AccountPanel } from "@/components/account/account-panel";
import { ProfileChangeRequest } from "@/components/portal/profile-change-request";
import { PageHeader } from "@/components/shared/page-header";
import { requireStudent } from "@/lib/auth/session";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Account" };

export default async function PortalAccountPage() {
  const { profile, email } = await requireStudent();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t.nav.portalGroup}
        title={t.account.title}
        description={t.account.subtitle}
      />
      <AccountPanel
        name={profile.full_name}
        email={email}
        role={profile.role}
        avatarUrl={profile.avatar_url}
      />
      <ProfileChangeRequest />
    </div>
  );
}
