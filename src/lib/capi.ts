const CAPI_URL = "https://capi.ribriz.com/event";

interface CapiEventPayload {
  event_name: string;
  event_id: string;
  email?: string;
  phone?: string;
  custom_data?: Record<string, unknown>;
}

// Client-side: call from React components (uses NEXT_PUBLIC key)
export async function sendCapiEvent(payload: CapiEventPayload): Promise<void> {
  try {
    await fetch(CAPI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEXT_PUBLIC_CAPI_API_KEY!,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[CAPI] Failed to send event:", err instanceof Error ? err.message : err);
  }
}

// Server-side: call from API routes (uses server-only key, not exposed to browser)
export async function sendCapiEventServer(payload: CapiEventPayload): Promise<void> {
  try {
    await fetch(CAPI_URL, {
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
