import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of transactions for performance monitoring in production.
  // Increase to 1.0 (100%) if you want full tracing during development.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Capture 100% of error replays (session replay on error).
  replaysOnErrorSampleRate: 1.0,

  // Capture 1% of all sessions for general session replay.
  replaysSessionSampleRate: 0.01,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all media in replays for privacy.
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Disable in development so errors appear normally in the console.
  enabled: process.env.NODE_ENV === "production",
});
