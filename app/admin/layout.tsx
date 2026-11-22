import type { ReactNode } from "react";

import { StaffShell } from "@/components/layout/app-shell";
import { requireStaff } from "@/lib/auth/session";

/**
 * Management panel - reception/management only.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile } = await requireStaff();

  return (
    <StaffShell profile={profile} area="admin">
      {children}
    </StaffShell>
  );
}
