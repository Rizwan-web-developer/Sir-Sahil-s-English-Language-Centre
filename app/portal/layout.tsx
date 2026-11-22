import type { ReactNode } from "react";

import { PortalShell } from "@/components/layout/portal-shell";
import { requireStudent } from "@/lib/auth/session";

/** Mobile-first student portal. */
export default async function PortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile } = await requireStudent();

  return <PortalShell profile={profile}>{children}</PortalShell>;
}
