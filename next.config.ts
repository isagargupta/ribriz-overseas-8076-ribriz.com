import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "/s2/favicons**",
      },
      {
        protocol: "https",
        hostname: "logo.clearbit.com",
      },
      {
        protocol: "https",
        hostname: "university.wyriz.dev",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
    ],
  },

  // Performance: compress responses
  compress: true,

  // Performance: strip console.log in production
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },

  // Security & caching headers
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
    {
      // Cache static assets aggressively
      source: "/(.*)\\.(ico|svg|png|jpg|jpeg|gif|webp|woff|woff2)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
  ],
};

export default withSentryConfig(nextConfig, {
  org: "ribriz-overseas-ventures-pvt-l",
  project: "javascript-nextjs",

  // Auth token for uploading source maps (set SENTRY_AUTH_TOKEN in Vercel env).
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Silences the Sentry build output — remove to see upload logs.
  silent: !process.env.CI,

  // Upload source maps to Sentry so stack traces show original code.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Automatically tree-shake Sentry logger statements in production.
  disableLogger: true,

  // Capture React component names in error stack traces.
  reactComponentAnnotation: {
    enabled: true,
  },
});
