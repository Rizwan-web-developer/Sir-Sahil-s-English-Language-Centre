import { NextResponse } from "next/server";

import { getSettings, settingString } from "@/lib/settings";

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#0d2544"/><text x="32" y="39" text-anchor="middle" font-size="34" font-family="Arial" fill="#c9a227">S</text></svg>`;

export async function GET() {
  try {
    const settings = await getSettings();
    const logoUrl = settingString(settings, "platform_logo_url", "") || settingString(settings, "institute_logo_url", "");
    if (logoUrl) {
      const res = await fetch(logoUrl, { cache: "force-cache", next: { revalidate: 300 } });
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "image/png";
        const body = await res.arrayBuffer();
        return new NextResponse(body, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
          },
        });
      }
    }
  } catch {
    // fall through
  }
  return new NextResponse(FALLBACK_SVG, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    },
  });
}
