import type { ReactNode } from "react";

import { StaffShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/session";

/**
 * Shared admin area. Owner and reception both use it; proxy + requireRole
 * keep students out. RLS blocks reception from teaching data at the DB level.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile } = await requireRole(["owner", "reception"]);

  return (
    <StaffShell profile={profile} area="admin">
      {children}
    </StaffShell>
  );
}
