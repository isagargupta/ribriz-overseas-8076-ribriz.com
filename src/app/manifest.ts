import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RIBRIZ — AI-Powered Study Abroad Platform",
    short_name: "RIBRIZ",
    description:
      "Match with universities, predict admission chances, and generate SOPs with AI. No agent needed.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f9fb",
    theme_color: "#3525cd",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
