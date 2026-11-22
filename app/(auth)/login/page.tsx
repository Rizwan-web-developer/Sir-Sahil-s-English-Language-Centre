import type { Metadata } from "next";
import { CheckIcon, ClockIcon } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";
import { isDemoMode } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the SELC management platform.",
};

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-[#0d2544] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(201,162,39,0.18),transparent_46%),radial-gradient(circle_at_85%_78%,rgba(255,255,255,0.07),transparent_52%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.09)_1px,transparent_0)] bg-[size:24px_24px]"
        />
        <div
          aria-hidden
          className="absolute -right-24 top-1/3 size-72 rounded-full border border-white/10"
        />
        <div
          aria-hidden
          className="absolute -right-10 top-1/3 size-44 rounded-full border border-gold/25"
        />

        <div className="relative">
          <Logo variant="onDark" size="lg" />
        </div>

        <div className="relative max-w-md space-y-6">
          <Badge
            variant="outline"
            className="border-gold/35 bg-gold/10 text-gold"
          >
            <ClockIcon className="size-3" />
            Weekdays 2 PM – 10 PM · Weekend batches
          </Badge>

          <h1 className="font-heading text-[2.15rem] font-semibold leading-[1.15] tracking-tight text-white">
            One calm place to run the whole institute.
          </h1>

          <p className="text-sm leading-relaxed text-white/65">
            {t.app.description}
          </p>

          <ul className="space-y-3">
            {t.auth.features.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-white/80">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                  <CheckIcon className="size-3" />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative space-y-1 text-[11px] text-white/40">
          <p className="font-medium uppercase tracking-[0.2em] text-white/55">
            {t.app.shortName} Management Platform
          </p>
          <p>
            {t.app.timezone} · PKR · Week starts Monday
          </p>
        </div>
      </section>

      {/* Form panel */}
      <section className="relative flex min-h-dvh flex-col bg-background">
        <div className="flex items-center justify-between gap-3 p-5 sm:px-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-14 pt-2 sm:px-8">
          <div className="w-full max-w-sm space-y-7">
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <span className="h-px w-6 bg-gold" aria-hidden />
                {t.auth.staffNote} · {t.auth.studentNote}
              </p>
              <h2 className="font-heading text-2xl font-semibold tracking-tight">
                {t.auth.welcome}
              </h2>
              <p className="text-sm text-muted-foreground">{t.auth.subtitle}</p>
            </div>

            <LoginForm showDemo={isDemoMode()} />

            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              Need help signing in? Contact the institute reception.
            </p>
          </div>
        </div>

        <footer className="px-5 pb-5 text-center text-[10px] text-muted-foreground sm:px-8">
          © {new Date().getFullYear()} {t.app.name}. {t.auth.rights}
        </footer>
      </section>
    </div>
  );
}
