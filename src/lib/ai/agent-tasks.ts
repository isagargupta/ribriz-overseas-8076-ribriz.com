import { prisma } from "@/lib/db";
import type { AgentTaskType } from "@/generated/prisma/client";
import {
  computeMatchScore,
  generateAdmissionAudit,
  getBucket,
  getBucketLabel,
} from "@/lib/scoring";
import {
  recomputeStudentVector,
  quickScoreHeuristics,
  refreshAllCalibrations,
} from "./ml-engine";
import { anthropic, INSIGHT_MODEL } from "./claude";

// ─── Types ──────────────────────────────────────────────

interface AgentTaskResult {
  summary: string;
  toolsUsed: string[];
  result: Record<string, unknown>;
  requiresAction: boolean;
  actionUrl?: string;
  alertToCreate?: {
    type: string;
    title: string;
    body: string;
    priority: string;
    actionUrl?: string;
  };
}

// ─── Enqueue & Execute ──────────────────────────────────

export async function enqueueAgentTask(
  userId: string,
  type: AgentTaskType,
  context: Record<string, unknown> = {}
): Promise<string> {
  const trigger = context.trigger as string ?? type.replace(/_/g, " ");

  const task = await prisma.agentTask.create({
    data: {
      userId,
      type,
      trigger,
      status: "pending",
    },
  });

  // Execute async — don't block the caller
  executeAgentTask(task.id, userId, type, context).catch((err) => {
    console.error(`Agent task ${task.id} failed:`, err);
  });

  return task.id;
}

async function executeAgentTask(
  taskId: string,
  userId: string,
  type: AgentTaskType,
  context: Record<string, unknown>
): Promise<void> {
  const startedAt = new Date();

  await prisma.agentTask.update({
    where: { id: taskId },
    data: { status: "running", startedAt },
  });

  try {
    const result = await runTask(userId, type, context);

    const completedAt = new Date();
    await prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status: "completed",
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        toolsUsed: result.toolsUsed,
        result: result.result as never,
        summary: result.summary,
        requiresAction: result.requiresAction,
        actionUrl: result.actionUrl,
      },
    });

    // Create proactive alert if task produced one
    if (result.alertToCreate) {
      await prisma.proactiveAlert.create({
        data: {
          userId,
          type: result.alertToCreate.type,
          title: result.alertToCreate.title,
          body: result.alertToCreate.body,
          priority: result.alertToCreate.priority,
          actionUrl: result.alertToCreate.actionUrl,
        },
      });
    }
  } catch (err) {
    await prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status: "failed",
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        error: err instanceof Error ? err.message : String(err),
      },
    });
  }
}

// ─── Task Router ────────────────────────────────────────

async function runTask(
  userId: string,
  type: AgentTaskType,
  context: Record<string, unknown>
): Promise<AgentTaskResult> {
  switch (type) {
    case "auto_suggest_universities":
      return autoSuggestUniversities(userId);
    case "auto_admission_audit":
      return autoAdmissionAudit(userId, context.applicationId as string);
    case "auto_advance_status":
      return autoAdvanceStatus(userId, context.applicationId as string);
    case "auto_deadline_reminder":
      return autoDeadlineReminder(userId);
    case "auto_portfolio_rebalance":
      return autoPortfolioRebalance(userId);
    case "auto_document_quality":
      return autoDocumentQuality(userId, context.documentId as string);
    case "auto_profile_gap_check":
      return autoProfileGapCheck(userId);
    default:
      return {
        summary: `Unknown task type: ${type}`,
        toolsUsed: [],
        result: {},
        requiresAction: false,
      };
  }
}

// ─── Task Implementations ───────────────────────────────

