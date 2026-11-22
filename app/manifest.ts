import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sir Sahil's English Language Centre",
    short_name: "SELC",
    description: "SELC management and student portal",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f9fc",
    theme_color: "#0d2544",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
