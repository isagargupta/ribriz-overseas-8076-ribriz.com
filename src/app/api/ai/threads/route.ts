import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserThreads, loadThreadMessages } from "@/lib/ai/memory";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("threadId");

    // Load specific thread's messages
    if (threadId) {
      const messages = await loadThreadMessages(threadId, 50);
      return NextResponse.json({ messages });
    }

    // List all threads
    const threads = await getUserThreads(user.id);
    return NextResponse.json({ threads });
  } catch (error) {
    console.error("Threads error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