async function autoSuggestUniversities(userId: string): Promise<AgentTaskResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { academicProfile: true, preferences: true },
  });

  if (!user?.academicProfile || !user?.preferences) {
    return {
      summary: "Cannot suggest universities — profile incomplete.",
      toolsUsed: [],
      result: {},
      requiresAction: true,
      actionUrl: "/onboarding",
    };
  }

  // Also recompute their student vector
  await recomputeStudentVector(userId);

  // Find programs matching preferences
  const programs = await prisma.program.findMany({
    where: {
      university: { country: { in: user.preferences.targetCountries } },
      degreeLevel: user.preferences.targetDegreeLevel,
      field: { contains: user.preferences.targetField, mode: "insensitive" },
    },
    include: { university: true },
    take: 30,
  });

  // Score and rank
  const scored = programs
    .map((p) => {
      const { score, breakdown } = computeMatchScore(user.academicProfile!, user.preferences!, p);
      const bucket = getBucket(score, p.university.acceptanceRate);
      return { program: p, score, breakdown, bucket };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

  const safety = scored.filter((s) => s.bucket === "safety").length;
  const target = scored.filter((s) => s.bucket === "target").length;
  const reach = scored.filter((s) => s.bucket === "reach").length;

  const topNames = scored.slice(0, 5).map((s) =>
    `${s.program.university.name} (${s.score}%)`
  ).join(", ");

  return {
    summary: `Found ${scored.length} matching programs: ${safety} safety, ${target} target, ${reach} reach. Top matches: ${topNames}`,
    toolsUsed: ["search_universities", "computeMatchScore"],
    result: {
      totalFound: scored.length,
      buckets: { safety, target, reach, longShot: scored.filter((s) => s.bucket === "long_shot").length },
      topPrograms: scored.slice(0, 5).map((s) => ({
        university: s.program.university.name,
        program: s.program.name,
        country: s.program.university.country,
        score: s.score,
        bucket: s.bucket,
      })),
    },
    requiresAction: true,
    actionUrl: "/universities",
    alertToCreate: {
      type: "status_update",
      title: "University Recommendations Ready",
      body: `Riz found ${scored.length} programs matching your profile — ${safety} safety, ${target} target, ${reach} reach schools. Top match: ${scored[0]?.program.university.name ?? "N/A"}.`,
      priority: "medium",
      actionUrl: "/universities",
    },
  };
}

async function autoAdmissionAudit(
  userId: string,
  applicationId: string
): Promise<AgentTaskResult> {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { program: { include: { university: true } } },
  });

  if (!app) {
    return { summary: "Application not found.", toolsUsed: [], result: {}, requiresAction: false };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { academicProfile: true, preferences: true },
  });

  if (!user?.academicProfile || !user?.preferences) {
    return { summary: "Profile incomplete for audit.", toolsUsed: [], result: {}, requiresAction: true, actionUrl: "/onboarding" };
  }

  const audit = generateAdmissionAudit(user.academicProfile, user.preferences, app.program);
  const hasHardFilters = audit.hardFiltersFailed.length > 0;

  let alertToCreate: AgentTaskResult["alertToCreate"];
  if (hasHardFilters) {
    const blockers = audit.hardFiltersFailed.join(", ");
    alertToCreate = {
      type: "status_update",
      title: `Auto-Reject Risk: ${app.program.university.name}`,
      body: `Your application to ${app.program.name} at ${app.program.university.name} has hard filter risks: ${blockers}. Review the admission audit for details.`,
      priority: "high",
      actionUrl: `/universities/${app.program.universityId}`,
    };
  }

  return {
    summary: `Admission audit for ${app.program.university.name}: ${audit.overallScore}% match, ${hasHardFilters ? "HAS AUTO-REJECT RISKS" : "no hard filters"}.`,
    toolsUsed: ["run_admission_audit"],
    result: {
      university: app.program.university.name,
      program: app.program.name,
      overallScore: audit.overallScore,
      hardFiltersFailed: audit.hardFiltersFailed,
      bucket: getBucketLabel(getBucket(audit.overallScore, app.program.university.acceptanceRate)),
    },
    requiresAction: hasHardFilters,
    actionUrl: `/universities/${app.program.universityId}`,
    alertToCreate,
  };
}

