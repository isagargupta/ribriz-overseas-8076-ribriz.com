import { anthropic, CHAT_MODEL } from "@/lib/ai/claude";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// POST: Generate or update a candidate roadmap
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { action } = body as { action: "generate" | "toggle_milestone" | "refresh" };

    if (action === "generate") {
      const { targetDate, targetPrograms } = body as {
        targetDate: string;
        targetPrograms: string[];
      };

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          academicProfile: true,
          preferences: true,
          applications: {
            include: { program: { include: { university: true } } },
            take: 10,
          },
        },
      });

      const profile = dbUser?.academicProfile;
      const prefs = dbUser?.preferences;
      const monthsUntil = Math.max(1, Math.round(
        (new Date(targetDate).getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)
      ));

      const response = await anthropic.messages.create({
        model: CHAT_MODEL,
        max_tokens: 2000,
        temperature: 0.4,
        system: `You are a strategic study-abroad profile builder. Create a month-by-month roadmap for an Indian student to strengthen their profile before applying.

Consider:
- Current GPA, test scores, work experience, extracurriculars
- Target university requirements and competitiveness
- Time available (${monthsUntil} months)
- Realistic milestones (not everything at once)
- Categories: academic, test_prep, experience, research, extracurricular, documents, networking

Return ONLY a JSON array of milestone objects:
[
  {
    "month": 1,
    "title": "short title",
    "description": "what to do and why",
    "category": "academic|test_prep|experience|research|extracurricular|documents|networking",
    "priority": "high|medium|low",
    "completed": false,
    "completedAt": null
  }
]

Create 2-3 milestones per month. Be specific (name actual platforms, certifications, actions). Max ${Math.min(monthsUntil * 3, 36)} milestones.`,
        messages: [{
          role: "user",
          content: `STUDENT PROFILE:
- Name: ${dbUser?.name}
- Degree: ${profile?.degreeName ?? "N/A"} (${profile?.specialization ?? "N/A"}) from ${profile?.collegeName ?? "N/A"}
- GPA: ${profile?.gpa ?? "N/A"}/${profile?.gpaScale === "scale_4" ? "4.0" : profile?.gpaScale === "scale_10" ? "10" : "100"}
- IELTS: ${profile?.ieltsScore ?? "Not taken"}, GRE: ${profile?.greScore ?? "Not taken"}, GMAT: ${profile?.gmatScore ?? "Not taken"}
- Work Experience: ${profile?.workExperienceMonths ?? 0} months
- Certifications: ${profile?.certifications?.join(", ") || "None"}
- Publications: ${profile?.publications ?? "None"}
- Clubs/Activities: ${profile?.clubs ?? "None"}

TARGET:
- Programs: ${targetPrograms.join(", ")}
- Target Field: ${prefs?.targetField ?? "N/A"}
- Target Countries: ${prefs?.targetCountries?.join(", ") ?? "N/A"}
- Career Goals: ${prefs?.careerGoals ?? "N/A"}
- Time until application: ${monthsUntil} months (deadline: ${targetDate})
- Budget: ${prefs?.budgetRange?.replace(/_/g, " ") ?? "N/A"}

Generate the roadmap.`,
        }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "[]";
      const cleaned = text.replace(/```json|```/g, "").trim();
      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
      const milestones = arrayMatch ? JSON.parse(arrayMatch[0]) : [];

      const roadmap = await prisma.candidateRoadmap.create({
        data: {
          userId: user.id,
          targetDate: new Date(targetDate),
          targetPrograms,
          milestones,
        },
      });

      return Response.json({ id: roadmap.id, milestones, targetDate, targetPrograms });
    }

    if (action === "toggle_milestone") {
      const { roadmapId, milestoneIndex } = body as {
        roadmapId: string;
        milestoneIndex: number;
      };

      const roadmap = await prisma.candidateRoadmap.findUnique({
        where: { id: roadmapId },
      });
      if (!roadmap || roadmap.userId !== user.id) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }

      const milestones = roadmap.milestones as Array<{
        month: number;
        title: string;
        description: string;
        category: string;
        priority: string;
        completed: boolean;
        completedAt: string | null;
      }>;

      if (milestoneIndex < 0 || milestoneIndex >= milestones.length) {
        return Response.json({ error: "Invalid index" }, { status: 400 });
      }

      milestones[milestoneIndex].completed = !milestones[milestoneIndex].completed;
      milestones[milestoneIndex].completedAt = milestones[milestoneIndex].completed
        ? new Date().toISOString()
        : null;

      await prisma.candidateRoadmap.update({
        where: { id: roadmapId },
        data: { milestones, lastReviewedAt: new Date() },
      });

      return Response.json({ milestones });
    }

    if (action === "refresh") {
      const { roadmapId } = body as { roadmapId: string };

      const roadmap = await prisma.candidateRoadmap.findUnique({
        where: { id: roadmapId },
      });
      if (!roadmap || roadmap.userId !== user.id) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }

      return Response.json({
        id: roadmap.id,
        milestones: roadmap.milestones,
        targetDate: roadmap.targetDate,
        targetPrograms: roadmap.targetPrograms,
        status: roadmap.status,
        lastReviewedAt: roadmap.lastReviewedAt,
      });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Candidate builder error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

// GET: List user's roadmaps
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const roadmaps = await prisma.candidateRoadmap.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ roadmaps });
  } catch (error) {
    console.error("Candidate builder GET error:", error);
    return Response.json({ error: "Failed to fetch roadmaps" }, { status: 500 });
  }
}
