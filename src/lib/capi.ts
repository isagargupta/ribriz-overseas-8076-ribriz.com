const CAPI_EXTERNAL_URL = "https://capi.ribriz.com/event";

interface CapiEventPayload {
  event_name: string;
  event_id: string;
  email?: string;
  phone?: string;
  custom_data?: Record<string, unknown>;
}

// Client-side: proxied through /api/capi to avoid CORS and keep the key server-only
export async function sendCapiEvent(payload: CapiEventPayload): Promise<void> {
  try {
    await fetch("/api/capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[CAPI] Failed to send event:", err instanceof Error ? err.message : err);
  }
}

// Server-side: call from API routes directly with the server-only key
export async function sendCapiEventServer(payload: CapiEventPayload): Promise<void> {
  try {
    await fetch(CAPI_EXTERNAL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CAPI_API_KEY!,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[CAPI] Server event failed:", err instanceof Error ? err.message : err);
  }
}