async function autoAdvanceStatus(
  userId: string,
  applicationId: string
): Promise<AgentTaskResult> {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      program: true,
      appDocuments: true,
    },
  });

  if (!app) {
    return { summary: "Application not found.", toolsUsed: [], result: {}, requiresAction: false };
  }

  // Check document completeness
  const hasSop = app.appDocuments.some((d) => d.type === "sop" && d.isComplete);
  const hasCV = app.appDocuments.some((d) => d.type === "cv" && d.isComplete);
  const lorCount = app.appDocuments.filter((d) => d.type === "lor" && d.isComplete).length;
  const requiredLors = app.program.requiresLor ?? 0;

  let newStatus = app.status;
  let advanced = false;

  if (app.status === "not_started" && app.appDocuments.length > 0) {
    newStatus = "docs_pending";
    advanced = true;
  }
  if (app.status === "docs_pending" && hasSop) {
    newStatus = "sop_pending";
    advanced = true;
  }
  if ((app.status === "sop_pending" || app.status === "docs_pending") && hasSop && hasCV && lorCount >= requiredLors) {
    newStatus = "ready";
    advanced = true;
  }

  if (advanced) {
    await prisma.application.update({
      where: { id: applicationId },
      data: { status: newStatus },
    });
  }

  return {
    summary: advanced
      ? `Application status advanced to "${newStatus}" based on document progress.`
      : `Application status unchanged (${app.status}). Missing documents still needed.`,
    toolsUsed: ["auto_advance_status"],
    result: {
      previousStatus: app.status,
      newStatus,
      advanced,
      hasSop,
      hasCV,
      lorCount,
      requiredLors,
    },
    requiresAction: false,
  };
}

async function autoDeadlineReminder(userId: string): Promise<AgentTaskResult> {
  const apps = await prisma.application.findMany({
    where: {
      userId,
      status: { notIn: ["decision", "enrolled"] },
    },
    include: { program: { include: { university: true } } },
  });

  const now = new Date();
  const alerts: AgentTaskResult["alertToCreate"][] = [];
  const urgentApps: string[] = [];

  for (const app of apps) {
    const deadline = app.program.applicationDeadline;
    if (!deadline) continue;

    const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil <= 0) continue; // past deadline
    if (daysUntil > 14) continue; // too far away

    const priority = daysUntil <= 3 ? "urgent" : daysUntil <= 7 ? "high" : "medium";
    const uniName = app.program.university.name;

    urgentApps.push(`${uniName} (${daysUntil} days)`);

    // Check if we already sent a reminder recently
    const recentAlert = await prisma.proactiveAlert.findFirst({
      where: {
        userId,
        type: "deadline_approaching",
        metadata: { path: ["applicationId"], equals: app.id },
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    });

    if (!recentAlert) {
      await prisma.proactiveAlert.create({
        data: {
          userId,
          type: "deadline_approaching",
          title: `${daysUntil} days left: ${uniName}`,
          body: `Your application to ${app.program.name} at ${uniName} is due in ${daysUntil} days (${deadline.toLocaleDateString()}). Status: ${app.status}.`,
          priority,
          actionUrl: `/applications/${app.id}`,
          metadata: { applicationId: app.id },
          expiresAt: deadline,
        },
      });
    }
  }

  return {
    summary: urgentApps.length > 0
      ? `Deadline alerts created for: ${urgentApps.join(", ")}`
      : "No upcoming deadlines within 14 days.",
    toolsUsed: ["get_deadlines"],
    result: { urgentApps, totalChecked: apps.length },
    requiresAction: urgentApps.length > 0,
  };
}

