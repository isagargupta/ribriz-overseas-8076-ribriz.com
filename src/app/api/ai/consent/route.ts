import { createClient } from "@/lib/supabase/server";
import { resolveConsent, getPendingConsents } from "@/lib/ai/consent";

/**
 * GET /api/ai/consent — Fetch pending consent requests for the current user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const pending = await getPendingConsents(user.id);
    return Response.json({ consents: pending });
  } catch (error) {
    console.error("Consent fetch error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch consents" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/consent — Approve or reject a consent request
 * Body: { consentId: string, approved: boolean }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { consentId, approved } = await request.json();

    if (!consentId || typeof approved !== "boolean") {
      return Response.json(
        { error: "consentId (string) and approved (boolean) are required" },
        { status: 400 }
      );
    }

    const result = await resolveConsent(consentId, user.id, approved);
    return Response.json(result);
  } catch (error) {
    console.error("Consent resolve error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to resolve consent" },
      { status: 500 }
    );
  }
}
