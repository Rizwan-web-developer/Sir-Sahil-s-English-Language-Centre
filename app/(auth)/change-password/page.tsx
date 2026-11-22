import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountPanel } from "@/components/account/account-panel";
import { getSessionProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Change Password" };

export default async function ChangePasswordPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const { profile, email } = session;
  return (
    <main className="min-h-dvh bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm">
          <p className="font-medium">Password change required</p>
          <p className="text-muted-foreground">Please update your password before continuing.</p>
        </div>
        <AccountPanel name={profile.full_name} email={email} role={profile.role} />
      </div>
    </main>
  );
}
