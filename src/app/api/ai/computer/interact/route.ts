import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/browser/session";
import { navigate, clickAt, typeText, pressKey, dismissPopups } from "@/lib/browser/actions";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, action, x, y, text, key, url, deltaY } = await request.json() as {
    sessionId: string;
    action: string;
    x?: number;
    y?: number;
    text?: string;
    key?: string;
    url?: string;
    deltaY?: number;
  };

  if (!sessionId || !action) {
    return Response.json({ error: "sessionId and action are required" }, { status: 400 });
  }

  const session = getSession(sessionId);
  if (!session || session.userId !== user.id) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  // Interaction lock — prevent overlapping actions
  if (session.isBusy) {
    return Response.json({ error: "busy" }, { status: 409 });
  }

  session.isBusy = true;
  try {
    const page = session.page;
    switch (action) {
      case "click":
        await clickAt(page, x!, y!);
        // Short settle — don't use networkidle (blocks isBusy for 8s on busy pages)
        await page.waitForTimeout(600);
        await dismissPopups(page);
        break;
      case "type":
        await typeText(page, text!);
        break;
      case "key":
        await pressKey(page, key!);
        if (key === "Enter") {
          await page.waitForTimeout(800);
          await dismissPopups(page);
        }
        break;
      case "scroll":
        await page.mouse.wheel(0, deltaY ?? 0);
        await page.waitForTimeout(200);
        break;
      case "navigate":
        await navigate(page, url!);
        await dismissPopups(page);
        break;
    }
    return Response.json({ ok: true, url: page.url() });
  } finally {
    session.isBusy = false;
  }
}
