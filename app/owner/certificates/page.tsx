import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { CertificatesManager } from "@/components/owner/certificates-manager";
import { requireOwner } from "@/lib/auth/session";
import { getOwnerCertificatesData } from "@/lib/data/certificates";

export const metadata: Metadata = { title: "Certificates" };

export default async function OwnerCertificatesPage() {
  await requireOwner();
  const data = await getOwnerCertificatesData();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Owner only" title="Certificates" description="Eligibility, approval, issuance, and revocation." />
      <CertificatesManager certRows={data.certRows} eligible={data.eligible} thresholds={data.thresholds} />
    </div>
  );
}