async function autoPortfolioRebalance(userId: string): Promise<AgentTaskResult> {
  const apps = await prisma.application.findMany({
    where: { userId, status: { notIn: ["decision", "enrolled"] } },
    include: { program: { include: { university: true } } },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { academicProfile: true, preferences: true },
  });

  if (!user?.academicProfile || !user?.preferences || apps.length === 0) {
    return { summary: "No active applications to rebalance.", toolsUsed: [], result: {}, requiresAction: false };
  }

  const buckets = { safety: 0, target: 0, reach: 0, long_shot: 0 };
  for (const app of apps) {
    const { score } = computeMatchScore(user.academicProfile, user.preferences, app.program);
    const bucket = getBucket(score, app.program.university.acceptanceRate);
    buckets[bucket]++;
  }

  // Check for imbalance
  const issues: string[] = [];
  if (buckets.safety === 0 && apps.length >= 3) {
    issues.push("No safety schools in your portfolio. Consider adding 2-3 programs where your profile strongly exceeds requirements.");
  }
  if (buckets.safety + buckets.target === 0) {
    issues.push("All your applications are reach/long-shot. This is risky — add some target and safety schools.");
  }
  if (buckets.reach + buckets.long_shot > buckets.safety + buckets.target + 2) {
    issues.push("Too many reach schools relative to safety/target. Consider a more balanced portfolio.");
  }

  let alertToCreate: AgentTaskResult["alertToCreate"];
  if (issues.length > 0) {
    alertToCreate = {
      type: "status_update",
      title: "Portfolio Needs Rebalancing",
      body: issues[0],
      priority: "medium",
      actionUrl: "/applications",
    };
  }

  return {
    summary: `Portfolio: ${buckets.safety} safety, ${buckets.target} target, ${buckets.reach} reach, ${buckets.long_shot} long shot. ${issues.length > 0 ? "Issues found." : "Balanced."}`,
    toolsUsed: ["strategic_recommendation"],
    result: { buckets, issues, totalActive: apps.length },
    requiresAction: issues.length > 0,
    alertToCreate,
  };
}

async function autoDocumentQuality(
  userId: string,
  documentId: string
): Promise<AgentTaskResult> {
  const doc = await prisma.applicationDocument.findUnique({
    where: { id: documentId },
  });

  if (!doc || !doc.content || doc.content.trim().length < 50) {
    return { summary: "Document too short to score.", toolsUsed: [], result: {}, requiresAction: false };
  }

  // Run quick heuristic scoring (no API call)
  const { score, issues } = quickScoreHeuristics(doc.content, doc.type, doc.universityName);

  await prisma.applicationDocument.update({
    where: { id: documentId },
    data: { qualityScore: score, lastScoredAt: new Date() },
  });

  let alertToCreate: AgentTaskResult["alertToCreate"];
  if (score < 60) {
    alertToCreate = {
      type: "status_update",
      title: `${doc.type.toUpperCase()} Quality: Needs Work`,
      body: `Your ${doc.type.toUpperCase()} for ${doc.universityName} scored ${score}/100. Key issues: ${issues.slice(0, 2).join("; ")}. Open it to improve.`,
      priority: "medium",
      actionUrl: `/applications/${doc.applicationId}`,
    };
  }

  return {
    summary: `Document "${doc.title}" scored ${score}/100. ${issues.length > 0 ? `Issues: ${issues.join("; ")}` : "No major issues."}`,
    toolsUsed: ["score_document"],
    result: { documentId, score, issues },
    requiresAction: score < 60,
    alertToCreate,
  };
}

