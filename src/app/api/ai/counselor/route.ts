import { anthropic, CHAT_MODEL } from "@/lib/ai/claude";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import {
  RIZ_TOOLS,
  executeTool,
  TOOL_LABELS,
  WRITE_OPERATIONS,
  buildConfirmationPayload,
} from "@/lib/ai/tools";
import {
  getOrCreateThread,
  loadThreadMessages,
  saveMessage,
  updateThreadSummary,
  extractAndStoreMemories,
  getRelevantMemories,
} from "@/lib/ai/memory";
import { buildDomainContext } from "@/lib/ai/domain-knowledge";
import { PLATFORMS } from "@/lib/browser/portal-configs";
import type Anthropic from "@anthropic-ai/sdk";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 200;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_TOOL_LOOPS = 12;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Counselor System Prompt ─────────────────────────────────────────────────

async function buildCounselorPrompt(userId: string, threadSummary?: string | null) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      academicProfile: true,
      preferences: true,
      applications: {
        include: { program: { include: { university: true } } },
        take: 15,
      },
    },
  });

  const profile = dbUser?.academicProfile;
  const prefs = dbUser?.preferences;

  // Build profile snapshot for context
  const profileContext = profile
    ? `
STUDENT PROFILE (already collected):
- Name: ${dbUser.name}
- GPA: ${profile.gpa}/${profile.gpaScale === "scale_4" ? "4.0" : profile.gpaScale === "scale_10" ? "10" : "100"}
- Degree: ${profile.degreeName} from ${profile.collegeName}
- Graduation: ${profile.graduationYear}
- Work Exp: ${profile.workExperienceMonths} months
- Backlogs: ${profile.backlogs}
- IELTS: ${profile.ieltsScore ?? "not taken"} | TOEFL: ${profile.toeflScore ?? "not taken"} | PTE: ${profile.pteScore ?? "not taken"}
- GRE: ${profile.greScore ?? "not taken"} | GMAT: ${profile.gmatScore ?? "not taken"}`
    : "STUDENT PROFILE: Not yet filled.";

  const prefsContext = prefs
    ? `
PREFERENCES (already collected):
- Target Countries: ${prefs.targetCountries.join(", ")}
- Field: ${prefs.targetField}
- Degree Level: ${prefs.targetDegreeLevel}
- Budget: ${prefs.budgetRange.replace(/_/g, " ")}
- Intake: ${prefs.targetIntake}
- Career Goals: ${prefs.careerGoals ?? "not specified"}`
    : "PREFERENCES: Not yet filled.";

  // Detect what's missing
  const missing: string[] = [];
  if (!profile) {
    missing.push("GPA, degree name, college name, graduation year");
    missing.push("English test scores (IELTS/TOEFL/PTE)");
    missing.push("GRE/GMAT scores");
    missing.push("work experience");
  } else {
    if (!profile.ieltsScore && !profile.toeflScore && !profile.pteScore) missing.push("English test score (IELTS/TOEFL/PTE)");
    if (!profile.greScore && !profile.gmatScore) missing.push("GRE/GMAT (or confirm not required)");
  }
  if (!prefs) {
    missing.push("target countries");
    missing.push("field of study");
    missing.push("degree level (Masters/MBA/PhD)");
    missing.push("budget range");
    missing.push("career goals");
  } else {
    if (!prefs.careerGoals) missing.push("career goals");
    if (prefs.targetCountries.length === 0) missing.push("target countries");
  }

  const missingContext = missing.length > 0
    ? `\nFIELDS STILL NEEDED:\n${missing.map((m) => `- ${m}`).join("\n")}`
    : "\nAll essential profile fields are collected.";

  // Existing shortlisted applications — CRITICAL: prevents AI from re-creating workspaces
  const apps = dbUser?.applications ?? [];
  const applicationsContext = apps.length > 0
    ? `\nSHORTLISTED APPLICATIONS (already created — do NOT call shortlist_program or create_workspace for these again):\n${apps.map((a) => `- ${a.program.university.name} — ${a.program.name} [id: ${a.id}] status: ${a.status}`).join("\n")}`
    : "";

  // Cross-session memories
  let memoriesContext = "";
  try {
    const memories = await getRelevantMemories(userId);
    if (memories.length > 0) {
      memoriesContext = `\nREMEMBERED FROM PAST CONVERSATIONS:\n${memories.map((m) => `- [${m.key}]: ${m.content}`).join("\n")}`;
    }
  } catch { /* ignore */ }

  const sessionContext = threadSummary
    ? `\nSESSION SO FAR:\n${threadSummary}`
    : "";

  const domainContext = buildDomainContext(prefs?.targetCountries ?? []);

  return `You are the RIBRIZ Counselor — a structured intake counselor who leads the conversation.

YOUR ROLE IS DIFFERENT FROM RIZ AI:
- You are not a general assistant. You have ONE goal: gather everything needed to apply, then make it happen.
- You lead. You drive the conversation. You ask the questions.
- You are warm, professional, and direct — like a real study abroad counselor.

TODAY: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
${profileContext}${prefsContext}${missingContext}${applicationsContext}${memoriesContext}${sessionContext}

SUPPORTED PORTAL PLATFORMS (for assisted application):
${PLATFORMS.map((p) => `- ${p.name}: ${p.description}${p.accountRequired ? " (account required)" : ""}`).join("\n")}
Note: For other universities, we provide guidance steps but not automated form filling. For German universities, always mention they need a uni-assist account (free, one-time setup at my.uni-assist.de).

${domainContext}

═══════════════════════════════════════════
COUNSELOR WORKFLOW — FOLLOW THIS STRICTLY
═══════════════════════════════════════════

STAGE 1 — INTAKE (if fields are missing):
- Check the FIELDS STILL NEEDED list above
- Ask for missing fields ONE TOPIC AT A TIME — do not dump all questions at once
- Be conversational: "Let's start with your academic background. What did you study and where?"
- Confirm numbers: "Got it — GPA 8.7 out of 10, correct?"
- When you collect a value, call update_profile to save it immediately
- Continue asking until all essential fields are collected

STAGE 2 — ANALYSIS (when all fields are collected):
- Call analyze_profile_strength to assess the student
- Call search_universities to find matches
- Call check_eligibility + run_admission_audit for the top matches
- Classify into Safety / Target / Reach buckets
- Be honest about weaknesses (low GPA, missing scores, etc.)

STAGE 3 — SHORTLIST:
- Present 5-8 universities, labeled Safety/Target/Reach
- Show match score, tuition, deadline for each
- Indicate which ones are supported for assisted application
- Ask: "Would you like me to help you apply to these? I can open each portal, fill the forms, and walk you through submission."

STAGE 4 — TRANSITION TO APPLY:
- If student confirms, call shortlist_program for each university
- Tell the student to click "Start Assisted Application" in the browser panel
- You have finished your job — the computer mode handles the rest

═══════════════════════════════════════════
RULES
═══════════════════════════════════════════
1. Never re-ask what you already know. Check STUDENT PROFILE first.
2. Ask ONE thing at a time. Don't interrogate.
3. Save every piece of data with update_profile immediately — don't wait.
4. When presenting universities, ALWAYS show: name, match score, bucket, tuition, deadline.
5. For the shortlist, prioritize universities from the SUPPORTED list when they're a good fit.
6. Be opinionated. If the student has low GPA, tell them honestly. If they should retake IELTS, say so.
7. Keep responses focused and SHORT. This is a counselor meeting, not an essay.
8. When all info is collected, move forward. Don't circle back to ask things again.`;
}

