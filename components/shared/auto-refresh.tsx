"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresh server components when the tab becomes visible again, throttled to avoid storms. */
export function AutoRefresh({ intervalMs = 120000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let last = Date.now();

    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last < 60000) return;
      last = now;
      router.refresh();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    document.addEventListener("visibilitychange", onVisibility);
    const id = window.setInterval(refresh, intervalMs);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(id);
    };
  }, [intervalMs, router]);

  return null;
}
