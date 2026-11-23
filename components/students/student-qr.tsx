"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { cn } from "@/lib/utils";

type StudentQrProps = {
  /** Numeric student ID, e.g. 3306. */
  value: string | number | null | undefined;
  size?: number;
  className?: string;
  alt?: string;
};

/**
 * Renders the student numeric ID as a QR code (dark navy on white).
 * Used on the ID card and in the attendance popup.
 */
export function StudentQr({ value, size = 112, className, alt }: StudentQrProps) {
  const text = String(value ?? "").trim();
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!text) return;
    let cancelled = false;
    QRCode.toDataURL(text, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0d2544", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc("");
      });
    return () => {
      cancelled = true;
    };
  }, [text, size]);

  if (!text || !src) {
    return (
      <div
        aria-hidden
        style={{ width: size, height: size }}
        className={cn("rounded-md bg-muted/40", className)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={size}
      height={size}
      alt={alt ?? `QR code for student ID ${text}`}
      className={cn("rounded-md bg-white", className)}
    />
  );
}
