import type { Page } from "playwright";

export type BlockerType = "captcha" | "login" | "account_creation" | "payment" | "2fa" | "error_page" | null;

export interface FormField {
  selector: string;
  label: string;
  type: string;       // "text" | "email" | "tel" | "number" | "date" | "select" | "textarea" | "checkbox" | "radio" | "file"
  name: string;
  id: string;
  required: boolean;
  placeholder: string;
  options: string[];  // For <select> elements
  value: string;      // Current value if any
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

const RETRY_DELAY_MS = 500;
const MAX_RETRIES = 2;

// ─── Helper: retry wrapper ────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string
): Promise<{ result?: T; error?: string }> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await fn();
      return { result };
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      } else {
        return { error: `${label} failed after ${MAX_RETRIES + 1} attempts: ${err instanceof Error ? err.message : String(err)}` };
      }
    }
  }
  return { error: `${label}: unexpected end of retry loop` };
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export async function navigate(page: Page, url: string): Promise<ActionResult> {
  const { error } = await withRetry(
    () => page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 }),
    `navigate(${url})`
  );
  if (error) return { success: false, error };
  await waitForStableDOM(page);
  return { success: true };
}

export async function getCurrentUrl(page: Page): Promise<string> {
  return page.url();
}

export async function waitForStableDOM(page: Page): Promise<void> {
  try {
    await page.waitForLoadState("networkidle", { timeout: 8000 });
  } catch {
    // networkidle can time out on busy pages; that's fine
  }
  await page.waitForTimeout(400);
  // Auto-dismiss cookie banners, modal notices, JS dialogs
  await dismissPopups(page);
}

// ─── Popup / Dialog Dismissal ─────────────────────────────────────────────────

const DISMISS_LABELS = [
  // English
  "allow all",
  "allow all cookies",
  "accept all cookies",
  "accept all",
  "accept",
  "i agree",
  "i accept",
  "got it",
  "agree",
  "ok",
  "close",
  "reject all",            // also dismisses (we want any resolution)
  "confirm my choices",    // OneTrust
  "save preferences",
  // German
  "alle akzeptieren",
  "akzeptieren",
  "einverstanden",
  "zustimmen",
  "bestätigen",
  "speichern und schließen",
  "alle ablehnen",
];

export async function dismissPopups(page: Page): Promise<{ dismissed: boolean; type?: string }> {
  // Handle JS dialogs (alert/confirm/prompt) — register once
  page.once("dialog", async (dialog) => {
    try { await dialog.dismiss(); } catch { /* ignore */ }
  });

  // Try clicking consent/dismiss buttons by text
  const result = await page.evaluate((labels: string[]) => {
    const candidates = Array.from(
      document.querySelectorAll(
        "button, a[role='button'], [role='button'], input[type='button'], input[type='submit']"
      )
    );
    for (const el of candidates) {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
      const text = (el.textContent ?? "").toLowerCase().trim();
      const ariaLabel = (el.getAttribute("aria-label") ?? "").toLowerCase();
      for (const label of labels) {
        if (text === label || text.startsWith(label) || ariaLabel.includes(label)) {
          (el as HTMLElement).click();
          return { dismissed: true, type: "consent_banner" };
        }
      }
    }

    // Look for × / ✕ close buttons in modal/dialog/popup containers
    const modalSelectors = [
      "[class*='modal'] button",
      "[class*='dialog'] button",
      "[class*='popup'] button",
      "[id*='modal'] button",
      "[role='dialog'] button",
    ];
    for (const sel of modalSelectors) {
      const btns = document.querySelectorAll(sel);
      for (const btn of btns) {
        const t = (btn.textContent ?? "").trim();
        if (t === "×" || t === "✕" || t === "✖" || t === "X" || t === "x") {
          const style = window.getComputedStyle(btn);
          if (style.display === "none" || style.visibility === "hidden") continue;
          (btn as HTMLElement).click();
          return { dismissed: true, type: "modal_close" };
        }
      }
    }
    return { dismissed: false };
  }, DISMISS_LABELS);

  if (result.dismissed) {
    await page.waitForTimeout(600);
  }

  return result;
}

// ─── DOM Extraction ───────────────────────────────────────────────────────────

