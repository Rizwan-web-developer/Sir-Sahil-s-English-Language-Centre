"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ScanLineIcon } from "lucide-react";
import { toast } from "sonner";

import { AttendanceDialog } from "@/components/attendance/attendance-dialog";
import { Button } from "@/components/ui/button";
import { quickAttendanceAction } from "@/lib/actions/attendance";
import {
  getScannerModeServerSnapshot,
  getScannerModeSnapshot,
  readScannerMode,
  subscribeScannerMode,
  writeScannerMode,
} from "@/lib/scanner-mode";

const OPEN_EVENT = "selc:open-attendance";

/**
 * Admin-only attendance host.
 *
 * - Listens for `selc:open-attendance` (sidebar "Attendance") and opens the popup.
 * - In scanner mode, a USB/Bluetooth scanner's keystrokes (fast digits + Enter)
 *   mark attendance instantly, with a toast, and no popup.
 */
export function AttendanceCenter({ area }: { area: "admin" | "owner" }) {
  const [open, setOpen] = useState(false);
  const scannerMode = useSyncExternalStore(
    subscribeScannerMode,
    getScannerModeSnapshot,
    getScannerModeServerSnapshot,
  );
  const openRef = useRef(false);
  const bufferRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (area !== "admin") return;
    const onOpen = () => {
      // When a hardware scanner is active, scans are marked instantly (no popup).
      if (readScannerMode()) {
        toast.info("Scanner mode is on — scan a QR to mark attendance instantly.");
        return;
      }
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [area]);

  const submitScan = useCallback(async (code: string) => {
    const res = await quickAttendanceAction({ code, via: "scanner" });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const data = res.data;
    if (data.alreadyMarked) {
      toast.info(`${data.student.full_name} already ${data.status} (ID ${data.student.student_number}).`);
    } else {
      toast.success(`${data.student.full_name} marked present (ID ${data.student.student_number}).`);
    }
  }, []);

  useEffect(() => {
    if (area !== "admin" || !scannerMode) return;

    function isTypingTarget(target: EventTarget | null) {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable ||
        Boolean(el.closest("[contenteditable='true']"))
      );
    }

    function resetBuffer() {
      bufferRef.current = "";
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      // The popup owns the keyboard while it is open.
      if (openRef.current) return;
      if (isTypingTarget(event.target)) return;

      if (event.key === "Enter") {
        const code = bufferRef.current.trim();
        resetBuffer();
        if (code.length < 3) return;
        event.preventDefault();
        void submitScan(code);
        return;
      }

      if (event.key.length === 1 && /[0-9A-Za-z-]/.test(event.key)) {
        bufferRef.current += event.key;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(resetBuffer, 400);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      resetBuffer();
    };
  }, [area, scannerMode, submitScan]);

  if (area !== "admin") return null;

  return (
    <AttendanceDialog
      open={open}
      onOpenChange={setOpen}
      scannerMode={scannerMode}
    />
  );
}

/** Topbar toggle for always-on scanner attendance. */
export function ScannerModeToggle() {
  const enabled = useSyncExternalStore(
    subscribeScannerMode,
    getScannerModeSnapshot,
    getScannerModeServerSnapshot,
  );

  function toggle() {
    const next = !enabled;
    writeScannerMode(next);
    if (next) toast.success("Scanner mode on — scans mark attendance instantly.");
    else toast.info("Scanner mode off.");
  }

  return (
    <Button
      variant={enabled ? "secondary" : "ghost"}
      size="icon"
      onClick={toggle}
      aria-pressed={enabled}
      title={enabled ? "Scanner mode is on" : "Turn on scanner mode"}
      aria-label={enabled ? "Scanner mode is on" : "Turn on scanner mode"}
    >
      <ScanLineIcon className={enabled ? "size-4 text-gold" : "size-4"} />
    </Button>
  );
}
