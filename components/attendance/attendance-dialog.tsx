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

export function AttendanceDialog({ open, onOpenChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchRow[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isLoading, startLoad] = useTransition();
  const [isMarking, startMark] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [open, detail]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      startSearch(async () => {
        const res = await searchAttendanceStudentsAction(q);
        if (res.ok) setResults(res.data);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [open, query]);

  function selectStudent(id: string) {
    setError(null);
    startLoad(async () => {
      const res = await getAttendanceStudentDetailAction(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDetail(res.data);
      setResults([]);
    });
  }

  function markPresent() {
    if (!detail) return;
    setError(null);
    startMark(async () => {
      const res = await quickAttendanceAction({
        code: String(detail.student.student_number),
        via: "manual_code",
        status: "present",
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(res.message ?? "Attendance marked");
      // Refresh detail
      const refreshed = await getAttendanceStudentDetailAction(detail.student.id);
      if (refreshed.ok) setDetail(refreshed.data);
    });
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLineIcon className="size-4 text-gold" />
            Attendance
          </DialogTitle>
          <DialogDescription>
            Student ID ya name likhein, profile select karein, phir Present mark karein.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="attendance-search">Student ID / Name</Label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="attendance-search"
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (detail) setDetail(null);
              }}
              placeholder="e.g. 3306 or student name"
              autoComplete="off"
              className="h-11 pl-9"
            />
            {(isSearching || isLoading) && (
              <LoaderCircleIcon className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <XCircleIcon className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!detail && results.length > 0 && (
          <div className="max-h-64 overflow-auto rounded-lg border divide-y">
            {results.map((s) => (
              <button
                key={s.id}
                type="button"
                className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted/40"
                onClick={() => selectStudent(s.id)}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.full_name}</p>
                  <p className="text-xs text-muted-foreground">ID {s.student_number} · {s.student_code}</p>
                </div>
                <Badge variant="outline" className="capitalize">{s.status}</Badge>
              </button>
            ))}
          </div>
        )}

        {detail && (
          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex items-start gap-3">
              <StudentQr value={detail.student.student_number} size={88} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{detail.student.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  ID {detail.student.student_number} · {detail.student.student_code}
                </p>
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

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Monthly fee (6 months)</p>
              <div className="grid gap-1.5">
                {detail.fees.map((fee) => {
                  const future = fee.isFuture;
                  const paid = fee.paidInFull;
                  const currentUnpaid = fee.isCurrent && !paid;
                  return (
                    <div
                      key={fee.period}
                      className={cn(
                        "flex items-center justify-between rounded-md border px-3 py-2 text-sm",
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

            <div className="flex gap-2">
              <Button onClick={markPresent} disabled={isMarking || detail.todayAttendance?.status === "present"}>
                {isMarking ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
                {detail.todayAttendance?.status === "present" ? "Present marked" : "Present"}
              </Button>
              <Button variant="outline" onClick={reset}>Clear</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
