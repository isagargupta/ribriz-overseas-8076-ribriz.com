import { NextResponse } from "next/server";
import { anthropic, SOP_MODEL } from "@/lib/ai/claude";
import { createClient } from "@/lib/supabase/server";

// Simple in-memory rate limiter (resets on server restart)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per hour
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface SOPRequest {
  // Student profile
  studentName: string;
  degree: string;
  college: string;
  gpa: string;
  workExperience: string;
  testScores: string;
  extracurriculars: string;
  // Target
  universityName: string;
  programName: string;
  country: string;
  // Guided answers
  whyField?: string;
  keyExperience?: string;
  careerGoals?: string;
  whyUniversity?: string;
  additionalInfo?: string;
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
      if (entry.count >= RATE_LIMIT) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Try again later." },
          { status: 429 }
        );
      }
      entry.count++;
    } else {
      rateLimitMap.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    }

    const body: SOPRequest = await request.json();

    if (!body.studentName || !body.universityName || !body.programName) {
      return NextResponse.json(
        { error: "studentName, universityName, and programName are required" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert academic admissions counselor who writes compelling Statements of Purpose (SOPs) for graduate school applications. You have helped thousands of Indian students get admitted to top universities worldwide.

Your writing style:
- Specific and personal — never generic
- Shows, doesn't tell — uses concrete examples
- Connects past experience to future goals with a clear narrative arc
- Mentions the target university by name and explains genuine fit
- Avoids clichés like "since childhood", "passion for", "in today's world"
- Professional but warm — sounds like a confident 22-25 year old, not a robot
- 600-800 words, 4-5 paragraphs

Return ONLY the SOP text. No markdown, no headers, no meta-commentary.`;

    const userPrompt = `Write a Statement of Purpose for the following student applying to ${body.universityName} for ${body.programName} (${body.country}).

STUDENT PROFILE:
- Name: ${body.studentName}
- Degree: ${body.degree}
- College: ${body.college}
- GPA: ${body.gpa}
- Work Experience: ${body.workExperience || "None"}
- Test Scores: ${body.testScores || "Not provided"}
- Extracurriculars: ${body.extracurriculars || "Not provided"}

STUDENT'S ANSWERS TO GUIDED QUESTIONS:
${body.whyField ? `- Why this field: ${body.whyField}` : ""}
${body.keyExperience ? `- Key experience: ${body.keyExperience}` : ""}
${body.careerGoals ? `- Career goals: ${body.careerGoals}` : ""}
${body.whyUniversity ? `- Why ${body.universityName}: ${body.whyUniversity}` : ""}
${body.additionalInfo ? `- Additional: ${body.additionalInfo}` : ""}

Write a compelling, personalized SOP. If guided answers are sparse, infer reasonable details from the profile but keep it authentic.`;

    const message = await anthropic.messages.create({
      model: SOP_MODEL,
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = message.content[0];
    const sopText = content.type === "text" ? content.text : "";

    return NextResponse.json({
      sop: sopText,
      wordCount: sopText.trim().split(/\s+/).length,
      model: SOP_MODEL,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error("Claude SOP generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SOP generation failed" },
      { status: 500 }
    );
  }
}
