import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

const anthropic = new Anthropic();

/**
 * POST /api/app-documents/ai-suggest
 * Context-aware AI suggestions for documents
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {
      documentId,
      action,
      content,
      cursorPosition,
      selectedText,
    } = await request.json();

    // Fetch document context
    const doc = await prisma.applicationDocument.findFirst({
      where: { id: documentId, userId: user.id },
      include: {
        application: {
          include: { program: { include: { university: true } } },
        },
      },
    });
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    // Fetch student profile for context
    const profile = await prisma.academicProfile.findUnique({
      where: { userId: user.id },
    });
    const prefs = await prisma.preferences.findUnique({
      where: { userId: user.id },
    });
    const userName = (
      await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true },
      })
    )?.name;

    const program = doc.application.program;
    const university = program.university;

    // Build context-aware prompt
    const studentContext = profile
      ? `
Student Profile:
- Name: ${userName}
- Degree: ${profile.degreeName} from ${profile.collegeName}
- GPA: ${profile.gpa}/${profile.gpaScale === "scale_4" ? "4.0" : profile.gpaScale === "scale_10" ? "10" : "100"}
- Work Experience: ${profile.workExperienceMonths} months
- Test Scores: ${[profile.ieltsScore ? `IELTS ${profile.ieltsScore}` : null, profile.greScore ? `GRE ${profile.greScore}` : null, profile.gmatScore ? `GMAT ${profile.gmatScore}` : null].filter(Boolean).join(", ") || "Not provided"}
- Target Field: ${prefs?.targetField ?? "Not specified"}
- Career Goals: ${prefs?.careerGoals ?? "Not specified"}
- Extracurriculars: ${prefs?.extracurriculars?.join(", ") || "Not specified"}`
      : "";

    const docContext = `
Document Type: ${doc.type.toUpperCase()}
University: ${university.name}
Program: ${program.name}
Country: ${university.country}
City: ${university.city}`;

    const countryTone: Record<string, string> = {
      "United States":
        "Use a narrative, personal tone. Show passion and research fit. Mention specific faculty and labs.",
      "United Kingdom":
        "Be concise and academically focused. Less personal narrative, more intellectual motivation.",
      Germany:
        "Be structured and factual. Focus on academic qualifications and coursework alignment.",
      Canada:
        "Balance academic and personal. Emphasize research potential and supervisor fit.",
      Australia:
        "Be direct and professional. Focus on career outcomes and practical skills.",
    };

    const toneGuidance =
      countryTone[university.country] ??
      "Write in a professional, academic tone appropriate for graduate admissions.";

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "complete") {
      // Autocomplete — continue writing from cursor
      const beforeCursor = content.substring(0, cursorPosition);
      systemPrompt = `You are an expert graduate admissions writing assistant. You help students write application documents.

${docContext}
${studentContext}

Tone guidance for ${university.country}: ${toneGuidance}

IMPORTANT:
- Continue the student's writing naturally, matching their tone and style
- Write 1-3 sentences maximum
- Be specific to ${university.name} and ${program.name}
- Do NOT write generic filler — every sentence should add value
- Do NOT repeat what's already written
- Return ONLY the continuation text, no labels or explanations`;

      userPrompt = `Continue this ${doc.type} from where I stopped:\n\n${beforeCursor}`;
    } else if (action === "improve") {
      systemPrompt = `You are an expert graduate admissions editor. You improve application documents.

${docContext}
${studentContext}

Tone guidance for ${university.country}: ${toneGuidance}

IMPORTANT:
- Improve the selected text while keeping the student's voice
- Make it more specific, impactful, and relevant to ${university.name}
- Return ONLY the improved text, no explanations`;

      userPrompt = `Improve this text:\n\n${selectedText}`;
    } else if (action === "expand") {
      systemPrompt = `You are an expert graduate admissions writing assistant.

${docContext}
${studentContext}

Tone guidance for ${university.country}: ${toneGuidance}

IMPORTANT:
- Expand the selected text with more detail and depth
- Add specific examples, experiences, or connections to ${university.name}
- Keep the student's voice
- Return ONLY the expanded text`;

      userPrompt = `Expand this text with more detail:\n\n${selectedText}`;
    } else if (action === "generate_draft") {
      systemPrompt = `You are an expert graduate admissions consultant who helps students write ${doc.type.toUpperCase()} documents.

${docContext}
${studentContext}

Tone guidance for ${university.country}: ${toneGuidance}

CRITICAL RULES:
- Generate a STRUCTURED DRAFT, not a finished essay
- Include section headers as guidance (e.g., [Introduction], [Academic Background], etc.)
- Leave [PLACEHOLDER] markers where student should add personal details
- Be specific to ${university.name} and ${program.name}
- Reference the student's actual profile data (GPA, scores, experience)
- Do NOT fabricate experiences — use the profile data provided
- The draft should be 600-900 words
- Match the expected tone for ${university.country}`;

      const typeInstructions: Record<string, string> = {
        sop: `Generate a Statement of Purpose draft with these sections:
1. Opening Hook — connect personal motivation to ${program.name}
2. Academic Background — reference their ${profile?.degreeName ?? "degree"} and academic achievements
3. Relevant Experience — work/research/projects (use actual profile data)
4. Why ${university.name} — specific faculty, labs, courses, or research areas
5. Career Goals — how this program enables their goals
6. Conclusion`,
        motivation: `Generate a Motivation Letter draft (common in European applications):
1. Why this field
2. Academic preparation
3. Why ${university.name} specifically
4. How you will contribute
5. Future plans`,
        lor: `Generate a Letter of Recommendation TEMPLATE that the student can share with their recommender:
1. Opening (who is writing, in what capacity they know the student)
2. Academic/professional qualities
3. Specific examples of capability
4. Why suitable for ${program.name} at ${university.name}
5. Strong closing endorsement
Mark all sections that the recommender needs to personalize with [RECOMMENDER: fill in specific example]`,
        cv: `Generate a graduate application CV/Resume structure:
1. Education (use actual profile data)
2. Test Scores
3. Work Experience
4. Research & Projects [PLACEHOLDER]
5. Skills
6. Extracurriculars
7. Publications/Conferences [if applicable]`,
        essay: `Generate a supplemental essay draft. Focus on what unique perspective the student brings to ${program.name} at ${university.name}.`,
        research: `Generate a Research Proposal outline for ${program.name}:
1. Title
2. Introduction & Problem Statement
3. Literature Review outline
4. Methodology
5. Expected Outcomes
6. Timeline
7. References [PLACEHOLDER]`,
      };

      userPrompt = typeInstructions[doc.type] ?? `Generate a draft ${doc.type} document.`;
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const suggestion =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ suggestion, action });
  } catch (error) {
    console.error("AI suggest error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI suggestion failed" },
      { status: 500 }
    );
  }
}