async function autoProfileGapCheck(userId: string): Promise<AgentTaskResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { academicProfile: true, preferences: true, applications: { include: { program: { include: { university: true } } } } },
  });

  if (!user?.academicProfile || !user?.preferences) {
    return { summary: "Profile incomplete.", toolsUsed: [], result: {}, requiresAction: true, actionUrl: "/onboarding" };
  }

  const gaps: Array<{ field: string; impact: string; suggestion: string }> = [];

  // Check missing test scores that would help
  if (!user.academicProfile.ieltsScore && !user.academicProfile.toeflScore && !user.academicProfile.pteScore) {
    gaps.push({
      field: "English Test Score",
      impact: "Cannot accurately match to programs. Most programs require IELTS/TOEFL.",
      suggestion: "Add your IELTS, TOEFL, or PTE score to improve matching accuracy.",
    });
  }

  if (!user.academicProfile.greScore && user.preferences.targetCountries.includes("United States")) {
    gaps.push({
      field: "GRE Score",
      impact: "GRE carries 12% weight for US universities. Missing it reduces your match scores.",
      suggestion: "Even for test-optional programs, a strong GRE (320+) significantly boosts your profile.",
    });
  }

  if (!user.preferences.careerGoals) {
    gaps.push({
      field: "Career Goals",
      impact: "AI cannot generate university-specific SOPs without clear career goals.",
      suggestion: "Add your short-term and long-term career goals in Settings.",
    });
  }

  if (user.academicProfile.workExperienceMonths > 0 && !user.academicProfile.currentCompany) {
    gaps.push({
      field: "Current Company/Role",
      impact: "Work experience context helps with SOP quality and MBA applications.",
      suggestion: "Add your current company and job title.",
    });
  }

  // Check if adding a missing field would significantly improve any application score
  if (user.applications.length > 0 && !user.academicProfile.ieltsScore) {
    // Simulate adding a good IELTS score
    const simulatedProfile = { ...user.academicProfile, ieltsScore: 7.0 };
    let totalImprovement = 0;
    for (const app of user.applications.slice(0, 5)) {
      const current = computeMatchScore(user.academicProfile, user.preferences, app.program);
      const simulated = computeMatchScore(simulatedProfile as typeof user.academicProfile, user.preferences, app.program);
      totalImprovement += simulated.score - current.score;
    }
    const avgImprovement = totalImprovement / Math.min(user.applications.length, 5);
    if (avgImprovement > 5) {
      gaps.push({
        field: "IELTS Score (High Impact)",
        impact: `Adding an IELTS 7.0 would improve your match scores by ~${Math.round(avgImprovement)}% on average across your shortlisted programs.`,
        suggestion: "This is the single highest-impact action you can take right now.",
      });
    }
  }

  let alertToCreate: AgentTaskResult["alertToCreate"];
  if (gaps.length > 0) {
    alertToCreate = {
      type: "profile_incomplete",
      title: `${gaps.length} Profile Gap${gaps.length > 1 ? "s" : ""} Found`,
      body: gaps[0].suggestion,
      priority: gaps.some((g) => g.field.includes("High Impact")) ? "high" : "medium",
      actionUrl: "/settings",
    };
  }

  return {
    summary: gaps.length > 0
      ? `Found ${gaps.length} profile gaps: ${gaps.map((g) => g.field).join(", ")}`
      : "Profile is complete — no significant gaps.",
    toolsUsed: ["analyze_profile_strength"],
    result: { gaps, gapCount: gaps.length },
    requiresAction: gaps.length > 0,
    actionUrl: "/settings",
    alertToCreate,
  };
}

// ─── Bulk Runner (for cron) ─────────────────────────────

export async function runDailyAgentTasks(): Promise<{
  usersProcessed: number;
  tasksCreated: number;
  calibrationsUpdated: number;
}> {
  // Refresh ML calibrations
  const calibrationsUpdated = await refreshAllCalibrations();

  // Get all users with active applications
  const users = await prisma.user.findMany({
    where: { onboardingComplete: true },
    select: { id: true },
  });

  let tasksCreated = 0;

  for (const user of users) {
    // Deadline reminders
    await enqueueAgentTask(user.id, "auto_deadline_reminder", { trigger: "Daily cron check" });
    tasksCreated++;

    // Profile gap check
    await enqueueAgentTask(user.id, "auto_profile_gap_check", { trigger: "Daily cron check" });
    tasksCreated++;
  }

  return { usersProcessed: users.length, tasksCreated, calibrationsUpdated };
}
