import type { Metadata } from "next";
import { CheckCircle2Icon, ShieldXIcon } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Certificate Verification" };

type PageProps = { params: Promise<{ token: string }> };

export default async function VerifyCertificatePage({ params }: PageProps) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data } = await admin
    .from("certificates")
    .select("certificate_no, status, issued_on, revoke_reason, student:students(full_name), level:levels(name)")
    .eq("verification_token", token)
    .maybeSingle();

  const cert = data as Record<string, unknown> | null;
  const student = cert ? (Array.isArray(cert.student) ? cert.student[0] : cert.student) as Record<string, unknown> | null : null;
  const level = cert ? (Array.isArray(cert.level) ? cert.level[0] : cert.level) as Record<string, unknown> | null : null;
  const revoked = String(cert?.status ?? "") === "revoked";
  const valid = Boolean(cert) && !revoked && ["approved", "issued"].includes(String(cert?.status));

  return (
    <main className="min-h-dvh bg-background px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-8 text-center shadow-sm">
        {valid ? (
          <>
            <CheckCircle2Icon className="mx-auto size-14 text-success" />
            <h1 className="mt-4 font-heading text-2xl font-semibold">Certificate Verified</h1>
            <p className="mt-2 text-sm text-muted-foreground">This certificate is authentic.</p>
          </>
        ) : (
          <>
            <ShieldXIcon className="mx-auto size-14 text-destructive" />
            <h1 className="mt-4 font-heading text-2xl font-semibold">{revoked ? "Certificate Revoked" : "Invalid Certificate"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{revoked ? "This certificate has been revoked by the institute." : "We could not verify this certificate token."}</p>
          </>
        )}

        {cert && (
          <div className="mt-6 rounded-lg border bg-muted/20 p-4 text-left text-sm space-y-2">
            <p><span className="text-muted-foreground">Student:</span> {String(student?.full_name ?? "—")}</p>
            <p><span className="text-muted-foreground">Level:</span> {String(level?.name ?? "—")}</p>
            <p><span className="text-muted-foreground">Certificate no:</span> <span className="font-mono">{String(cert.certificate_no ?? "—")}</span></p>
            <p><span className="text-muted-foreground">Issued:</span> {String(cert.issued_on ?? "—")}</p>
            {revoked && <p><span className="text-muted-foreground">Reason:</span> {String(cert.revoke_reason ?? "—")}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
