"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2Icon, CircleDashedIcon, LoaderCircleIcon, ScanLineIcon, SearchIcon, XCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { StudentQr } from "@/components/students/student-qr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getAttendanceStudentDetailAction,
  quickAttendanceAction,
  searchAttendanceStudentsAction,
} from "@/lib/actions/attendance";
import { cn } from "@/lib/utils";

type SearchRow = {
  id: string;
  full_name: string;
  student_code: string;
  student_number: number;
  photo_url: string | null;
  status: string;
};

type Detail = Extract<Awaited<ReturnType<typeof getAttendanceStudentDetailAction>>, { ok: true }>["data"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function Placeholder() {
  return (
    <div className="grid gap-3 rounded-xl border p-3 md:grid-cols-[240px_minmax(0,1fr)]" aria-hidden="true">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="grid size-[72px] shrink-0 place-items-center rounded-lg border border-dashed bg-muted/30 text-muted-foreground">
            <ScanLineIcon className="size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <div className="h-4 w-32 rounded bg-muted/60" />
            <div className="h-3 w-24 rounded bg-muted/40" />
            <div className="h-5 w-24 rounded-full bg-muted/40" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button disabled size="sm">Present</Button>
          <Button variant="outline" disabled size="sm">Clear</Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Scan a QR or type a student ID / name, then press Enter.</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Monthly fee (6 months)</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border border-dashed px-2.5 py-1.5 text-sm text-muted-foreground/70">
              <span className="h-3 w-20 rounded bg-muted/40" />
              <span className="h-3 w-12 rounded bg-muted/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AttendanceDialog({ open, onOpenChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchRow[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isMarking, startMark] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const markByCodeRef = useRef<(code: string, via?: "scanner" | "manual_code" | "search") => void>(() => {});

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) return;
    const timer = setTimeout(() => {
      startSearch(async () => {
        const res = await searchAttendanceStudentsAction(q);
        if (res.ok) setResults(res.data);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [open, query]);

  /**
   * USB barcode scanners act as keyboards. While this popup is open we capture
   * scan characters even if the search box lost focus; when the popup is closed
   * this listener is detached, so scanning never marks attendance outside it.
   */
  useEffect(() => {
    if (!open) return;
    let buffer = "";
    let last = 0;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable),
      );
      if (typing) return; // the search form handles its own Enter

      const now = Date.now();
      if (now - last > 180) buffer = "";
      last = now;

      if (event.key === "Enter") {
        const code = buffer.trim();
        buffer = "";
        if (code) {
          event.preventDefault();
          markByCodeRef.current(code, "scanner");
        }
        return;
      }

      if (event.key.length === 1) buffer += event.key;
      if (buffer.length > 40) buffer = buffer.slice(-40);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function refreshDetail(studentId: string) {
    const res = await getAttendanceStudentDetailAction(studentId);
    if (res.ok) setDetail(res.data);
  }

  /** Mark a student present by QR/barcode or typed code, then load full details. */
  function markByCode(raw: string, via: "scanner" | "manual_code" | "search" = "manual_code") {
    const code = raw.trim();
    if (!code || !open) return;
    setError(null);
    startMark(async () => {
      const res = await quickAttendanceAction({ code, via, status: "present" });
      if (!res.ok) {
        setError(res.error);
        toast.error(res.error);
        setQuery("");
        setResults([]);
        return;
      }

      await refreshDetail(res.data.student.id);

      if (res.data.alreadyMarked) {
        toast.info(`${res.data.student.full_name} is already marked ${res.data.status}.`);
      } else {
        toast.success(`${res.data.student.full_name} marked present.`);
      }
      setQuery("");
      setResults([]);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    });
  }

  // Keep the global scanner listener pointed at the latest handler.
  useEffect(() => {
    markByCodeRef.current = markByCode;
  });

  /** Selecting a search result marks present immediately and opens the student card. */
  function selectAndMark(row: SearchRow) {
    if (!open) return;
    setError(null);
    startMark(async () => {
      const detailRes = await getAttendanceStudentDetailAction(row.id);
      if (!detailRes.ok) {
        setError(detailRes.error);
        return;
      }
      setDetail(detailRes.data);

      const res = await quickAttendanceAction({
        code: String(row.student_number),
        via: "search",
        status: "present",
      });
      if (!res.ok) {
        setError(res.error);
        toast.error(res.error);
        return;
      }

      await refreshDetail(row.id);
      if (res.data.alreadyMarked) {
        toast.info(`${row.full_name} is already marked ${res.data.status}.`);
      } else {
        toast.success(`${row.full_name} marked present.`);
      }
      setQuery("");
      setResults([]);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    });
  }

  /** Enter in the search box: exact code → mark; otherwise pick the first match. */
  async function submitQuery() {
    const q = query.trim();
    if (!q) return;
    if (/^\d+$/.test(q) || /^selc[-\s]?\d+$/i.test(q)) {
      markByCode(q, "scanner");
      return;
    }
    if (results.length > 0) {
      selectAndMark(results[0]);
      return;
    }
    const res = await searchAttendanceStudentsAction(q);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.data.length > 0) {
      selectAndMark(res.data[0]);
      return;
    }
    setError("No student found. Type a Student ID or name.");
  }

  function markPresent() {
    if (!detail) return;
    markByCode(String(detail.student.student_number), "manual_code");
  }

  function reset() {
    setQuery("");
    setResults([]);
    setDetail(null);
    setError(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLineIcon className="size-4 text-gold" />
            Attendance
          </DialogTitle>
          <DialogDescription>
            Scan QR / type a Student ID or name and press Enter — attendance marks present and the student card opens. Scanning only works while this popup is open.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void submitQuery();
          }}
        >
          <Label htmlFor="attendance-search">Student ID / Name</Label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="attendance-search"
              ref={inputRef}
              value={query}
              onChange={(e) => {
                const value = e.target.value;
                setQuery(value);
                if (!value.trim()) {
                  setResults([]);
                  setError(null);
                }
                if (detail) setDetail(null);
              }}
              placeholder="Scan QR or type student ID / name, then press Enter..."
              autoComplete="off"
              className="h-11 pl-9"
            />
            {(isSearching || isMarking) && (
              <LoaderCircleIcon className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            USB scanner: scan any time this popup is open. Manual: pick a result — it marks present and opens details.
          </p>
        </form>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <XCircleIcon className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!detail && results.length > 0 && (
          <div className="max-h-56 overflow-auto rounded-lg border divide-y">
            {results.map((s) => (
              <button
                key={s.id}
                type="button"
                className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted/40"
                onClick={() => selectAndMark(s)}
                disabled={isMarking}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.full_name}</p>
                  <p className="text-xs text-muted-foreground">Student ID {s.student_number}</p>
                </div>
                <Badge variant="outline" className="capitalize">{s.status}</Badge>
              </button>
            ))}
          </div>
        )}

        {!detail ? (
          <Placeholder />
        ) : (
          <div className="grid gap-3 rounded-xl border p-3 md:grid-cols-[240px_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <StudentQr value={detail.student.student_number} size={72} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight">{detail.student.full_name}</p>
                  <p className="text-xs text-muted-foreground">Student ID {detail.student.student_number}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {detail.todayAttendance ? (
                      <Badge className={cn("capitalize", detail.todayAttendance.status === "present" ? "bg-success text-white" : "")}>
                        Today: {detail.todayAttendance.status}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-destructive/40 text-destructive">
                        Today: Not marked
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" type="button" onClick={markPresent} disabled={isMarking || detail.todayAttendance?.status === "present"}>
                  {isMarking ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
                  {detail.todayAttendance?.status === "present" ? "Present marked" : "Present"}
                </Button>
                <Button size="sm" type="button" variant="outline" onClick={reset}>Clear</Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Monthly fee (6 months)</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {detail.fees.map((fee) => {
                  const future = fee.isFuture;
                  const paid = fee.paidInFull;
                  const currentUnpaid = fee.isCurrent && !paid;
                  return (
                    <div
                      key={fee.period}
                      className={cn(
                        "flex items-center justify-between rounded-md border px-2.5 py-1.5 text-sm",
                        future && "opacity-45",
                        paid && "border-success/30 bg-success/5",
                        currentUnpaid && "border-destructive/30 bg-destructive/5",
                      )}
                    >
                      <span className="font-medium">{fee.label}</span>
                      <span className="flex items-center gap-1.5 text-xs">
                        {future ? (
                          <span className="text-muted-foreground">Upcoming</span>
                        ) : paid ? (
                          <span className="inline-flex items-center gap-1 text-success"><CheckCircle2Icon className="size-3.5" />Paid</span>
                        ) : (
                          <span className={cn("inline-flex items-center gap-1", currentUnpaid ? "text-destructive" : "text-gold-foreground dark:text-gold")}>
                            <CircleDashedIcon className="size-3.5" />Unpaid
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
