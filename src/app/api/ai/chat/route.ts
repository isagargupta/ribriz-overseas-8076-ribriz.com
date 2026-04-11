import { anthropic, CHAT_MODEL } from "@/lib/ai/claude";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { chatRatelimit } from "@/lib/ratelimit";
import { deductCredits } from "@/lib/subscription/credits";
import type { Prisma } from "@/generated/prisma/client";
import {
  RIZ_TOOLS,
  executeTool,
  TOOL_LABELS,
  WRITE_OPERATIONS,
  buildConfirmationPayload,
} from "@/lib/ai/tools";
import { buildDomainContext } from "@/lib/ai/domain-knowledge";
import {
  getOrCreateThread,
  loadThreadMessages,
  saveMessage,
  updateThreadSummary,
  logAgentAction,
  extractAndStoreMemories,
  getRelevantMemories,
} from "@/lib/ai/memory";
import type Anthropic from "@anthropic-ai/sdk";


// Cache the heavy DB query in buildSystemPrompt for 2 minutes per user.
// This avoids hitting Postgres on every single chat message.
type CachedDbUser = Prisma.UserGetPayload<{
  include: {
    academicProfile: true;
    preferences: true;
    applications: { include: { program: { include: { university: true } } }; take: 10 };
  };
}>;
const userProfileCache = new Map<string, { data: CachedDbUser | null; expiresAt: number }>();
const PROFILE_CACHE_TTL_MS = 2 * 60 * 1000;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Helper: Build the system prompt ────────────────────

