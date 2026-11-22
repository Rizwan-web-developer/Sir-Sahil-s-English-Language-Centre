"use client";

import JsBarcode from "jsbarcode";
import { useEffect, useRef } from "react";

export function StudentBarcode({
  value,
  height = 52,
  width = 1.8,
  displayValue = true,
  className,
}: {
  value: string;
  height?: number;
  width?: number;
  displayValue?: boolean;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    JsBarcode(ref.current, value, {
      format: "CODE128",
      lineColor: "#0d2544",
      width,
      height,
      displayValue,
      fontSize: 12,
      margin: 0,
      background: "transparent",
    });
  }, [value, height, width, displayValue]);

  return <svg ref={ref} className={className} aria-label={`Barcode ${value}`} />;
}
