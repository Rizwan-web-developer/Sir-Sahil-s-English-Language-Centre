import type { Metadata } from "next";
import { AwardIcon, ShieldCheckIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SessionBadge } from "@/components/shared/session-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { requireStudent } from "@/lib/auth/session";
import { getPortalCertificates } from "@/lib/data/portal";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CertificateStatus, SessionType } from "@/types/domain";

export const metadata: Metadata = { title: "Certificates" };

const CERTIFICATE_BADGES: Record<CertificateStatus, string> = {
  pending: "border-gold/40 bg-gold/10 text-gold-foreground dark:text-gold",
  approved: "border-primary/25 bg-primary/8 text-primary",
  issued: "border-success/30 bg-success/10 text-success",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  revoked: "border-destructive/30 bg-destructive/10 text-destructive",
};

export default async function PortalCertificatesPage() {
  const { profile } = await requireStudent();
  const certificates = await getPortalCertificates(profile.id);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t.nav.portalGroup}
        title={t.nav.certificates}
        description="Each level you finish earns a verified certificate."
      />

      {certificates.length === 0 ? (
        <EmptyState
          icon={AwardIcon}
          title={t.empty.certificatesTitle}
          description="Complete every topic in a level and Sir Sahil will approve your certificate. It will appear here."
        />
      ) : (
        <div className="space-y-3">
          {certificates.map((certificate) => (
            <Card key={certificate.id} className="overflow-hidden">
              <div className="flex items-start gap-3 border-b bg-muted/30 px-4 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold/15 text-gold-foreground ring-1 ring-gold/25 dark:text-gold">
                  <AwardIcon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm">{certificate.level}</CardTitle>
                  <CardDescription className="mt-0.5 font-mono text-[10px] tracking-wide">
                    {certificate.certificate_no}
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 text-[10px]",
                    CERTIFICATE_BADGES[certificate.status],
                  )}
                >
                  {t.certificateStatus[certificate.status]}
                </Badge>
              </div>

              <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 text-[11px]">
                {certificate.session_type && (
                  <SessionBadge
                    type={certificate.session_type as SessionType}
                    showDot={false}
                    className="h-5 px-1.5 text-[10px]"
                  />
                )}
                <span className="text-muted-foreground">
                  {certificate.issued_on
                    ? `Issued ${formatDate(certificate.issued_on)}`
                    : "Awaiting issue"}
                </span>
                <span className="ml-auto flex items-center gap-1 text-muted-foreground">
                  <ShieldCheckIcon className="size-3.5" />
                  Verifiable
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="rounded-xl border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">How certificates work</p>
        <p className="mt-1">
          A certificate is created when you complete a level. Sir Sahil approves
          it, then it is issued with a unique number and verification code so
          anyone can confirm it with the institute.
        </p>
      </div>
    </div>
  );
}
