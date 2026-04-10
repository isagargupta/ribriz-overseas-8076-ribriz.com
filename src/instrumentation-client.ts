import * as Sentry from "@sentry/nextjs";

// Initialize Sentry on the client side.
// This file runs before React hydration (Next.js 15.3+ instrumentation-client).
import "../sentry.client.config";

export function onRouterTransitionStart(
  url: string,
  navigationType: "push" | "replace" | "traverse"
) {
  Sentry.addBreadcrumb({
    category: "navigation",
    message: `${navigationType} → ${url}`,
    level: "info",
  });
}
