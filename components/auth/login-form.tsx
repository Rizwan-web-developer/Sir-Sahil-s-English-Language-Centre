"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRightIcon,
  CircleAlertIcon,
  EyeIcon,
  EyeOffIcon,
  IdCardIcon,
  LockIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/lib/auth/actions";
import { t } from "@/lib/i18n";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

const demoAccounts = [
  { label: t.auth.owner, identifier: "sir.sahil@selc.pk", password: "Owner@12345" },
  { label: t.auth.reception, identifier: "reception@selc.pk", password: "Reception@12345" },
  { label: t.auth.studentDemo, identifier: "SELC-0001", password: "Student@12345" },
];

export function LoginForm({ showDemo = false }: { showDemo?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
    mode: "onBlur",
  });

  function onSubmit(values: LoginInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await loginAction(values);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  function fillDemoAccount(identifier: string, password: string) {
    setServerError(null);
    form.setValue("identifier", identifier, { shouldValidate: true });
    form.setValue("password", password, { shouldValidate: true });
  }

  const identifierError = form.formState.errors.identifier?.message;
  const passwordError = form.formState.errors.password?.message;

  return (
    <div className="space-y-6">
      {serverError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="identifier">{t.auth.identifier}</Label>
          <div className="relative">
            <IdCardIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="identifier"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="you@example.com or SELC-0001"
              className="h-10 pl-9"
              aria-invalid={Boolean(identifierError)}
              aria-describedby="identifier-hint"
              {...form.register("identifier")}
            />
          </div>
          {identifierError ? (
            <p className="text-xs text-destructive">{identifierError}</p>
          ) : (
            <p id="identifier-hint" className="text-xs leading-relaxed text-muted-foreground">
              {t.auth.identifierHint}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password">{t.auth.password}</Label>
            <span className="text-[11px] text-muted-foreground">
              {t.auth.studentNote}
            </span>
          </div>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-10 pl-9 pr-10"
              aria-invalid={Boolean(passwordError)}
              {...form.register("password")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={
                showPassword ? t.auth.hidePassword : t.auth.showPassword
              }
              title={showPassword ? t.auth.hidePassword : t.auth.showPassword}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </Button>
          </div>
          {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-10 w-full gap-2"
          disabled={isPending}
        >
          {isPending ? t.auth.signingIn : t.auth.signIn}
          {!isPending && <ArrowRightIcon className="size-4" />}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Forgot password? Contact the institute reception for a reset.
      </p>

      {showDemo && (
        <div className="rounded-lg border border-dashed bg-muted/40 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t.auth.demoTitle}
          </p>
          <div className="mt-2 grid gap-1.5">
            {demoAccounts.map((account) => (
              <button
                key={account.identifier}
                type="button"
                onClick={() => fillDemoAccount(account.identifier, account.password)}
                className="flex items-center justify-between gap-3 rounded-md bg-background/70 px-2.5 py-1.5 text-left text-[11px] transition-colors hover:bg-background"
              >
                <span className="font-medium">{account.label}</span>
                <span className="truncate font-mono text-muted-foreground">
                  {account.identifier} · {account.password}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
            {t.auth.demoHint}
          </p>
        </div>
      )}
    </div>
  );
}