async function buildSystemPrompt(userId: string, topic?: string, threadSummary?: string | null, threadState?: Record<string, unknown> | null) {
  const now = Date.now();
  const cached = userProfileCache.get(userId);
  let dbUser: CachedDbUser | null;
  if (cached && cached.expiresAt > now) {
    dbUser = cached.data;
  } else {
    dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        academicProfile: true,
        preferences: true,
        applications: {
          include: { program: { include: { university: true } } },
          take: 10,
        },
      },
    });
    userProfileCache.set(userId, { data: dbUser, expiresAt: now + PROFILE_CACHE_TTL_MS });
  }

  const profile = dbUser?.academicProfile;
  const prefs = dbUser?.preferences;

  const profileContext = profile
    ? `
STUDENT PROFILE:
- Name: ${dbUser?.name}
- Degree: ${profile.degreeName} from ${profile.collegeName}
- GPA: ${profile.gpa}/${profile.gpaScale === "scale_4" ? "4.0" : profile.gpaScale === "scale_10" ? "10" : "100"}
- Graduation Year: ${profile.graduationYear}
- Work Experience: ${profile.workExperienceMonths} months
- IELTS: ${profile.ieltsScore ?? "Not taken"}, TOEFL: ${profile.toeflScore ?? "Not taken"}, PTE: ${profile.pteScore ?? "Not taken"}
- GRE: ${profile.greScore ?? "Not taken"}, GMAT: ${profile.gmatScore ?? "Not taken"}
- Backlogs: ${profile.backlogs}`
    : `\nSTUDENT PROFILE: Not yet completed onboarding.`;

  const prefsContext = prefs
    ? `
PREFERENCES:
- Target Countries: ${prefs.targetCountries.join(", ")}
- Target Field: ${prefs.targetField}
- Degree Level: ${prefs.targetDegreeLevel}
- Budget: ${prefs.budgetRange.replace(/_/g, " ")}
- Target Intake: ${prefs.targetIntake}
- Career Goals: ${prefs.careerGoals ?? "Not specified"}`
    : "";

  const applicationsContext = dbUser?.applications?.length
    ? `
CURRENT APPLICATIONS (${dbUser.applications.length}):
${dbUser.applications.map((a) => `- ${a.program.name} at ${a.program.university.name} (${a.program.university.country}) — Status: ${a.status}${a.matchScore ? `, Match: ${a.matchScore}%` : ""}`).join("\n")}`
    : "";

  // Detect missing profile fields
  const missingFields: string[] = [];
  if (!profile) {
    missingFields.push("entire academic profile");
  } else {
    if (!profile.ieltsScore && !profile.toeflScore && !profile.pteScore) missingFields.push("English test score (IELTS/TOEFL/PTE)");
    if (!profile.greScore && !profile.gmatScore) missingFields.push("GRE/GMAT score");
    if (profile.workExperienceMonths === 0) missingFields.push("work experience");
    if (profile.degreeName === "Not specified") missingFields.push("degree name");
    if (profile.collegeName === "Not specified") missingFields.push("college name");
  }
  if (!prefs) {
    missingFields.push("study preferences (target country, field, budget)");
  } else {
    if (!prefs.careerGoals) missingFields.push("career goals");
    if (prefs.targetCountries.length === 0) missingFields.push("target countries");
  }

  const missingFieldsContext = missingFields.length > 0
    ? `
MISSING PROFILE FIELDS — proactively ask about these:
${missingFields.map((f) => `- ${f}`).join("\n")}
Weave questions naturally. Don't interrogate.`
    : "";

  // Cross-session persistent memory (facts learned across all conversations)
  let persistentMemoryContext = "";
  try {
    const memories = await getRelevantMemories(userId);
    if (memories.length > 0) {
      persistentMemoryContext = `
THINGS I REMEMBER ABOUT THIS STUDENT (from past conversations):
${memories.map((m) => `- [${m.key}]: ${m.content}`).join("\n")}
Use these to personalize advice. Don't re-ask things you already know.`;
    }
  } catch {
    // Memory tables may not exist yet
  }

  // Conversation memory context (this session)
  const memoryContext = threadSummary
    ? `
CONVERSATION MEMORY (from this session):
${threadSummary}
${threadState ? `\nCONVERSATION STATE:\n${JSON.stringify(threadState, null, 2)}` : ""}
Use this memory to maintain continuity. Don't re-ask things already decided.`
    : "";

  const topicContext = topic ? `\nCurrent topic focus: ${topic}` : "";

  // Build domain knowledge context based on student's target countries
  const domainContext = buildDomainContext(
    prefs?.targetCountries ?? []
  );

  return `You are Riz AI, an expert agentic study-abroad counselor with 15 years of experience placing Indian students at top universities worldwide. You work for Ribriz Academic Consultancy.

You are NOT a chatbot. You are a strategic advisor who thinks 3 steps ahead, spots risks the student hasn't considered, and gives opinionated recommendations backed by data.

TODAY: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
${profileContext}${prefsContext}${applicationsContext}${missingFieldsContext}${persistentMemoryContext}${memoryContext}${topicContext}
${domainContext}

═══════════════════════════════════════════
AGENTIC BEHAVIOR
═══════════════════════════════════════════

PLANNING: Before answering complex questions, plan your tool sequence. Example:
  User: "Which universities should I apply to?"
  Plan: search_universities → check_eligibility for top 5 → compare_costs → bucket into safety/target/reach → synthesize recommendation with strategy

CHAINING: Use results from one tool as input to the next. If search_universities returns 8 results, IMMEDIATELY check_eligibility for them. Don't stop after one tool.

PARALLEL: Call independent tools simultaneously. search_universities AND get_deadlines AND find_scholarships can run together.

WRITE OPERATIONS (require user confirmation):
  update_profile, shortlist_program, update_application, remove_application, generate_sop, generate_email_draft, create_workspace, create_document

WORKSPACE SYSTEM:
  When a student decides to apply to a university, use create_workspace to set up their application dashboard.
  Each workspace has documents (SOP, LOR, CV, essays) — all tied to that specific university + program.
  Use run_admission_audit for detailed parameter-by-parameter analysis (GPA, IELTS, backlogs, budget vs requirements).
  Use get_workspace_documents to check document progress, and create_document to start a new doc.
  Always provide clickable links when referencing workspaces or documents.

  FLOW: search_universities → check_eligibility / run_admission_audit → shortlist_program → create_workspace → create_document → student writes in editor

═══════════════════════════════════════════
HOW TO THINK LIKE AN EXPERT COUNSELOR
═══════════════════════════════════════════

1. BUCKET RECOMMENDATIONS: Always categorize universities as Safety (80%+ match), Target (60-80%), or Reach (40-60%). Never give a flat list.

2. SPOT RISKS PROACTIVELY: If student is missing IELTS and targeting Canada, warn them. If they have 5 backlogs and target Germany, be honest. If budget is ₹5L/year but targeting US, suggest Germany/Finland instead.

3. PROFILE-AWARE ADVICE: Use the PROFILE ARCHETYPE knowledge above. If the student is an entrepreneur, don't penalize lack of traditional work exp. If they have publications, recommend research-focused programs even with lower GPA.

4. COUNTRY-SPECIFIC WISDOM: Use the detailed country intelligence above. Know that Canada's PGWP rules changed, that Germany is tuition-free, that UK masters are 1 year, that US H1B is a lottery.

5. STRATEGIC SOP ADVICE: Every SOP must mention specific faculty, labs, courses. Address weaknesses directly. No generic openings.

6. WARN ABOUT MISTAKES: If student is applying to 15 universities, tell them quality degrades after 8. If they're only applying to reach schools, insist on adding safety options.

7. REALISTIC FINANCIAL GUIDANCE: Include living costs, not just tuition. Convert to INR. Factor in work rights (can they work during study?). Account for ROI (break-even years).

8. OPINIONATED: Don't hedge. If a university is a bad fit, say so. If they should retake IELTS, tell them. Students want honest counsel, not diplomatic vagueness.

RULES:
1. ALWAYS use tools for factual data. Never guess.
2. If a tool fails, try web_search as fallback.
3. Chain tools: search → eligibility → costs → safety/target/reach bucketing → recommendation.
4. Keep responses SHORT — tables for comparisons, bullets for lists.
5. After showing results, offer ONE clear next step.
6. For costs, always show INR conversion.
7. Don't repeat profile data unless asked.
8. Max 2 clarifying questions at once.
9. If the student asks a broad strategic question, use MULTIPLE tools to give a complete answer.
10. Use your DOMAIN EXPERTISE knowledge actively — don't wait for the student to ask about visa policies or PR pathways. Weave insights naturally.
11. When recommending universities, ALWAYS include the audit link (/universities/{programId}) so students can see the full breakdown.
12. When a student wants to start applying, proactively offer to create_workspace and then create_document for their SOP.
13. Use run_admission_audit when students ask "what are my chances" or "am I eligible" — it gives the most detailed, honest analysis.
14. When discussing a specific university the student is applying to, use get_workspace_documents to check their document progress and nudge them.

RESPONSE FORMAT:
- Use markdown links for workspace/audit pages: [View Audit](/universities/xxx) or [Open Workspace](/applications/xxx)
- Use tables for university comparisons
- Use bold for key numbers (match score, probability)
- Be direct and opinionated — students pay for honest counsel, not diplomatic hedging`;
}

