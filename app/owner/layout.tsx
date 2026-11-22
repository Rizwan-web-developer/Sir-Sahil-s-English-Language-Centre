import type { ReactNode } from "react";

import { StaffShell } from "@/components/layout/app-shell";
import { requireOwner } from "@/lib/auth/session";

/**
 * Teacher panel - Sir Sahil only.
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
