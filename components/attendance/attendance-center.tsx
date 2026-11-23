"use client";

import { useEffect, useState } from "react";

import { AttendanceDialog } from "@/components/attendance/attendance-dialog";

const OPEN_EVENT = "selc:open-attendance";

/** Admin-only attendance popup host. */
export function AttendanceCenter({ area }: { area: "admin" | "owner" }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (area !== "admin") return;
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [area]);

  if (area !== "admin") return null;

  return <AttendanceDialog open={open} onOpenChange={setOpen} />;
}
