import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { createSession, getSession, closeSession, takeScreenshot } from "@/lib/browser/session";
import {
  navigate,
  detectBlocker,
  dismissPopups,
  getCurrentUrl,
} from "@/lib/browser/actions";
import { getPlatformForUniversity } from "@/lib/browser/portal-configs";
import type { PlatformConfig } from "@/lib/browser/portal-configs";
import type { StudentProfile } from "@/lib/browser/field-mapper";
// ─── Types ────────────────────────────────────────────────────────────────────

type ComputerAction = "start" | "resume" | "pause";

interface StepEvent {
  stepNumber: number;
  instruction: string;
  fieldName?: string;
  suggestedValue?: string;
  isSensitive?: boolean;
}

// ─── Application Guide Builder ────────────────────────────────────────────────
//
// Generates step-by-step guidance for ANY university portal.
// Student follows these in their own browser tab.

function buildApplicationGuide(
  universityName: string,
  programName: string,
  profile: StudentProfile,
  platform: PlatformConfig | null,
  detectedBlocker: string | null
): StepEvent[] {
  const steps: StepEvent[] = [];
  let n = 1;

  steps.push({
    stepNumber: n++,
    instruction: `Click "Open Portal Tab" to open the ${universityName} application portal in your browser.`,
  });

  if (detectedBlocker === "login") {
    // Already on a login page — guide them to log in
    steps.push({ stepNumber: n++, instruction: "Enter your registered email address.", fieldName: "Email", suggestedValue: profile.email });
    steps.push({ stepNumber: n++, instruction: "Enter your password and log in.", fieldName: "Password", isSensitive: true });
    steps.push({ stepNumber: n++, instruction: `After logging in, search for "${programName}" and start a new application.` });
  } else {
    // Registration / new applicant flow
    const accountNote = platform?.accountRequired
      ? " An account is required before you can apply."
      : "";
    steps.push({
      stepNumber: n++,
      instruction: `Look for "Register", "Create Account", or "Apply Online" and click it.${accountNote}`,
    });

    if (profile.email) steps.push({ stepNumber: n++, instruction: "Enter your email address.", fieldName: "Email", suggestedValue: profile.email });
    if (profile.firstName) steps.push({ stepNumber: n++, instruction: "Enter your first name.", fieldName: "First Name", suggestedValue: profile.firstName });
    if (profile.lastName) steps.push({ stepNumber: n++, instruction: "Enter your last name (surname).", fieldName: "Last Name", suggestedValue: profile.lastName });
    if (profile.dob) steps.push({ stepNumber: n++, instruction: "Enter your date of birth.", fieldName: "Date of Birth", isSensitive: true });

    steps.push({ stepNumber: n++, instruction: "Create a strong password for this account.", fieldName: "Password", isSensitive: true });
    steps.push({ stepNumber: n++, instruction: "Verify your email — check your inbox and click the confirmation link if one is sent." });
    steps.push({ stepNumber: n++, instruction: `Once logged in, search for "${programName}" and start a new application.` });
  }

  // Academic details
  if (profile.gpa && profile.gpaScale) {
    const scale = profile.gpaScale === "scale_4" ? "4.0" : profile.gpaScale === "scale_10" ? "10" : "100";
    steps.push({
      stepNumber: n++,
      instruction: "Enter your academic score / GPA.",
      fieldName: "GPA / Academic Score",
      suggestedValue: `${profile.gpa} / ${scale}`,
    });
  }

  // Test scores
  const scores: string[] = [];
  if (profile.ieltsScore) scores.push(`IELTS: ${profile.ieltsScore}`);
  if (profile.toeflScore) scores.push(`TOEFL: ${profile.toeflScore}`);
  if (profile.pteScore) scores.push(`PTE: ${profile.pteScore}`);
  if (profile.greScore) scores.push(`GRE: ${profile.greScore}`);
  if (profile.gmatScore) scores.push(`GMAT: ${profile.gmatScore}`);
  if (scores.length > 0) {
    steps.push({
      stepNumber: n++,
      instruction: "Enter your English / test scores when asked.",
      fieldName: "Test Scores",
      suggestedValue: scores.join("  |  "),
    });
  }

  // Degree info
  if (profile.degreeName && profile.collegeName) {
    steps.push({
      stepNumber: n++,
      instruction: "Enter your degree and institution details.",
      fieldName: "Degree / College",
      suggestedValue: `${profile.degreeName} — ${profile.collegeName}`,
    });
  }

  steps.push({ stepNumber: n++, instruction: "Upload required documents: official transcripts, English test certificate, and passport copy." });
  steps.push({ stepNumber: n++, instruction: "Review your application carefully, then click Submit." });
  steps.push({ stepNumber: n++, instruction: `Once submitted, click "I'm done" here to close this guide.` });

  return steps;
}