export async function extractFormFields(page: Page): Promise<FormField[]> {
  return page.evaluate(() => {
    const fields: Array<{
      selector: string;
      label: string;
      type: string;
      name: string;
      id: string;
      required: boolean;
      placeholder: string;
      options: string[];
      value: string;
    }> = [];

    function getLabel(el: Element): string {
      // 1. Check for associated <label> by id
      const id = el.getAttribute("id");
      if (id) {
        const lbl = document.querySelector(`label[for="${id}"]`);
        if (lbl) return (lbl.textContent ?? "").trim().replace(/\s+/g, " ");
      }
      // 2. Check aria-label
      const ariaLabel = el.getAttribute("aria-label");
      if (ariaLabel) return ariaLabel.trim();
      // 3. Check aria-labelledby
      const labelledby = el.getAttribute("aria-labelledby");
      if (labelledby) {
        const ref = document.getElementById(labelledby);
        if (ref) return (ref.textContent ?? "").trim();
      }
      // 4. Walk up DOM looking for wrapping label or caption
      let parent = el.parentElement;
      for (let i = 0; i < 4 && parent; i++) {
        const lbl = parent.querySelector("label");
        if (lbl && !lbl.querySelector("input,select,textarea")) {
          return (lbl.textContent ?? "").trim().replace(/\s+/g, " ");
        }
        // Look for a sibling text node or span that acts as label
        const prevSibling = el.previousElementSibling;
        if (prevSibling && ["LABEL", "SPAN", "P", "DIV"].includes(prevSibling.tagName)) {
          const text = (prevSibling.textContent ?? "").trim();
          if (text && text.length < 80) return text;
        }
        parent = parent.parentElement;
      }
      // 5. Fallback: name attribute
      return el.getAttribute("name") ?? el.getAttribute("id") ?? "";
    }

    function buildSelector(el: Element): string {
      if (el.id) return `#${CSS.escape(el.id)}`;
      const name = el.getAttribute("name");
      if (name) return `[name="${CSS.escape(name)}"]`;
      // Build a path-based selector as last resort
      const tag = el.tagName.toLowerCase();
      const parent = el.parentElement;
      if (!parent) return tag;
      const siblings = Array.from(parent.querySelectorAll(tag));
      const idx = siblings.indexOf(el as HTMLElement);
      return `${tag}:nth-of-type(${idx + 1})`;
    }

    const inputSelectors = "input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='reset']):not([type='image']), select, textarea";
    const inputs = document.querySelectorAll(inputSelectors);

    inputs.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      let type = tag === "select" ? "select" : tag === "textarea" ? "textarea" : (el as HTMLInputElement).type ?? "text";

      // Skip invisible fields
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return;

      const label = getLabel(el);
      const selector = buildSelector(el);
      const name = el.getAttribute("name") ?? "";
      const id = el.getAttribute("id") ?? "";
      const required = (el as HTMLInputElement).required || el.hasAttribute("required") || el.getAttribute("aria-required") === "true";
      const placeholder = (el as HTMLInputElement).placeholder ?? "";
      const value = tag === "select"
        ? (el as HTMLSelectElement).value
        : (el as HTMLInputElement).value ?? "";

      let options: string[] = [];
      if (tag === "select") {
        options = Array.from((el as HTMLSelectElement).options)
          .filter((o) => o.value)
          .map((o) => o.text.trim());
      }

      fields.push({ selector, label, type, name, id, required, placeholder, options, value });
    });

    return fields;
  });
}

// ─── Blocker Detection ────────────────────────────────────────────────────────

export async function detectBlocker(page: Page): Promise<BlockerType> {
  const url = page.url();

  return page.evaluate((pageUrl) => {
    const bodyText = document.body.innerText.toLowerCase();
    const html = document.documentElement.innerHTML.toLowerCase();

    // CAPTCHA
    if (
      html.includes("recaptcha") ||
      html.includes("hcaptcha") ||
      html.includes("captcha") ||
      bodyText.includes("i'm not a robot") ||
      bodyText.includes("verify you are human")
    ) {
      return "captcha" as const;
    }

    // Account creation / registration required
    if (
      (bodyText.includes("create an account") ||
        bodyText.includes("register to apply") ||
        bodyText.includes("create account") ||
        bodyText.includes("sign up to") ||
        bodyText.includes("create your account") ||
        bodyText.includes("new applicant") ||
        bodyText.includes("create profile")) &&
      document.querySelector("input[type='email'], input[name*='email']")
    ) {
      return "account_creation" as const;
    }

    // Login wall
    if (
      (bodyText.includes("sign in") || bodyText.includes("log in") || bodyText.includes("login")) &&
      document.querySelector("input[type='password']")
    ) {
      return "login" as const;
    }

    // Payment
    if (
      bodyText.includes("application fee") ||
      bodyText.includes("payment") ||
      html.includes("stripe") ||
      html.includes("paypal") ||
      document.querySelector("input[name*='card'], input[name*='payment']")
    ) {
      return "payment" as const;
    }

    // 2FA / OTP
    if (
      bodyText.includes("verification code") ||
      bodyText.includes("one-time password") ||
      bodyText.includes("two-factor") ||
      bodyText.includes("2fa") ||
      (document.querySelector("input[maxlength='6']") && bodyText.includes("verify"))
    ) {
      return "2fa" as const;
    }

    // Error page (404, 500 etc)
    const title = document.title.toLowerCase();
    if (
      title.includes("404") ||
      title.includes("not found") ||
      title.includes("error") ||
      bodyText.includes("page not found")
    ) {
      return "error_page" as const;
    }

    void pageUrl; // suppress unused warning
    return null;
  }, url);
}

