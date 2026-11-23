"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2Icon, LoaderCircleIcon, ScanLineIcon, XCircleIcon } from "lucide-react";

import { StudentQr } from "@/components/students/student-qr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { quickAttendanceAction } from "@/lib/actions/attendance";
import { formatMonth, formatPKR } from "@/lib/format";
import { writeScannerMode } from "@/lib/scanner-mode";

type QuickData = Extract<
  Awaited<ReturnType<typeof quickAttendanceAction>>,
  { ok: true }
>["data"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scannerMode: boolean;
};

/**
 * Attendance popup: type the numeric student ID (or scan a QR) and the student
 * is marked present. Shows name, ID, QR, batch/session and this month's fee.
 */
export function AttendanceDialog({ open, onOpenChange, scannerMode }: Props) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<QuickData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [open, result]);

  function submit() {
    const value = code.trim();
    if (!value) return;
    setError(null);
    startTransition(async () => {
      const res = await quickAttendanceAction({ code: value, via: "manual_code" });
      if (!res.ok) {
        setResult(null);
        setError(res.error);
        return;
      }
      setResult(res.data);
      setCode("");
    });
  }

  function toggleScanner(next: boolean) {
    writeScannerMode(next);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setError(null);
          setCode("");
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLineIcon className="size-4 text-gold" />
            Attendance
          </DialogTitle>
          <DialogDescription>
            Enter the student ID and press Enter. The batch and session are detected from today&apos;s
            timetable.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Label htmlFor="attendance-student-id">Student ID</Label>
          <div className="flex gap-2">
            <Input
              id="attendance-student-id"
              ref={inputRef}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="e.g. 3306"
              inputMode="numeric"
              autoComplete="off"
              className="h-12 font-mono text-lg"
            />
            <Button type="submit" size="lg" disabled={isPending || !code.trim()}>
              {isPending ? <LoaderCircleIcon className="size-4 animate-spin" /> : "Mark present"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Numeric ID (3306) or student code (SELC-0001) both work.
          </p>
        </form>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <XCircleIcon className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div
            className={
              result.alreadyMarked
                ? "rounded-xl border border-gold/40 bg-gold/10 p-4"
                : "rounded-xl border border-success/30 bg-success/5 p-4"
            }
          >
            <div className="flex items-start gap-3">
              <StudentQr value={result.student.student_number} size={84} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2Icon className="size-4 shrink-0" />
                  {result.student.full_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  ID {result.student.student_number} &middot; {result.student.student_code}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge className="capitalize">{result.status}</Badge>
                  <Badge variant="outline">
                    {result.batch ? result.batch.name : "Batch"} &middot;{" "}
                    <span className="capitalize">{result.session_type}</span>
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-lg border bg-background/70 p-2.5 text-xs">
              <FeeLine fee={result.fee} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Scanner mode</p>
            <p className="text-[11px] text-muted-foreground">
              When on, scanning a QR marks attendance instantly without this popup.
            </p>
          </div>
          <Switch checked={scannerMode} onCheckedChange={toggleScanner} />
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            nativeButton={false}
            variant="ghost"
            onClick={() => onOpenChange(false)}
            render={<Link href="/admin/attendance" />}
          >
            Records
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            onClick={() => onOpenChange(false)}
            render={<Link href="/admin/attendance/scan" />}
          >
            Full scan kiosk
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FeeLine({ fee }: { fee: QuickData["fee"] }) {
  if (!fee.hasRecord) {
    return (
      <p className="text-muted-foreground">
        Fee {formatMonth(fee.period)}: <span className="font-medium">no record yet</span>
      </p>
    );
  }
  if (fee.paidInFull) {
    return (
      <p className="text-success">
        Fee {formatMonth(fee.period)}: <span className="font-semibold">paid</span>{" "}
        <span className="text-muted-foreground">({formatPKR(fee.amountPaid)})</span>
      </p>
    );
  }
  return (
    <p className="text-gold-foreground dark:text-gold">
      Fee {formatMonth(fee.period)}: <span className="font-semibold">pending</span>{" "}
      <span className="text-muted-foreground">
        (balance {formatPKR(fee.balance)}
        {fee.dueDate ? ` · due ${fee.dueDate}` : ""})
      </span>
    </p>
  );
}