// ─── Portal URL Discovery ─────────────────────────────────────────────────────

async function discoverPortalUrl(universityName: string, programName: string, websiteUrl?: string | null): Promise<string | null> {
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  if (!perplexityKey) return null;

  try {
    const query = `${universityName} international students online application portal URL for ${programName}. Return only the direct apply URL.`;
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${perplexityKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "You are helping find the direct online application portal URL for international students. Return ONLY the URL, nothing else. The URL must start with https://.",
          },
          { role: "user", content: query },
        ],
        max_tokens: 200,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const answer: string = data.choices?.[0]?.message?.content ?? "";
      const urlMatch = answer.match(/https?:\/\/[^\s"'<>]+/);
      if (urlMatch) return urlMatch[0].replace(/[.,;)]+$/, "");
    }
  } catch (e) {
    console.warn("Portal URL discovery failed:", e);
  }

  if (websiteUrl) {
    return websiteUrl.replace(/\/$/, "") + "/apply";
  }

  return null;
}

// ─── Audit Logging ────────────────────────────────────────────────────────────

async function logAction(
  applicationId: string,
  sessionId: string,
  action: string,
  opts: {
    status: "success" | "error" | "skipped" | "manual";
    errorMessage?: string;
    pageUrl?: string;
  }
) {
  try {
    await prisma.applicationAutomationLog.create({
      data: {
        applicationId,
        sessionId,
        action,
        status: opts.status,
        errorMessage: opts.errorMessage,
        pageUrl: opts.pageUrl,
      },
    });
  } catch {
    // Non-fatal
  }
}

// ─── Build student profile from DB ───────────────────────────────────────────

async function buildStudentProfile(userId: string): Promise<StudentProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { academicProfile: true, preferences: true },
  });

  if (!user) return {};

  const ap = user.academicProfile;
  const pr = user.preferences;

  return {
    firstName: user.name.split(" ")[0],
    lastName: user.name.split(" ").slice(1).join(" "),
    email: user.email,
    phone: user.phone ?? undefined,
    dob: user.dob ? user.dob.toISOString().split("T")[0] : undefined,
    gender: user.gender ?? undefined,
    nationality: user.nationality ?? undefined,
    countryOfResidence: user.countryOfResidence ?? undefined,
    passportNumber: user.passportNumber ?? undefined,
    city: user.city ?? undefined,
    degreeName: ap?.degreeName,
    collegeName: ap?.collegeName,
    gpa: ap?.gpa,
    gpaScale: ap?.gpaScale,
    graduationYear: ap?.graduationYear,
    backlogs: ap?.backlogs,
    workExperienceMonths: ap?.workExperienceMonths,
    ieltsScore: ap?.ieltsScore ?? undefined,
    toeflScore: ap?.toeflScore ?? undefined,
    pteScore: ap?.pteScore ?? undefined,
    greScore: ap?.greScore ?? undefined,
    gmatScore: ap?.gmatScore ?? undefined,
    targetField: pr?.targetField,
    targetDegreeLevel: pr?.targetDegreeLevel,
    targetIntake: pr?.targetIntake,
    careerGoals: pr?.careerGoals ?? undefined,
  };
}