// ─── Field Actions ────────────────────────────────────────────────────────────

export async function fillField(page: Page, selector: string, value: string): Promise<ActionResult> {
  const { error } = await withRetry(async () => {
    await page.waitForSelector(selector, { timeout: 5000 });
    await page.fill(selector, value);
  }, `fillField(${selector})`);
  if (error) return { success: false, error };
  return { success: true };
}

export async function selectOption(page: Page, selector: string, value: string): Promise<ActionResult> {
  const { error } = await withRetry(async () => {
    await page.waitForSelector(selector, { timeout: 5000 });
    // Try exact value match first, then label match
    try {
      await page.selectOption(selector, { value });
    } catch {
      await page.selectOption(selector, { label: value });
    }
  }, `selectOption(${selector})`);
  if (error) return { success: false, error };
  return { success: true };
}

export async function clickElement(page: Page, selector: string): Promise<ActionResult> {
  const { error } = await withRetry(async () => {
    await page.waitForSelector(selector, { timeout: 5000 });
    await page.click(selector);
  }, `click(${selector})`);
  if (error) return { success: false, error };
  return { success: true };
}

export async function uploadFile(
  page: Page,
  selector: string,
  fileBuffer: Buffer,
  filename: string
): Promise<ActionResult> {
  const { error } = await withRetry(async () => {
    await page.waitForSelector(selector, { timeout: 5000 });
    await page.setInputFiles(selector, {
      name: filename,
      mimeType: filename.endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
      buffer: fileBuffer,
    });
  }, `uploadFile(${selector})`);
  if (error) return { success: false, error };
  return { success: true };
}

export async function scrollToSelector(page: Page, selector: string): Promise<ActionResult> {
  const { error } = await withRetry(async () => {
    await page.waitForSelector(selector, { timeout: 5000 });
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, selector);
  }, `scrollTo(${selector})`);
  if (error) return { success: false, error };
  return { success: true };
}

export async function waitForSelector(page: Page, selector: string, timeoutMs = 10000): Promise<ActionResult> {
  const { error } = await withRetry(
    () => page.waitForSelector(selector, { timeout: timeoutMs }),
    `waitFor(${selector})`
  );
  if (error) return { success: false, error };
  return { success: true };
}

// ─── Page Inspection ─────────────────────────────────────────────────────────

export async function findNextButton(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const candidates = [
      "button[type='submit']",
      "input[type='submit']",
      "button:not([type='button'])",
      "a[role='button']",
    ];

    for (const sel of candidates) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        const text = (el.textContent ?? "").toLowerCase().trim();
        if (
          text.includes("next") ||
          text.includes("continue") ||
          text.includes("proceed") ||
          text.includes("save & continue") ||
          text.includes("save and continue")
        ) {
          // Build selector
          if (el.id) return `#${CSS.escape(el.id)}`;
          if (el.getAttribute("name")) return `[name="${el.getAttribute("name")}"]`;
          return sel; // fallback
        }
      }
    }
    return null;
  });
}

export async function isOnFinalReviewPage(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    return (
      text.includes("review your application") ||
      text.includes("submit application") ||
      text.includes("confirm and submit") ||
      text.includes("final review") ||
      text.includes("review & submit") ||
      (document.querySelector("button[type='submit']") !== null &&
        (text.includes("submit") || text.includes("confirm")))
    );
  });
}

// ─── Interactive Actions ──────────────────────────────────────────────────────

export async function clickAt(page: Page, x: number, y: number): Promise<ActionResult> {
  try {
    await page.mouse.click(x, y);
    await page.waitForTimeout(300);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "click failed" };
  }
}

export async function typeText(page: Page, text: string): Promise<ActionResult> {
  try {
    await page.keyboard.type(text, { delay: 30 });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "type failed" };
  }
}

export async function pressKey(page: Page, key: string): Promise<ActionResult> {
  try {
    await page.keyboard.press(key);
    await page.waitForTimeout(200);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "key press failed" };
  }
}
