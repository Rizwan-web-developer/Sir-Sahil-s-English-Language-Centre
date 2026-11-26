import type { MetadataRoute } from "next";

import { getSettings, settingString } from "@/lib/settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings();
  const name = settingString(settings, "platform_name", "") || "Sir Sahil's English Language Centre";
  const short = name.length > 24 ? "SELC" : name;
  const logo = settingString(settings, "platform_logo_url", "") || "/api/icon";

  return {
    name,
    short_name: short,
    description: `${name} management and student portal`,
    start_url: "/",
    display: "standalone",
    background_color: "#f7f9fc",
    theme_color: "#0d2544",
    icons: [{ src: logo, sizes: "any", purpose: "any" }],
  };
}
