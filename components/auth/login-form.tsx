"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon, IdCardIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

const schema = z.object({
  identifier: z.string().trim().min(1, "This field is required"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const [mode, setMode] = useState<"admin" | "student">("admin");
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await loginAction(values);
      if (result?.error) setServerError(result.error);
    });
  }

  const isAdmin = mode === "admin";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
        <button
          type="button"
          onClick={() => { setMode("admin"); setServerError(null); form.reset(); }}
          className={cn("rounded-lg px-3 py-2 text-sm font-medium transition", isAdmin ? "bg-background shadow-sm" : "text-muted-foreground")}
        >
          Admin Login
        </button>
        <button
          type="button"
          onClick={() => { setMode("student"); setServerError(null); form.reset(); }}
          className={cn("rounded-lg px-3 py-2 text-sm font-medium transition", !isAdmin ? "bg-background shadow-sm" : "text-muted-foreground")}
        >
          Student Login
        </button>
      </div>

      {serverError && (
        <Alert variant="destructive" className="py-2">
          <CircleAlertIcon />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="identifier">{isAdmin ? "Email" : "Student Code / Phone"}</Label>
          <div className="relative">
            {isAdmin ? (
              <MailIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            ) : (
              <IdCardIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            )}
            <Input
              id="identifier"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={isAdmin ? "owner@gmail.com" : "SELC-0001 or phone number"}
              className="h-10 pl-9"
              {...form.register("identifier")}
            />
          </div>
          {form.formState.errors.identifier && <p className="text-xs text-destructive">{form.formState.errors.identifier.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter password"
              className="h-10 pl-9 pr-10"
              {...form.register("password")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </Button>
          </div>
          {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
        </div>

        <Button type="submit" className="h-10 w-full" disabled={isPending}>
          {isPending ? "Signing in..." : isAdmin ? "Login as Admin" : "Login as Student"}
        </Button>
      </form>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        {isAdmin ? "Admin access only. Student accounts are created by admin." : "Use the student code or phone number given by the institute."}
      </p>
    </div>
  );
}
