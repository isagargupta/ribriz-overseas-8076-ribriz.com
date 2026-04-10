import Browserbase from "@browserbasehq/sdk";
import { chromium, Browser, Page } from "playwright-core";

const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });

export interface BrowserSession {
  sessionId: string;       // Browserbase session ID
  userId: string;
  applicationId: string;
  browser: Browser;        // Playwright connected over CDP to Browserbase
  page: Page;
  liveViewUrl: string;     // Browserbase debugger iframe URL
  createdAt: Date;
  lastActiveAt: Date;
  isBusy: boolean;
}

// In-memory session store
const sessions = new Map<string, BrowserSession>();

// Per-user daily usage counters
const dailyUsage = new Map<string, { count: number; resetAt: number }>();

const MAX_SESSIONS_PER_USER = 5;
const MAX_DAILY_SESSIONS = 20;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ─── Session Lifecycle ───────────────────────────────────────────────────────

export async function createSession(userId: string, applicationId: string): Promise<string> {
  const active = getActiveSessionsForUser(userId);
  if (active.length >= MAX_SESSIONS_PER_USER) {
    throw new Error(`You already have ${MAX_SESSIONS_PER_USER} active browser sessions. Please close one first.`);
  }

  const now = Date.now();
  const usage = dailyUsage.get(userId);
  if (usage && usage.resetAt > now) {
    if (usage.count >= MAX_DAILY_SESSIONS) {
      throw new Error(`Daily limit of ${MAX_DAILY_SESSIONS} assisted application sessions reached. Resets at midnight.`);
    }
    usage.count++;
  } else {
    const midnight = new Date();
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    dailyUsage.set(userId, { count: 1, resetAt: midnight.getTime() });
  }

  // 1. Create Browserbase session
  const bbSession = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
  });

  // 2. Connect Playwright over CDP first — this ensures the page is ready
  const browser = await chromium.connectOverCDP(bbSession.connectUrl);
  const context = browser.contexts()[0];
  const page = context.pages()[0];

  // 3. Get the live view URL — use page-level URL (clean viewport, no DevTools chrome)
  //    Must happen after CDP connect so pages[] is populated
  const liveUrls = await bb.sessions.debug(bbSession.id);
  const liveViewUrl =
    liveUrls.pages[0]?.debuggerFullscreenUrl ??
    liveUrls.debuggerFullscreenUrl;

  // Auto-dismiss JS dialogs
  page.on("dialog", async (dialog) => {
    try { await dialog.dismiss(); } catch { /* ignore */ }
  });

  const sessionId = bbSession.id;
  sessions.set(sessionId, {
    sessionId,
    userId,
    applicationId,
    browser,
    page,
    liveViewUrl,
    createdAt: new Date(),
    lastActiveAt: new Date(),
    isBusy: false,
  });

  // Auto-cleanup after TTL
  setTimeout(() => {
    closeSession(sessionId).catch(console.error);
  }, SESSION_TTL_MS);

  return sessionId;
}

export function getSession(sessionId: string): BrowserSession | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  session.lastActiveAt = new Date();
  return session;
}

export async function closeSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;
  sessions.delete(sessionId);
  try {
    await session.browser.close();
  } catch { /* ignore */ }
}

export function getActiveSessionsForUser(userId: string): BrowserSession[] {
  return Array.from(sessions.values()).filter((s) => s.userId === userId);
}

// ─── Screenshot (fallback — used by interact/route after an action) ───────────

export async function takeScreenshot(sessionId: string): Promise<string> {
  const session = getSession(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const buffer = await session.page.screenshot({
    type: "jpeg",
    quality: 90,
    fullPage: false,
  });

  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

// ─── Cleanup old sessions ─────────────────────────────────────────────────────

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActiveAt.getTime() > SESSION_TTL_MS) {
      closeSession(id).catch(console.error);
    }
  }
}, 5 * 60 * 1000);
