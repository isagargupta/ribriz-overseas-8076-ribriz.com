import { prisma } from "@/lib/db";
import { anthropic, CHAT_MODEL } from "./claude";

// ─── Thread Management ──────────────────────────────────

export async function getOrCreateThread(
  userId: string,
  threadId?: string | null
): Promise<{ id: string; summary: string | null; state: Record<string, unknown> | null; messageCount: number }> {
  if (threadId) {
    const thread = await prisma.conversationThread.findFirst({
      where: { id: threadId, userId },
    });
    if (thread) {
      return {
        id: thread.id,
        summary: thread.summary,
        state: thread.state as Record<string, unknown> | null,
        messageCount: thread.messageCount,
      };
    }
  }

  // Create new thread
  const thread = await prisma.conversationThread.create({
    data: { userId },
  });

  return {
    id: thread.id,
    summary: null,
    state: null,
    messageCount: 0,
  };
}

export async function loadThreadMessages(
  threadId: string,
  limit = 20
): Promise<Array<{ role: string; content: string }>> {
  const messages = await prisma.chatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return messages.reverse().map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

export async function saveMessage(
  threadId: string,
  role: string,
  content: string,
  metadata?: {
    toolCalls?: unknown[];
    toolResults?: unknown[];
    confirmations?: unknown[];
    thinkingSteps?: string[];
  }
): Promise<void> {
  await prisma.chatMessage.create({
    data: {
      threadId,
      role,
      content,
      toolCalls: metadata?.toolCalls ? JSON.parse(JSON.stringify(metadata.toolCalls)) : undefined,
      toolResults: metadata?.toolResults ? JSON.parse(JSON.stringify(metadata.toolResults)) : undefined,
      metadata: metadata?.confirmations || metadata?.thinkingSteps
        ? JSON.parse(JSON.stringify({ confirmations: metadata.confirmations, thinkingSteps: metadata.thinkingSteps }))
        : undefined,
    },
  });

  await prisma.conversationThread.update({
    where: { id: threadId },
    data: { messageCount: { increment: 1 }, updatedAt: new Date() },
  });
}

// ─── Conversation Summarization ─────────────────────────

export async function updateThreadSummary(
  threadId: string,
  userId: string
): Promise<string> {
  const thread = await prisma.conversationThread.findUnique({
    where: { id: threadId },
  });

  // Only summarize every 6 messages to avoid excessive API calls
  if (!thread || thread.messageCount % 6 !== 0 || thread.messageCount === 0) {
    return thread?.summary ?? "";
  }

  // Get recent messages since last summary
  const recentMessages = await prisma.chatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const conversationText = recentMessages
    .reverse()
    .map((m) => `${m.role}: ${m.content.slice(0, 500)}`)
    .join("\n");

  const previousSummary = thread.summary || "No previous context.";

  try {
    const response = await anthropic.messages.create({
      model: CHAT_MODEL,
      max_tokens: 500,
      temperature: 0,
      system: `You are a conversation summarizer for an academic counseling AI. Produce a concise summary that captures:
1. Key decisions made (countries, universities, programs chosen)
2. Student's stated goals and constraints
3. Open questions or next steps
4. Any profile data mentioned but not yet saved

Return ONLY the summary, no preamble. Max 300 words.`,
      messages: [
        {
          role: "user",
          content: `PREVIOUS SUMMARY:\n${previousSummary}\n\nNEW MESSAGES:\n${conversationText}\n\nProduce an updated rolling summary.`,
        },
      ],
    });

    const summary =
      response.content[0].type === "text" ? response.content[0].text : previousSummary;

    // Also extract structured state
    const stateResponse = await anthropic.messages.create({
      model: CHAT_MODEL,
      max_tokens: 300,
      temperature: 0,
      system: `Extract conversation state as JSON. Return ONLY valid JSON:
{
  "current_focus": "what they're working on now",
  "decisions_made": ["list of decided things"],
  "open_questions": ["unresolved items"],
  "next_steps": ["what should happen next"],
  "mentioned_universities": ["names"],
  "mentioned_countries": ["names"]
}`,
      messages: [
        {
          role: "user",
          content: `Summary: ${summary}\n\nRecent:\n${conversationText}`,
        },
      ],
    });

    let state: Record<string, unknown> | null = null;
    try {
      const stateText =
        stateResponse.content[0].type === "text" ? stateResponse.content[0].text : "{}";
      const jsonMatch = stateText.match(/\{[\s\S]*\}/);
      if (jsonMatch) state = JSON.parse(jsonMatch[0]);
    } catch {
      // Keep existing state
      state = thread.state as Record<string, unknown> | null;
    }

    // Generate a title from the conversation
    let title = thread.title;
    if (title === "New Conversation" && thread.messageCount >= 2) {
      const titleResponse = await anthropic.messages.create({
        model: CHAT_MODEL,
        max_tokens: 20,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: `Generate a 3-5 word title for this conversation:\n${summary}\n\nReturn ONLY the title, nothing else.`,
          },
        ],
      });
      title =
        titleResponse.content[0].type === "text"
          ? titleResponse.content[0].text.trim().replace(/^["']|["']$/g, "")
          : title;
    }

    await prisma.conversationThread.update({
      where: { id: threadId },
      data: {
        summary,
        state: state ? JSON.parse(JSON.stringify(state)) : undefined,
        title,
      },
    });

    return summary;
  } catch (err) {
    console.error("Summary generation failed:", err);
    return thread.summary ?? "";
  }
}

// ─── Agent Logging ──────────────────────────────────────

export async function logAgentAction(
  threadId: string,
  userId: string,
  action: string,
  data: {
    toolName?: string;
    input?: unknown;
    output?: unknown;
    reasoning?: string;
    durationMs?: number;
    success?: boolean;
  }
): Promise<void> {
  if (!threadId) return; // Skip if no thread context
  try {
    await prisma.agentLog.create({
      data: {
        threadId,
        userId,
        action,
        toolName: data.toolName,
        input: data.input ? JSON.parse(JSON.stringify(data.input)) : undefined,
        output: data.output ? JSON.parse(JSON.stringify(data.output)) : undefined,
        reasoning: data.reasoning,
        durationMs: data.durationMs,
        success: data.success ?? true,
      },
    });
  } catch {
    // Silently fail — logging should never break the main flow
  }
}

// ─── Thread Listing ─────────────────────────────────────

export async function getUserThreads(
  userId: string,
  limit = 20
): Promise<
  Array<{
    id: string;
    title: string;
    summary: string | null;
    messageCount: number;
    updatedAt: Date;
  }>
> {
  const threads = await prisma.conversationThread.findMany({
    where: { userId, messageCount: { gt: 0 } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      summary: true,
      messageCount: true,
      updatedAt: true,
    },
  });

  return threads;
}

// ─── Cross-Session Memory (Persistent Facts) ───────────
// Extracts important facts from conversations and stores them
// in MemoryEntry for recall across future sessions.

const MEMORY_CATEGORIES = [
  "career_goal",
  "experience",       // Internships, jobs, projects
  "preference",       // Likes, dislikes about universities/countries
  "fact",             // Personal facts: city, family situation, budget details
  "skill",            // Programming languages, tools, certifications
  "concern",          // Worries about the process
  "decision",         // Decisions made: "I decided not to apply to UK"
  "deadline_context", // "My visa appointment is on March 15"
] as const;

/**
 * Extract memorable facts from a conversation exchange and persist them.
 * Runs after each assistant response — best-effort, never blocks the main flow.
 */
export async function extractAndStoreMemories(
  userId: string,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  try {
    const response = await anthropic.messages.create({
      model: CHAT_MODEL,
      max_tokens: 500,
      temperature: 0,
      system: `Extract important facts about the student from this conversation exchange. Return a JSON array of objects with "key" (category) and "content" (the fact).

Categories: ${MEMORY_CATEGORIES.join(", ")}

Rules:
- Only extract facts the student explicitly stated or strongly implied.
- Be concise: each fact should be one sentence.
- Don't extract obvious things already in their profile (GPA, test scores, degree — those are in AcademicProfile).
- Focus on things that would help write a better SOP or give better advice later.
- If there's nothing new to remember, return an empty array [].
- Return ONLY the JSON array, nothing else.`,
      messages: [
        {
          role: "user",
          content: `Student said: "${userMessage.slice(0, 1000)}"\n\nAssistant replied: "${assistantMessage.slice(0, 1000)}"`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const memories: Array<{ key: string; content: string }> = JSON.parse(cleaned);

    if (!Array.isArray(memories) || memories.length === 0) return;

    for (const mem of memories) {
      if (!mem.key || !mem.content) continue;
      if (!(MEMORY_CATEGORIES as readonly string[]).includes(mem.key)) continue;

      await prisma.memoryEntry.upsert({
        where: {
          userId_key_content: {
            userId,
            key: mem.key,
            content: mem.content,
          },
        },
        create: {
          userId,
          key: mem.key,
          content: mem.content,
          source: "conversation",
          confidence: 0.9,
        },
        update: {
          updatedAt: new Date(),
        },
      });
    }
  } catch {
    // Best-effort — never break the main flow
  }
}

/**
 * Retrieve all stored memories for a user.
 * Returns them sorted by recency so the agent has the freshest context.
 */
export async function getRelevantMemories(
  userId: string
): Promise<Array<{ key: string; content: string; confidence: number }>> {
  try {
    const memories = await prisma.memoryEntry.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { key: true, content: true, confidence: true },
    });
    return memories;
  } catch {
    return [];
  }
}
