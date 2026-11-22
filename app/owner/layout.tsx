import type { ReactNode } from "react";

import { StaffShell } from "@/components/layout/app-shell";
import { requireOwner } from "@/lib/auth/session";

/**
 * Teaching Panel — owner only. Reception is redirected by the proxy and by
 * requireOwner(); RLS additionally denies all curriculum/progress access.
 */
export default async function OwnerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile } = await requireOwner();

  return (
    <StaffShell profile={profile} area="owner">
      {children}
    </StaffShell>
  );
}