// ─── Main Route ─────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting (Redis-backed; skipped if Redis is not configured)
    if (chatRatelimit) {
      const { success } = await chatRatelimit.limit(user.id);
      if (!success) {
        return Response.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
      }
    }

    // Deduct 1 credit per user message
    const creditResult = await deductCredits(user.id, "rizAiMessage", "riz_ai_message");
    if (!creditResult.ok) {
      return Response.json({ error: creditResult.error, upgradeRequired: true }, { status: 402 });
    }

    const body = await request.json();
    const {
      messages,
      topic,
      threadId: requestThreadId,
      confirmAction,
      rejectAction,
    } = body as {
      messages: ChatMessage[];
      topic?: string;
      threadId?: string;
      confirmAction?: {
        toolName: string;
        toolInput: Record<string, unknown>;
        toolUseId: string;
        editedChanges?: { field: string; newValue: string }[];
      };
      rejectAction?: {
        toolName: string;
        toolUseId: string;
      };
    };

    if (!messages?.length) {
      return Response.json({ error: "messages array is required" }, { status: 400 });
    }

    // ─── Handle confirmations ───────────────────────────
    if (confirmAction) {
      let toolInput = confirmAction.toolInput;

      if (confirmAction.editedChanges && confirmAction.toolName === "update_profile") {
        const stringFields = new Set(["targetIntake", "degreeName", "collegeName", "targetField", "careerGoals", "name", "phone", "city"]);
        for (const change of confirmAction.editedChanges) {
          const num = Number(change.newValue);
          toolInput[change.field] = stringFields.has(change.field) || isNaN(num)
            ? change.newValue
            : num;
        }
      }

      try {
        const result = await executeTool(confirmAction.toolName, toolInput, user.id);
        return Response.json({
          type: "confirmation_result",
          success: true,
          result: JSON.parse(result),
          toolName: confirmAction.toolName,
        });
      } catch (err) {
        return Response.json({
          type: "confirmation_result",
          success: false,
          error: err instanceof Error ? err.message : "Action failed",
          toolName: confirmAction.toolName,
        });
      }
    }

    if (rejectAction) {
      return Response.json({
        type: "confirmation_result",
        success: true,
        rejected: true,
        toolName: rejectAction.toolName,
      });
    }

    // ─── Thread Management (graceful �� works even if tables don't exist yet) ──
    let thread: { id: string; summary: string | null; state: Record<string, unknown> | null; messageCount: number } | null = null;
    try {
      thread = await getOrCreateThread(user.id, requestThreadId);
      const userContent = messages[messages.length - 1]?.content ?? "";
      await saveMessage(thread.id, "user", userContent);
    } catch (e) {
      // Tables may not exist yet — continue without memory
      console.warn("Thread management unavailable (run prisma db push):", e instanceof Error ? e.message : e);
    }

    // Build system prompt with memory
    const systemPrompt = await buildSystemPrompt(user.id, topic, thread?.summary, thread?.state);

    // Load conversation history from thread (or use provided messages)
    let apiMessages: Anthropic.Messages.MessageParam[];
    if (thread && thread.messageCount > 1) {
      try {
        const threadMessages = await loadThreadMessages(thread.id, 30);
        apiMessages = threadMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
      } catch {
        apiMessages = messages.map((m) => ({ role: m.role, content: m.content }));
      }
    } else {
      apiMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
    }

    // ─── Agentic Streaming Loop ─────────────────────────

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const send = (data: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          let continueLoop = true;
          let loopCount = 0;
          const MAX_LOOPS = 15; // Increased for deeper chains
          let totalToolCalls = 0;
          const toolCallLog: Array<{ tool: string; durationMs: number; success: boolean }> = [];
          let allConfirmations: Array<Record<string, unknown>> = [];
          let fullAssistantText = "";

          // Send thread ID so frontend can persist it
          if (thread) send({ threadId: thread.id });

          while (continueLoop && loopCount < MAX_LOOPS) {
            loopCount++;

            // Stream agent thinking indicator
            if (loopCount > 1) {
              send({ thinking: { step: loopCount, message: "Analyzing results and continuing..." } });
            }

            const stream = await anthropic.messages.stream({
              model: CHAT_MODEL,
              max_tokens: 4096,
              temperature: 0.4, // Slightly lower for more deterministic tool selection
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

              // Separate write ops from read ops
              const toolBlocks = finalMessage.content.filter(
                (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
              );

              const readOps = toolBlocks.filter((b) => !WRITE_OPERATIONS.has(b.name));
              const writeOps = toolBlocks.filter((b) => WRITE_OPERATIONS.has(b.name));

              const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

              // Execute read operations in parallel
              if (readOps.length > 0) {
                // Send all read tool starts
                for (const block of readOps) {
                  const label = TOOL_LABELS[block.name] ?? block.name;
                  send({ tool: { name: block.name, label, status: "running" } });
                }

                // Execute in parallel
                const readResults = await Promise.allSettled(
                  readOps.map(async (block) => {
                    const start = Date.now();
                    const input = block.input as Record<string, unknown>;
                    try {
                      const result = await executeTool(block.name, input, user.id);
                      const duration = Date.now() - start;
                      toolCallLog.push({ tool: block.name, durationMs: duration, success: true });

                      // Log the agent action
                      logAgentAction(thread?.id ?? "", user.id, "tool_call", {
                        toolName: block.name,
                        input,
                        output: JSON.parse(result),
                        durationMs: duration,
                        success: true,
                      });

                      return { id: block.id, name: block.name, result };
                    } catch (err) {
                      const duration = Date.now() - start;
                      toolCallLog.push({ tool: block.name, durationMs: duration, success: false });

                      logAgentAction(thread?.id ?? "", user.id, "tool_call", {
                        toolName: block.name,
                        input,
                        reasoning: `Failed: ${err instanceof Error ? err.message : "Unknown error"}`,
                        durationMs: duration,
                        success: false,
                      });

                      return {
                        id: block.id,
                        name: block.name,
                        result: JSON.stringify({ error: `Tool "${block.name}" failed: ${err instanceof Error ? err.message : "Unknown"}` }),
                      };
                    }
                  })
                );

                for (const settled of readResults) {
                  if (settled.status === "fulfilled") {
                    const { id, name, result } = settled.value;
                    send({ tool: { name, label: TOOL_LABELS[name] ?? name, status: "done" } });
                    // Send structured result for rich rendering
                    send({ toolResult: { name, result } });
                    toolResults.push({ type: "tool_result", tool_use_id: id, content: result });
                    totalToolCalls++;
                  }
                }
              }

              // Handle write operations — send confirmations
              for (const block of writeOps) {
                const input = block.input as Record<string, unknown>;
                const confirmationPayload = await buildConfirmationPayload(
                  block.name,
                  input,
                  block.id,
                  user.id
                );
                allConfirmations.push(confirmationPayload);
                send({ confirmation: confirmationPayload });

                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: JSON.stringify({
                    status: "pending_confirmation",
                    message: `Action "${TOOL_LABELS[block.name] ?? block.name}" requires user confirmation. Wait for their response.`,
                  }),
                });

                logAgentAction(thread?.id ?? "", user.id, "confirmation", {
                  toolName: block.name,
                  input,
                  reasoning: "Write operation — awaiting user consent",
                });
              }

              apiMessages.push({ role: "user", content: toolResults });

              // Stop if there are pending confirmations
              if (writeOps.length > 0) {
                continueLoop = false;
              }
            } else {
              continueLoop = false;
            }
          }

          // Send agent metadata at the end
          if (totalToolCalls > 0 || allConfirmations.length > 0) {
            send({
              agentMeta: {
                toolCalls: totalToolCalls,
                loopIterations: loopCount,
                confirmationsPending: allConfirmations.length,
                toolLog: toolCallLog,
              },
            });
          }

          // Save assistant response to thread (non-blocking)
          if (fullAssistantText && thread) {
            saveMessage(thread.id, "assistant", fullAssistantText, {
              toolCalls: toolCallLog,
              confirmations: allConfirmations.length > 0 ? allConfirmations : undefined,
            }).catch((err) => console.warn("Message save failed:", err));

            // Update thread summary in background (non-blocking)
            updateThreadSummary(thread.id, user.id).catch((err) =>
              console.warn("Summary update failed:", err)
            );

            // Extract cross-session memories in background (non-blocking)
            const lastUserMsg = messages[messages.length - 1]?.content ?? "";
            extractAndStoreMemories(user.id, lastUserMsg, fullAssistantText).catch((err) =>
              console.warn("Memory extraction failed:", err)
            );
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("Riz AI stream error:", err);
          send({ text: "\n\nSorry, I encountered an error. Please try again." });

          logAgentAction(thread?.id ?? "", user.id, "error", {
            reasoning: err instanceof Error ? err.message : "Unknown stream error",
            success: false,
          });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Riz AI chat error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    );
  }
}
