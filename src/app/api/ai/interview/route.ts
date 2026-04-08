import { anthropic, CHAT_MODEL } from "@/lib/ai/claude";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// POST: Start or continue an interview session
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { action, type, country, universityName, sessionId, answer, questionIndex } = body as {
      action: "start" | "answer" | "finish";
      type: "visa" | "university" | "scholarship";
      country?: string;
      universityName?: string;
      sessionId?: string;
      answer?: string;
      questionIndex?: number;
    };

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { academicProfile: true, preferences: true },
    });

    const profile = dbUser?.academicProfile;
    const prefs = dbUser?.preferences;

    const studentContext = `Student: ${dbUser?.name}
Degree: ${profile?.degreeName ?? "N/A"} from ${profile?.collegeName ?? "N/A"}
GPA: ${profile?.gpa ?? "N/A"}, IELTS: ${profile?.ieltsScore ?? "N/A"}
Target Field: ${prefs?.targetField ?? "N/A"}
Target Countries: ${prefs?.targetCountries?.join(", ") ?? "N/A"}
Career Goals: ${prefs?.careerGoals ?? "N/A"}
Work Experience: ${profile?.workExperienceMonths ?? 0} months`;

    if (action === "start") {
      // Generate 8 interview questions
      const systemPrompt = type === "visa"
        ? `You are a ${country ?? "foreign"} visa interview officer. Generate 8 realistic visa interview questions for an Indian student applying for a student visa. Questions should progress from easy to challenging. Include questions about:
1. Purpose of visit / study plans
2. Why this country specifically
3. Financial ability to support studies
4. Plans after graduation
5. Ties to home country
6. Specific program/university knowledge
7. Academic background relevance
8. A curveball question they might not expect`
        : type === "university"
        ? `You are an admissions interviewer at ${universityName ?? "a top university"}. Generate 8 realistic admission interview questions. Progress from introductory to deep. Include:
1. Tell me about yourself / why this program
2. Academic background and interests
3. Research experience or projects
4. Career goals and how this program fits
5. A challenging scenario question
6. What you'll contribute to campus
7. Specific faculty/research interest
8. Questions that test critical thinking`
        : `You are a scholarship interview panelist. Generate 8 questions for a merit/need-based scholarship interview. Include:
1. Why do you deserve this scholarship
2. Academic achievements and challenges overcome
3. Community involvement / leadership
4. Financial situation (tactfully)
5. Future goals and giving back
6. A situational leadership question
7. How you handle failure
8. What makes you unique`;

      const response = await anthropic.messages.create({
        model: CHAT_MODEL,
        max_tokens: 1000,
        temperature: 0.4,
        system: `${systemPrompt}\n\nContext about the student:\n${studentContext}\n\nReturn ONLY a JSON array of 8 question strings. No preamble.`,
        messages: [{ role: "user", content: "Generate the interview questions." }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "[]";
      const cleaned = text.replace(/```json|```/g, "").trim();
      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
      const questions: string[] = arrayMatch ? JSON.parse(arrayMatch[0]) : [];

      // Create session
      const session = await prisma.interviewSession.create({
        data: {
          userId: user.id,
          type,
          country: country ?? null,
          universityName: universityName ?? null,
          questionsAsked: questions.map((q) => ({
            question: q,
            answer: null,
            feedback: null,
            score: null,
          })),
        },
      });

      return Response.json({
        sessionId: session.id,
        questions,
        firstQuestion: questions[0],
      });
    }

    if (action === "answer" && sessionId && answer !== undefined && questionIndex !== undefined) {
      const session = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
      });
      if (!session || session.userId !== user.id) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }

      const questions = session.questionsAsked as Array<{
        question: string;
        answer: string | null;
        feedback: string | null;
        score: number | null;
      }>;

      const currentQ = questions[questionIndex];
      if (!currentQ) return Response.json({ error: "Invalid question index" }, { status: 400 });

      // Get AI feedback for this answer
      const feedbackResponse = await anthropic.messages.create({
        model: CHAT_MODEL,
        max_tokens: 400,
        temperature: 0.3,
        system: `You are an interview coach evaluating a student's answer during a ${type} interview. Be constructive but honest. Return JSON ONLY:
{
  "score": 0-100,
  "feedback": "2-3 sentences of constructive feedback",
  "tip": "one specific improvement tip"
}`,
        messages: [{
          role: "user",
          content: `Question: "${currentQ.question}"\nStudent's answer: "${answer}"\n\nStudent context: ${studentContext}`,
        }],
      });

      const fbText = feedbackResponse.content[0].type === "text" ? feedbackResponse.content[0].text : "{}";
      const fbMatch = fbText.match(/\{[\s\S]*\}/);
      const fb = fbMatch ? JSON.parse(fbMatch[0]) : { score: 50, feedback: "N/A", tip: "N/A" };

      // Update session
      questions[questionIndex] = {
        ...currentQ,
        answer,
        feedback: fb.feedback,
        score: fb.score,
      };

      await prisma.interviewSession.update({
        where: { id: sessionId },
        data: { questionsAsked: questions },
      });

      const nextQuestion = questionIndex < questions.length - 1 ? questions[questionIndex + 1].question : null;

      return Response.json({
        score: fb.score,
        feedback: fb.feedback,
        tip: fb.tip,
        nextQuestion,
        isComplete: questionIndex >= questions.length - 1,
      });
    }

    if (action === "finish" && sessionId) {
      const session = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
      });
      if (!session || session.userId !== user.id) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }

      const questions = session.questionsAsked as Array<{
        question: string;
        answer: string | null;
        feedback: string | null;
        score: number | null;
      }>;

      const answered = questions.filter((q) => q.score !== null);
      const avgScore = answered.length > 0
        ? Math.round(answered.reduce((sum, q) => sum + (q.score ?? 0), 0) / answered.length)
        : 0;

      // Generate overall summary
      const summaryResponse = await anthropic.messages.create({
        model: CHAT_MODEL,
        max_tokens: 500,
        temperature: 0.3,
        system: "You are an interview coach providing a final assessment. Be encouraging but honest. Return a 3-4 sentence summary of performance, key strengths, and top area for improvement.",
        messages: [{
          role: "user",
          content: `Interview type: ${type}\nOverall score: ${avgScore}/100\n\nQ&A:\n${answered.map((q) => `Q: ${q.question}\nA: ${q.answer}\nScore: ${q.score}/100\nFeedback: ${q.feedback}`).join("\n\n")}`,
        }],
      });

      const summary = summaryResponse.content[0].type === "text" ? summaryResponse.content[0].text : "";

      await prisma.interviewSession.update({
        where: { id: sessionId },
        data: {
          overallScore: avgScore,
          summary,
          durationSeconds: Math.round((Date.now() - session.createdAt.getTime()) / 1000),
        },
      });

      return Response.json({
        overallScore: avgScore,
        summary,
        questions,
      });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Interview error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Interview failed" },
      { status: 500 }
    );
  }
}
