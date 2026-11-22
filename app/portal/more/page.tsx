import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import { PortalSignOutButton } from "@/components/portal/portal-sign-out-button";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireStudent } from "@/lib/auth/session";
import { portalMoreLinks } from "@/components/layout/nav-config";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "More" };

export default async function PortalMorePage() {
  await requireStudent();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t.nav.portalGroup}
        title={t.nav.more}
        description="Timetable, assignments, certificates and your account."
      />

      <Card className="overflow-hidden py-0">
        <CardContent className="divide-y p-0">
          {portalMoreLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-muted/50"
              >
                <span className="grid size-9 place-items-center rounded-lg bg-primary/8 text-primary">
                  <Icon className="size-4" />
                </span>
                <span className="flex-1 font-medium">{item.label}</span>
                <ChevronRightIcon className="size-4 text-muted-foreground" />
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          <PortalSignOutButton />
        </CardContent>
      </Card>

      <p className="px-1 text-center text-[11px] leading-relaxed text-muted-foreground">
        {t.app.name} · {t.app.timezone}
      </p>
    </div>
  );
}
