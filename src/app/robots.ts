import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/applications/", "/documents/", "/editor/", "/settings/", "/onboarding/", "/sop-writer/", "/riz-ai/", "/workspaces/", "/visa/", "/scholarships/", "/candidate-builder/", "/interview-prep/", "/war-room/"],
      },
    ],
    sitemap: "https://ribriz.com/sitemap.xml",
    host: "https://ribriz.com",
  };
}
