import { NextResponse } from "next/server";
import { anthropic, INSIGHT_MODEL } from "@/lib/ai/claude";
import { createClient } from "@/lib/supabase/server";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

interface InsightRequest {
  studentName: string;
  gpa: string;
  ielts?: string;
  gre?: string;
  targetCountries: string[];
  targetField: string;
  matchedUniversities: string[];
  applicationCount: number;
  documentsUploaded: number;
  documentsTotal: number;
}

export async function POST(request: Request) {
  try {
    // Rate limiting
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;
    const now = Date.now();
    const entry = rateLimitMap.get(userId);
    if (entry && entry.resetAt > now) {
      if (entry.count >= 20) {
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
      }
      entry.count++;
    } else {
      rateLimitMap.set(userId, { count: 1, resetAt: now + 3600000 });
    }

    const body: InsightRequest = await request.json();

    const message = await anthropic.messages.create({
      model: INSIGHT_MODEL,
      max_tokens: 200,
      temperature: 0.6,
      system: `You are a concise study-abroad advisor for Indian students. Give ONE actionable insight in 1-2 sentences. Be specific — reference actual scores, countries, or universities when possible. No fluff, no greetings. Sound confident and helpful.`,
      messages: [
        {
          role: "user",
          content: `Student: ${body.studentName}
GPA: ${body.gpa}, IELTS: ${body.ielts || "not taken"}, GRE: ${body.gre || "not taken"}
Target: ${body.targetField} in ${body.targetCountries.join(", ")}
Matched universities: ${body.matchedUniversities.slice(0, 5).join(", ")}
Applications: ${body.applicationCount}, Documents: ${body.documentsUploaded}/${body.documentsTotal}

Give one strategic insight for this student right now.`,
        },
      ],
    });

    const content = message.content[0];
    const insight = content.type === "text" ? content.text : "";

    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Claude insight error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Insight generation failed" },
      { status: 500 }
    );
  }
}
