import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getSettings, settingString } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Sir Sahil's English Language Centre.",
};

export default async function LoginPage() {
  const settings = await getSettings();
  const logoUrl = settingString(settings, "platform_logo_url", "") || settingString(settings, "institute_logo_url", "") || null;
  const platformName =
    settingString(settings, "platform_name", "") ||
    settingString(settings, "institute_name", "Sir Sahil's English Language Centre");
  return (
    <div className="h-dvh overflow-hidden bg-background">
      <div className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
        <ThemeToggle />
      </div>

      <main className="flex h-full items-center justify-center px-4 py-6 sm:px-6">
        <div className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-auto rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex flex-col items-center text-center">
            <Logo logoUrl={logoUrl} name={platformName} />
            <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight">Welcome</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to continue to {platformName}.
            </p>
          </div>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
