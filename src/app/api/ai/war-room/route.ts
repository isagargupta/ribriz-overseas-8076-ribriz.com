import { anthropic, CHAT_MODEL } from "@/lib/ai/claude";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

interface PersonaResult {
  name: string;
  role: string;
  verdict: "admit" | "waitlist" | "reject";
  confidence: number;
  reasoning: string;
  concerns: string[];
  strengths: string[];
}

const PERSONAS = [
  {
    name: "Dr. Mehta",
    role: "Department Head",
    system: `You are the Department Head of a top university's academic program. You focus on:
- Academic preparedness (GPA, coursework relevance, research experience)
- Research alignment with department faculty
- Academic trajectory and potential
- Publication record and academic achievements
You are rigorous and data-driven. Weak academics are a dealbreaker.`,
  },
  {
    name: "Ms. Fischer",
    role: "International Office",
    system: `You are the International Admissions Officer. You focus on:
- Language proficiency (IELTS/TOEFL scores and quality of written English)
- Visa likelihood and financial proof
- Cultural fit and adaptability indicators
- Prior international experience
- Country-specific compliance requirements
You are practical and focus on whether the student can actually succeed abroad.`,
  },
  {
    name: "Prof. Anderson",
    role: "Scholarship Committee",
    system: `You are on the Scholarship Review Committee. You focus on:
- Financial profile and genuine need
- Merit indicators (top percentile, awards, competitions)
- Leadership and community impact
- Return-on-investment for the scholarship program
- Diversity contribution
You evaluate whether this student deserves limited funding over other candidates.`,
  },
  {
    name: "Dr. Patel",
    role: "Student Affairs",
    system: `You are the Student Affairs representative. You focus on:
- Extracurricular engagement and leadership
- Community contribution and volunteering
- Personal growth narrative in the SOP
- Resilience indicators (overcoming challenges)
- Fit with campus culture and student body diversity
You champion well-rounded candidates who will enrich campus life.`,
  },
];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { applicationId } = await request.json();
    if (!applicationId) return Response.json({ error: "applicationId required" }, { status: 400 });

    // Load full context
    const [application, dbUser] = await Promise.all([
      prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          program: { include: { university: true } },
          appDocuments: { where: { type: "sop" }, take: 1 },
          applicationScores: { orderBy: { generatedAt: "desc" }, take: 1 },
        },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        include: {
          academicProfile: true,
          preferences: true,
          financialProfile: true,
        },
      }),
    ]);

    if (!application) return Response.json({ error: "Application not found" }, { status: 404 });
    if (application.userId !== user.id) return Response.json({ error: "Unauthorized" }, { status: 403 });

    const profile = dbUser?.academicProfile;
    const prefs = dbUser?.preferences;
    const program = application.program;
    const university = program.university;
    const sop = application.appDocuments[0];

    const studentContext = `
STUDENT PROFILE:
- Name: ${dbUser?.name}
- Degree: ${profile?.degreeName ?? "N/A"} from ${profile?.collegeName ?? "N/A"}
- GPA: ${profile?.gpa ?? "N/A"}/${profile?.gpaScale === "scale_4" ? "4.0" : profile?.gpaScale === "scale_10" ? "10" : "100"}
- Graduation Year: ${profile?.graduationYear ?? "N/A"}
- Work Experience: ${profile?.workExperienceMonths ?? 0} months
- IELTS: ${profile?.ieltsScore ?? "N/A"}, TOEFL: ${profile?.toeflScore ?? "N/A"}, GRE: ${profile?.greScore ?? "N/A"}, GMAT: ${profile?.gmatScore ?? "N/A"}
- Backlogs: ${profile?.backlogs ?? 0}
- Certifications: ${profile?.certifications?.join(", ") || "None"}
- Publications: ${profile?.publications ?? "None"}
- Extracurriculars: ${profile?.clubs ?? "None"}
- Volunteering: ${profile?.volunteering ?? "None"}
- Key Achievements: ${profile?.keyAchievements ?? "None"}

TARGET PROGRAM:
- University: ${university.name} (${university.country})
- Program: ${program.name} (${program.degreeLevel})
- QS Ranking: ${university.qsRanking ?? "Unranked"}
- Min GPA: ${program.minGpa ?? "N/A"}, Min IELTS: ${program.minIelts ?? "N/A"}, Min GRE: ${program.minGre ?? "N/A"}
- Acceptance Rate: ${university.acceptanceRate ? `${university.acceptanceRate}%` : "N/A"}
- Tuition: ${program.tuitionAnnual} ${program.tuitionCurrency}/year

PREFERENCES:
- Target Field: ${prefs?.targetField ?? "N/A"}
- Career Goals: ${prefs?.careerGoals ?? "N/A"}
- Budget: ${prefs?.budgetRange?.replace(/_/g, " ") ?? "N/A"}
- Why This Field: ${prefs?.whyThisField ?? "N/A"}

${sop ? `SOP EXCERPT (first 1500 chars):\n${sop.content.slice(0, 1500)}` : "SOP: Not yet written"}

FINANCIAL:
- Family Income: ${dbUser?.financialProfile?.familyIncomeRange ?? "N/A"}
- Sponsor: ${dbUser?.financialProfile?.sponsorType ?? "N/A"}
- Loan Planned: ${dbUser?.financialProfile?.loanPlanned ? "Yes" : "No"}

Match Score: ${application.matchScore ?? "Not calculated"}`;

    // Run 4 persona evaluations in parallel
    const personaPromises = PERSONAS.map(async (persona): Promise<PersonaResult> => {
      const response = await anthropic.messages.create({
        model: CHAT_MODEL,
        max_tokens: 800,
        temperature: 0.3,
        system: `${persona.system}

You are evaluating a student's application for admission. Analyze the application thoroughly from your perspective.

Return your evaluation as JSON ONLY:
{
  "verdict": "admit" | "waitlist" | "reject",
  "confidence": 0-100,
  "reasoning": "2-3 sentence explanation of your verdict",
  "concerns": ["concern 1", "concern 2", "concern 3"],
  "strengths": ["strength 1", "strength 2", "strength 3"]
}

Be honest and critical. Don't sugarcoat. Return ONLY valid JSON.`,
        messages: [{ role: "user", content: studentContext }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      return {
        name: persona.name,
        role: persona.role,
        verdict: parsed.verdict || "waitlist",
        confidence: parsed.confidence || 50,
        reasoning: parsed.reasoning || "Unable to evaluate",
        concerns: parsed.concerns || [],
        strengths: parsed.strengths || [],
      };
    });

    const personaResults = await Promise.all(personaPromises);

    // Synthesize with orchestrator
    const synthesisResponse = await anthropic.messages.create({
      model: CHAT_MODEL,
      max_tokens: 1000,
      temperature: 0.2,
      system: `You are the Admissions Committee Chair synthesizing evaluations from 4 committee members. Produce a final recommendation.

Return JSON ONLY:
{
  "finalVerdict": "admit" | "waitlist" | "reject",
  "finalConfidence": 0-100,
  "synthesis": "3-4 sentence synthesis of the committee's discussion",
  "agreements": ["points where all agreed"],
  "disagreements": ["points of contention"],
  "improvements": [
    { "title": "improvement 1", "description": "what to do", "impact": "high|medium|low" },
    { "title": "improvement 2", "description": "what to do", "impact": "high|medium|low" },
    { "title": "improvement 3", "description": "what to do", "impact": "high|medium|low" }
  ]
}`,
      messages: [{
        role: "user",
        content: `${studentContext}\n\nCOMMITTEE EVALUATIONS:\n${personaResults.map((p) => `${p.name} (${p.role}): ${p.verdict} (${p.confidence}% confidence)\nReasoning: ${p.reasoning}\nConcerns: ${p.concerns.join(", ")}\nStrengths: ${p.strengths.join(", ")}`).join("\n\n")}`,
      }],
    });

    const synthesisText = synthesisResponse.content[0].type === "text" ? synthesisResponse.content[0].text : "{}";
    const synthMatch = synthesisText.match(/\{[\s\S]*\}/);
    const synthesis = synthMatch ? JSON.parse(synthMatch[0]) : {};

    // Save simulation
    await prisma.warRoomSimulation.create({
      data: {
        userId: user.id,
        applicationId,
        personas: personaResults as unknown as import("@/generated/prisma/client").Prisma.InputJsonValue,
        finalVerdict: synthesis.finalVerdict || "waitlist",
        finalConfidence: synthesis.finalConfidence || 50,
        synthesis: synthesis.synthesis || "",
        improvements: synthesis.improvements || [],
      },
    });

    return Response.json({
      personas: personaResults,
      finalVerdict: synthesis.finalVerdict,
      finalConfidence: synthesis.finalConfidence,
      synthesis: synthesis.synthesis,
      agreements: synthesis.agreements || [],
      disagreements: synthesis.disagreements || [],
      improvements: synthesis.improvements || [],
      university: university.name,
      program: program.name,
    });
  } catch (error) {
    console.error("War Room error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "War Room simulation failed" },
      { status: 500 }
    );
  }
}