// ─── Init State (GET) — returns latest thread + pending applications ─────────

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const requestedThreadId = searchParams.get("threadId");

    // Get the most recent thread for this user
    let threadId: string | null = null;
    let threadSummary: string | null = null;
    try {
      if (requestedThreadId) {
        const thread = await prisma.conversationThread.findFirst({
          where: { id: requestedThreadId, userId: user.id },
          select: { id: true, summary: true, messageCount: true },
        });
        if (thread && thread.messageCount > 0) {
          threadId = thread.id;
          threadSummary = thread.summary;
        }
      }
      if (!threadId) {
        const latestThread = await prisma.conversationThread.findFirst({
          where: { userId: user.id, messageCount: { gt: 0 } },
          orderBy: { updatedAt: "desc" },
          select: { id: true, summary: true, messageCount: true },
        });
        if (latestThread) {
          threadId = latestThread.id;
          threadSummary = latestThread.summary;
        }
      }
    } catch { /* ignore */ }

    // Load recent messages for this thread
    let messages: Array<{ role: string; content: string; id?: string }> = [];
    if (threadId) {
      try {
        const dbMessages = await prisma.chatMessage.findMany({
          where: { threadId },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: { id: true, role: true, content: true },
        });
        messages = dbMessages.reverse();
      } catch { /* ignore */ }
    }

    // Get user's pending applications
    let applications: Array<{ id: string; university: string; program: string; status: string }> = [];
    try {
      const apps = await prisma.application.findMany({
        where: { userId: user.id },
        include: { program: { include: { university: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      applications = apps.map((a) => ({
        id: a.id,
        university: a.program.university.name,
        program: a.program.name,
        status: a.status,
      }));
    } catch { /* ignore */ }

    return Response.json({ threadId, threadSummary, messages, applications });
  } catch (error) {
    console.error("Counselor init error:", error);
    return Response.json({ error: "Failed to load state" }, { status: 500 });
  }
}

// ─── Main Route ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limiting
    const now = Date.now();
    const entry = rateLimitMap.get(user.id);
    if (entry && entry.resetAt > now) {
      if (entry.count >= RATE_LIMIT) {
        return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
      }
      entry.count++;
    } else {
      rateLimitMap.set(user.id, { count: 1, resetAt: now + WINDOW_MS });
    }

    const body = await request.json();
    const {
      messages,
      threadId: requestThreadId,
      confirmAction,
      rejectAction,
    } = body as {
      messages: ChatMessage[];
      threadId?: string;
      confirmAction?: {
        toolName: string;
        toolInput: Record<string, unknown>;
        toolUseId: string;
        editedChanges?: { field: string; newValue: string }[];
      };
      rejectAction?: { toolName: string; toolUseId: string };
    };

    if (!messages?.length) {
      return Response.json({ error: "messages array is required" }, { status: 400 });
    }

    // Handle confirmations
    if (confirmAction) {
      let toolInput = confirmAction.toolInput;
      if (confirmAction.editedChanges && confirmAction.toolName === "update_profile") {
        const stringFields = new Set(["targetIntake", "degreeName", "collegeName", "targetField", "careerGoals", "name", "phone", "city"]);
        for (const change of confirmAction.editedChanges) {
          const num = Number(change.newValue);
          toolInput[change.field] = stringFields.has(change.field) || isNaN(num) ? change.newValue : num;
        }
      }
      try {
        const result = await executeTool(confirmAction.toolName, toolInput, user.id);
        const parsed = JSON.parse(result);

        // Save the confirmation to the thread so AI has full context on next message
        if (requestThreadId) {
          try {
            const thread = await prisma.conversationThread.findFirst({
              where: { id: requestThreadId, userId: user.id },
            });
            if (thread) {
              const label = TOOL_LABELS[confirmAction.toolName] ?? confirmAction.toolName;
              const summary = parsed.message ?? `${label} completed.`;
              const appId = parsed.applicationId ? ` [applicationId: ${parsed.applicationId}]` : "";
              await prisma.chatMessage.create({
                data: {
                  threadId: requestThreadId,
                  role: "assistant",
                  content: `[Action confirmed: ${label}] ${summary}${appId}`,
                },
              });
              await prisma.conversationThread.update({
                where: { id: requestThreadId },
                data: { messageCount: { increment: 1 }, updatedAt: new Date() },
              });
            }
          } catch { /* non-fatal */ }
        }

        return Response.json({ type: "confirmation_result", success: true, result: parsed, toolName: confirmAction.toolName });
      } catch (err) {
        return Response.json({ type: "confirmation_result", success: false, error: err instanceof Error ? err.message : "Action failed", toolName: confirmAction.toolName });
      }
    }

    if (rejectAction) {
      // Record rejection in thread so AI knows what was declined
      if (requestThreadId) {
        try {
          const thread = await prisma.conversationThread.findFirst({
            where: { id: requestThreadId, userId: user.id },
          });
          if (thread) {
            const label = TOOL_LABELS[rejectAction.toolName] ?? rejectAction.toolName;
            await prisma.chatMessage.create({
              data: {
                threadId: requestThreadId,
                role: "assistant",
                content: `[Action rejected by user: ${label}]`,
              },
            });
            await prisma.conversationThread.update({
              where: { id: requestThreadId },
              data: { messageCount: { increment: 1 }, updatedAt: new Date() },
            });
          }
        } catch { /* non-fatal */ }
      }
      return Response.json({ type: "confirmation_result", success: true, rejected: true, toolName: rejectAction.toolName });
    }

    // Thread management
    let thread: { id: string; summary: string | null; state: Record<string, unknown> | null; messageCount: number } | null = null;
    try {
      thread = await getOrCreateThread(user.id, requestThreadId);
      const userContent = messages[messages.length - 1]?.content ?? "";
      await saveMessage(thread.id, "user", userContent);
    } catch (e) {
      console.warn("Thread management unavailable:", e instanceof Error ? e.message : e);
    }

    const systemPrompt = await buildCounselorPrompt(user.id, thread?.summary);

    let apiMessages: Anthropic.Messages.MessageParam[];
    if (thread && thread.messageCount > 1) {
      try {
        const threadMessages = await loadThreadMessages(thread.id, 8);
        apiMessages = threadMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          // Trim long assistant messages — keeps context without burning tokens
          content: m.role === "assistant" && m.content.length > 500
            ? m.content.slice(0, 500) + "…"
            : m.content,
        }));
      } catch {
        apiMessages = messages.map((m) => ({ role: m.role, content: m.content }));
      }
    } else {
      apiMessages = messages.map((m) => ({ role: m.role, content: m.content }));
    }

    // Claude API requires messages to start with user role — strip any leading assistant messages
    while (apiMessages.length > 0 && apiMessages[0].role !== "user") {
      apiMessages = apiMessages.slice(1);
    }
    // Also remove empty-content messages which Claude rejects
    apiMessages = apiMessages.filter((m) => typeof m.content === "string" ? m.content.trim().length > 0 : true);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const send = (data: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          let continueLoop = true;
          let loopCount = 0;
          let totalToolCalls = 0;
          const toolCallLog: Array<{ tool: string; durationMs: number; success: boolean }> = [];
          let allConfirmations: Array<Record<string, unknown>> = [];
          let fullAssistantText = "";

          if (thread) send({ threadId: thread.id });

          while (continueLoop && loopCount < MAX_TOOL_LOOPS) {
            loopCount++;

            if (loopCount > 1) {
              send({ thinking: { step: loopCount, message: "Analyzing and continuing..." } });
            }

            const stream = await anthropic.messages.stream({
              model: CHAT_MODEL,
              max_tokens: 1500,
              temperature: 0.3,
              system: systemPrompt,
              tools: RIZ_TOOLS,
              messages: apiMessages,
            });

            for await (const event of stream) {
              if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                send({ text: event.delta.text });
                fullAssistantText += event.delta.text;
              }
            }

            const finalMessage = await stream.finalMessage();

            if (finalMessage.stop_reason === "tool_use") {
              apiMessages.push({ role: "assistant", content: finalMessage.content });

              const toolBlocks = finalMessage.content.filter(
                (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
              );
              const readOps = toolBlocks.filter((b) => !WRITE_OPERATIONS.has(b.name));
              const writeOps = toolBlocks.filter((b) => WRITE_OPERATIONS.has(b.name));
              const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

              if (readOps.length > 0) {
                for (const block of readOps) {
                  send({ tool: { name: block.name, label: TOOL_LABELS[block.name] ?? block.name, status: "running" } });
                }

                const readResults = await Promise.allSettled(
                  readOps.map(async (block) => {
                    const start = Date.now();
                    try {
                      const result = await executeTool(block.name, block.input as Record<string, unknown>, user.id);
                      toolCallLog.push({ tool: block.name, durationMs: Date.now() - start, success: true });
                      return { id: block.id, name: block.name, result };
                    } catch (err) {
                      toolCallLog.push({ tool: block.name, durationMs: Date.now() - start, success: false });
                      return { id: block.id, name: block.name, result: JSON.stringify({ error: `${block.name} failed: ${err instanceof Error ? err.message : "Unknown"}` }) };
                    }
                  })
                );

                for (const settled of readResults) {
                  if (settled.status === "fulfilled") {
                    const { id, name, result } = settled.value;
                    send({ tool: { name, label: TOOL_LABELS[name] ?? name, status: "done" } });
                    send({ toolResult: { name, result } });
                    toolResults.push({ type: "tool_result", tool_use_id: id, content: result });
                    totalToolCalls++;
                  }
                }
              }

              for (const block of writeOps) {
                const input = block.input as Record<string, unknown>;
                const payload = await buildConfirmationPayload(block.name, input, block.id, user.id);
                allConfirmations.push(payload);
                send({ confirmation: payload });
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: JSON.stringify({ status: "pending_confirmation", message: `"${TOOL_LABELS[block.name] ?? block.name}" awaiting confirmation.` }),
                });
              }

              apiMessages.push({ role: "user", content: toolResults });
              if (writeOps.length > 0) continueLoop = false;
            } else {
              continueLoop = false;
            }
          }

          if (totalToolCalls > 0 || allConfirmations.length > 0) {
            send({ agentMeta: { toolCalls: totalToolCalls, loopIterations: loopCount, confirmationsPending: allConfirmations.length, toolLog: toolCallLog } });
          }

          if (fullAssistantText && thread) {
            saveMessage(thread.id, "assistant", fullAssistantText, { toolCalls: toolCallLog }).catch(console.warn);
            updateThreadSummary(thread.id, user.id).catch(console.warn);
            const lastUserMsg = messages[messages.length - 1]?.content ?? "";
            extractAndStoreMemories(user.id, lastUserMsg, fullAssistantText).catch(console.warn);
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("Counselor stream error:", err);
          const errMsg = err instanceof Error ? err.message : String(err);
          send({ text: `\n\nSomething went wrong: ${errMsg}. Please try again.` });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (error) {
    console.error("Counselor route error:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 500 });
  }
}
