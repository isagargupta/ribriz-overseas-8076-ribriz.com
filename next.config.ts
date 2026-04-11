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
        // Force HTTPS for 1 year; include subdomains
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
        // CSP: tightened per actual asset origins used in this app
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            // Scripts: self + Next.js inline scripts + Razorpay checkout
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
            // Styles: self + inline (Tailwind) + Google Fonts (Material Symbols stylesheet)
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            // Images: self + logo sources; gstatic.com needed because Google favicon service redirects there
            "img-src 'self' data: blob: https://www.google.com https://*.gstatic.com https://logo.clearbit.com https://university.wyriz.dev https://images.pexels.com",
            // Fonts: self + gstatic.com (Material Symbols + Google Fonts actual font files)
            "font-src 'self' https://fonts.gstatic.com",
            // API calls: self + Supabase + Sentry + Anthropic + Razorpay + university API + Perplexity
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://sentry.io https://de.sentry.io https://api.anthropic.com https://api.razorpay.com https://university.wyriz.dev https://api.perplexity.ai",
            // Frames: Razorpay checkout opens in an iframe
            "frame-src https://api.razorpay.com https://checkout.razorpay.com",
            // Workers: self + blob (used by Sentry)
            "worker-src 'self' blob:",
          ].join("; "),
        },
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

  webpack: {
    // Tree-shake Sentry debug logging in production builds.
    treeshake: {
      removeDebugLogging: true,
    },
    // Capture React component names in error stack traces.
    reactComponentAnnotation: {
      enabled: true,
    },
  },
});
