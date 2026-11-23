"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { CameraIcon, SearchIcon, WifiOffIcon } from "lucide-react";

import { finalizeAttendanceAction, markAttendanceAction } from "@/lib/actions/attendance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Row = Record<string, unknown>;

type Props = {
  today: string;
  schedules: Row[];
  enrollments: Row[];
  marked: Row[];
};

type ScanResult = {
  tone: "success" | "warning" | "error";
  title: string;
  detail: string;
  photo?: string | null;
  feePending?: number;
};

function normalizeCode(input: string) {
  return input.trim();
}

export function ScanKiosk({ today, schedules, enrollments, marked }: Props) {
  const [batchId, setBatchId] = useState<string>(String((schedules[0]?.batch_id as string) ?? ""));
  const [sessionType, setSessionType] = useState<"conversation" | "grammar">((schedules[0]?.session_type as "conversation" | "grammar") ?? "conversation");
  const [scanValue, setScanValue] = useState("");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [localMarked, setLocalMarked] = useState<Row[]>(marked);
  const [offlineQueue, setOfflineQueue] = useState<Array<{ code: string; at: string }>>(() => {
    if (typeof window === "undefined") return [];
    try { const raw = localStorage.getItem("selc_attendance_queue"); return raw ? JSON.parse(raw) as Array<{ code: string; at: string }> : []; } catch { return []; }
  });
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const batchOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of schedules) {
      const b = s.batch as Row | null;
      if (b?.id) map.set(String(b.id), String(b.name));
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [schedules]);

  const sessionOptions = useMemo(() => {
    return schedules
      .filter((s) => String(s.batch_id) === batchId)
      .map((s) => String(s.session_type) as "conversation" | "grammar");
  }, [schedules, batchId]);

  const effectiveSessionType = sessionOptions.includes(sessionType) ? sessionType : (sessionOptions[0] ?? "conversation");

  useEffect(() => { inputRef.current?.focus(); }, [batchId, effectiveSessionType, result]);

  useEffect(() => {
    localStorage.setItem("selc_attendance_queue", JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  const batchEnrollments = useMemo(() => enrollments.filter((e) => String(e.batch_id) === batchId), [enrollments, batchId]);
  const markedForSession = useMemo(() => localMarked.filter((m) => String(m.batch_id) === batchId && String(m.session_type) === effectiveSessionType && String(m.date) === today), [localMarked, batchId, effectiveSessionType, today]);
  const markedIds = new Set(markedForSession.map((m) => String(m.student_id)));
  const presentCount = markedForSession.filter((m) => m.status === "present").length;
  const lateCount = markedForSession.filter((m) => m.status === "late").length;
  const absentYet = Math.max(0, batchEnrollments.length - markedForSession.length);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return batchEnrollments.filter((e) => {
      const st = e.student as Row | null;
      const hay = `${String(st?.full_name ?? "")} ${String(st?.phone ?? "")} ${String(st?.student_code ?? "")} ${String(st?.student_number ?? "")}`.toLowerCase();
      return hay.includes(q);
    }).slice(0, 8);
  }, [search, batchEnrollments]);

  async function mark(by: "code" | "student_id", value: string, via: "scanner" | "manual_code" | "search" | "camera" | "manual_edit", status: "present" | "late" | "absent" | "leave" = "present") {
    if (!batchId) { toast.error("Select a batch."); return; }
    const code = by === "code" ? normalizeCode(value) : value;
    startTransition(async () => {
      try {
        const res = await markAttendanceAction({
          codeOrStudentId: code,
          by,
          batch_id: batchId,
          session_type: effectiveSessionType,
          date: today,
          status,
          marked_via: via,
        });
        if (!res.ok) {
          setResult({ tone: "error", title: "Not marked", detail: res.error });
          return;
        }
        const d = res.data;
        if (d.alreadyMarked) {
          setResult({ tone: "warning", title: "Already marked", detail: `${d.student.full_name} (ID ${d.student.student_number}) is already ${d.status}.`, photo: d.student.photo_url });
        } else {
          setLocalMarked((prev) => [...prev, { student_id: d.student.id, batch_id: batchId, session_type: effectiveSessionType, date: today, status: d.status }]);
          setResult({ tone: "success", title: d.status === "late" ? "LATE" : "PRESENT", detail: `${d.student.full_name} (ID ${d.student.student_number})`, photo: d.student.photo_url, feePending: d.feePending });
        }
      } catch {
        setOfflineQueue((prev) => [...prev, { code, at: new Date().toISOString() }]);
        setResult({ tone: "warning", title: "Queued offline", detail: `${code} saved locally and will sync later.` });
      }
      setScanValue("");
      setSearch("");
    });
  }

  function onScanSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scanValue.trim()) return;
    void mark("code", scanValue, "scanner");
  }

  async function onFinalize() {
    if (!batchId) return;
    startTransition(async () => {
      const res = await finalizeAttendanceAction({ batch_id: batchId, session_type: effectiveSessionType, date: today });
      if (!res.ok) toast.error(res.error);
      else toast.success(res.message ?? "Finalized");
    });
  }

  async function openCamera() {
    setCameraOpen(true);
    try {
      const { Html5QrcodeScanner } = await import("html5-qrcode");
      const elId = "selc-camera-scanner";
      setTimeout(() => {
        const scanner = new Html5QrcodeScanner(elId, { fps: 10, qrbox: 220 }, false);
        scanner.render((decoded) => {
          void mark("code", decoded, "camera");
          scanner.clear().catch(() => {});
          setCameraOpen(false);
        }, () => {});
      }, 100);
    } catch {
      toast.error("Camera scanner could not start.");
      setCameraOpen(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={batchId} onValueChange={(v) => setBatchId(v ?? "")}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Select batch" /></SelectTrigger>
          <SelectContent>{batchOptions.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={effectiveSessionType} onValueChange={(v) => setSessionType((v as "conversation" | "grammar") ?? "conversation")}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(sessionOptions.length ? sessionOptions : ["conversation", "grammar"]).map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline">{today}</Badge>
        {offlineQueue.length > 0 && <Badge variant="destructive"><WifiOffIcon className="size-3 mr-1" />{offlineQueue.length} queued</Badge>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Scan / mark attendance</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={onScanSubmit} className="flex gap-2">
              <Input ref={inputRef} value={scanValue} onChange={(e) => setScanValue(e.target.value)} placeholder="Scan QR / barcode or type student ID (3306)..." className="h-12 text-lg" autoFocus />
              <Button type="submit" size="lg" disabled={isPending}>Mark</Button>
            </form>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={openCamera}><CameraIcon className="size-4" />Camera scan</Button>
              <Button type="button" variant="outline" onClick={onFinalize} disabled={isPending}>Finalize (mark absent)</Button>
            </div>

            <div className="space-y-2">
              <LabelLike>Search by name/phone/code</LabelLike>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Type student name..." />
              </div>
              {searchResults.length > 0 && (
                <div className="rounded-lg border divide-y">
                  {searchResults.map((e) => {
                    const st = e.student as Row | null;
                    const sid = String(st?.id ?? "");
                    const already = markedIds.has(sid);
                    return (
                      <button key={String(e.id)} type="button" className="w-full p-3 text-left text-sm hover:bg-muted/40 flex items-center justify-between" onClick={() => !already && void mark("student_id", sid, "search")} disabled={already}>
                        <span><span className="font-medium">{String(st?.full_name)}</span> <span className="text-muted-foreground">(ID {String(st?.student_number ?? st?.student_code)})</span></span>
                        {already ? <Badge variant="outline">Marked</Badge> : <Badge>Mark present</Badge>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {result && (
              <div className={`rounded-xl border p-4 ${result.tone === "success" ? "border-success/30 bg-success/5" : result.tone === "warning" ? "border-gold/40 bg-gold/10" : "border-destructive/30 bg-destructive/5"}`}>
                <p className="text-lg font-semibold">{result.title}</p>
                <p className="text-sm text-muted-foreground">{result.detail}</p>
                {result.feePending ? <p className="mt-2 text-xs text-gold-foreground dark:text-gold">Fee pending: PKR {result.feePending.toLocaleString()}</p> : null}
              </div>
            )}

            {cameraOpen && <div id="selc-camera-scanner" className="rounded-lg border overflow-hidden" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Live session</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label="Present" value={presentCount} />
              <Stat label="Late" value={lateCount} />
              <Stat label="Not marked" value={absentYet} />
              <Stat label="Total" value={batchEnrollments.length} />
            </div>
            <div className="max-h-[420px] overflow-auto rounded-lg border divide-y">
              {batchEnrollments.map((e) => {
                const st = e.student as Row | null;
                const sid = String(st?.id ?? "");
                const markRow = markedForSession.find((m) => String(m.student_id) === sid);
                return (
                  <div key={String(e.id)} className="flex items-center justify-between p-2 text-sm">
                    <div>
                      <div className="font-medium">{String(st?.full_name ?? "—")}</div>
                      <div className="text-[11px] text-muted-foreground">{st?.student_number ? `ID ${String(st.student_number)} · ` : ""}{String(st?.student_code ?? "")}</div>
                    </div>
                    {markRow ? <Badge variant="outline" className="capitalize">{String(markRow.status)}</Badge> : <span className="text-xs text-muted-foreground">Pending</span>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LabelLike({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium">{children}</p>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border bg-muted/20 p-3"><p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p><p className="text-xl font-semibold">{value}</p></div>;
}