// ─── Main Route ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    action: ComputerAction;
    applicationId: string;
    sessionId?: string;
    portalUrl?: string;
  };

  const { action, applicationId, sessionId: existingSessionId, portalUrl } = body;

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // ── Load application ────────────────────────────────────────────────
        const application = await prisma.application.findFirst({
          where: { id: applicationId, userId: user.id },
          include: { program: { include: { university: true } } },
        });

        if (!application) {
          send({ error: "Application not found" });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        const universityName = application.program.university.name;
        const programName = application.program.name;
        const universityWebsite = application.program.university.websiteUrl;

        // ── Resolve platform + portal URL ───────────────────────────────────
        const platform = getPlatformForUniversity(universityName);

        let targetPortalUrl: string | null =
          portalUrl ??
          application.program.applicationUrl ??
          application.program.university.applicationPortalUrl ??
          platform?.portalUrl ??
          null;

        // If no URL found, always try Perplexity (even for unknown platforms)
        if (!targetPortalUrl) {
          send({ text: `Finding the application portal for ${universityName}…` });
          targetPortalUrl = await discoverPortalUrl(universityName, programName, universityWebsite);
        }

        // Last resort: use website URL
        if (!targetPortalUrl && universityWebsite) {
          targetPortalUrl = universityWebsite.replace(/\/$/, "") + "/apply";
        }

        if (!targetPortalUrl) {
          send({
            needsStudent: {
              reason: "unknown_portal",
              message: `Couldn't find an online application portal for ${universityName}. Try searching "${universityName} international students online application" and open the portal yourself.`,
              copilotMode: false,
            },
          });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        // ── Get or create browser session ───────────────────────────────────
        let sessionId = existingSessionId ?? "";
        let session = sessionId ? getSession(sessionId) : null;

        if (!session) {
          send({ text: `Opening ${universityName} application portal…` });
          try {
            sessionId = await createSession(user.id, applicationId);
            session = getSession(sessionId);
            send({ sessionId, liveViewUrl: session?.liveViewUrl });
          } catch (err) {
            send({ error: err instanceof Error ? err.message : "Could not open browser session" });
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }
        }

        if (!session) {
          send({ error: "Browser session could not be established. Please try again." });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        const page = session.page;

        // ── Handle pause ────────────────────────────────────────────────────
        if (action === "pause") {
          await logAction(applicationId, sessionId, "paused", { status: "success", pageUrl: page.url() });
          send({ paused: true, message: "Session paused. Click Resume when ready." });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        // ── Load student profile ─────────────────────────────────────────────
        const studentProfile = await buildStudentProfile(user.id);

        // ── Resume: just re-screenshot, no navigation ────────────────────────
        if (action === "resume") {
          const screenshot = await takeScreenshot(sessionId);
          send({ browser: { action: "navigate", url: page.url(), screenshot, status: "done" } });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        // ── Start: navigate → screenshot → generate guidance ─────────────────
        const currentUrl = await getCurrentUrl(page);
        if (!currentUrl || currentUrl === "about:blank" || action === "start") {
          send({ browser: { action: "navigate", url: targetPortalUrl, status: "navigating" } });
          await navigate(page, targetPortalUrl);
          await logAction(applicationId, sessionId, "navigate", { status: "success", pageUrl: targetPortalUrl });

          const dismissResult = await dismissPopups(page);
          if (dismissResult.dismissed) {
            send({ popup_dismissed: { popupType: dismissResult.type ?? "consent_banner" } });
          }
        }

        const screenshot = await takeScreenshot(sessionId);
        send({ browser: { action: "navigate", url: page.url(), screenshot, status: "done" } });

        // Detect current page state to personalize guidance
        const blocker = await detectBlocker(page).catch(() => null);

        // Build step-by-step guide for student
        const steps = buildApplicationGuide(universityName, programName, studentProfile, platform, blocker);

        send({
          needsStudent: {
            reason: "guidance",
            message: `I found the application portal for ${universityName}. Open it in your browser and follow the steps below.`,
            screenshot,
            portalUrl: page.url(),
            copilotMode: true,
            steps,
          },
        });

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("Computer mode error:", err);
        send({ error: err instanceof Error ? err.message : "An error occurred" });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}

// ─── Close session endpoint ──────────────────────────────────────────────────

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await request.json() as { sessionId: string };
  if (sessionId) await closeSession(sessionId);
  return Response.json({ closed: true });
}
