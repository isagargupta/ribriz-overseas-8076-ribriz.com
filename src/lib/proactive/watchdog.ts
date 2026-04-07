import { prisma } from "@/lib/db";
import { createAlert } from "./nudge-engine";
import { computeMatchScore, getBucket } from "@/lib/scoring";

// ─── Types ─────────────────────────────────────────────

interface WatchdogSummary {
  usersChecked: number;
  alertsCreated: number;
  issues: string[];
}

// ─── Daily Watchdog ────────────────────────────────────

export async function runDailyWatchdog(): Promise<WatchdogSummary> {
  const summary: WatchdogSummary = {
    usersChecked: 0,
    alertsCreated: 0,
    issues: [],
  };

  try {
    // Get all users with at least 1 application
    const users = await prisma.user.findMany({
      where: {
        applications: { some: {} },
      },
      include: {
        academicProfile: true,
        preferences: true,
        applications: {
          include: {
            program: { include: { university: true } },
            appDocuments: true,
          },
        },
        sopDrafts: true,
        documents: true,
      },
    });

    for (const user of users) {
      summary.usersChecked++;

      try {
        const created = await runChecksForUser(user);
        summary.alertsCreated += created;
      } catch (err) {
        const msg = `Watchdog failed for user ${user.id}: ${err instanceof Error ? err.message : String(err)}`;
        console.error(msg);
        summary.issues.push(msg);
      }
    }
  } catch (err) {
    const msg = `Watchdog top-level error: ${err instanceof Error ? err.message : String(err)}`;
    console.error(msg);
    summary.issues.push(msg);
  }

  return summary;
}

// ─── Per-User Checks ──────────────────────────────────

type UserWithRelations = Awaited<
  ReturnType<typeof prisma.user.findMany<{
    include: {
      academicProfile: true;
      preferences: true;
      applications: {
        include: {
          program: { include: { university: true } };
          appDocuments: true;
        };
      };
      sopDrafts: true;
      documents: true;
    };
  }>>
>[number];

async function runChecksForUser(user: UserWithRelations): Promise<number> {
  let alertsCreated = 0;

  const activeApps = user.applications.filter(
    (a) => !["decision", "enrolled"].includes(a.status)
  );

  if (activeApps.length === 0) return 0;

  const now = new Date();

  // Run all checks
  alertsCreated += await checkStaleApplications(user.id, activeApps, now);
  alertsCreated += await checkSopProgress(user.id, activeApps, user.sopDrafts, now);
  alertsCreated += await checkDocumentGaps(user.id, activeApps, user.documents, now);
  alertsCreated += await checkPortfolioBalance(user, activeApps);
  alertsCreated += await checkTestScoreGaps(user);
  alertsCreated += await checkApplicationCount(user.id, activeApps);
  alertsCreated += await checkDeadlineClustering(user.id, activeApps);

  return alertsCreated;
}

// ─── Check 1: Stale Applications ──────────────────────
// Apps in "not_started" for >7 days

async function checkStaleApplications(
  userId: string,
  apps: UserWithRelations["applications"],
  now: Date
): Promise<number> {
  let created = 0;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const staleApps = apps.filter(
    (a) =>
      a.status === "not_started" &&
      now.getTime() - a.createdAt.getTime() > sevenDaysMs
  );

  if (staleApps.length === 0) return 0;

  const names = staleApps
    .map((a) => a.program.university.name)
    .slice(0, 3)
    .join(", ");

  const suffix = staleApps.length > 3 ? ` and ${staleApps.length - 3} more` : "";

  const alertId = await createAlert({
    userId,
    type: "stale_application",
    title: `${staleApps.length} application(s) haven't been started`,
    body: `You added applications for ${names}${suffix} over a week ago but haven't begun working on them. Start with the one whose deadline is closest.`,
    priority: "medium",
    actionUrl: "/applications",
    dedupeKey: `stale-apps-${userId}`,
  });

  if (alertId) created++;
  return created;
}

// ─── Check 2: SOP Progress ───────────────────────────
// Apps with deadline <30 days but no SOP draft

async function checkSopProgress(
  userId: string,
  apps: UserWithRelations["applications"],
  sopDrafts: UserWithRelations["sopDrafts"],
  now: Date
): Promise<number> {
  let created = 0;
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  for (const app of apps) {
    const deadline = app.program.applicationDeadline;
    if (!deadline) continue;

    const daysUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntil <= 0 || daysUntil > 30) continue;

    // Check if program requires SOP
    if (!app.program.requiresSop) continue;

    // Check if there's an SOP draft for this application
    const hasDraft = sopDrafts.some((d) => d.applicationId === app.id);
    if (hasDraft) continue;

    const alertId = await createAlert({
      userId,
      type: "sop_missing",
      title: `No SOP draft for ${app.program.university.name}`,
      body: `Your ${app.program.name} application at ${app.program.university.name} is due in ${Math.ceil(daysUntil)} days but you haven't started your Statement of Purpose. SOPs typically take multiple revisions — start now.`,
      priority: daysUntil <= 14 ? "urgent" : "high",
      actionUrl: `/applications/${app.id}`,
      dedupeKey: `sop-missing-${app.id}`,
      metadata: { applicationId: app.id, daysUntilDeadline: Math.ceil(daysUntil) },
    });

    if (alertId) created++;
  }

  return created;
}

// ─── Check 3: Document Gaps ──────────────────────────
// Missing critical documents for apps with deadline <45 days

async function checkDocumentGaps(
  userId: string,
  apps: UserWithRelations["applications"],
  userDocuments: UserWithRelations["documents"],
  now: Date
): Promise<number> {
  let created = 0;
  const fortyFiveDaysMs = 45 * 24 * 60 * 60 * 1000;

  for (const app of apps) {
    const deadline = app.program.applicationDeadline;
    if (!deadline) continue;

    const daysUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntil <= 0 || daysUntil > 45) continue;

    const missing: string[] = [];

    // Check academic transcripts
    const hasTranscripts = userDocuments.some(
      (d) =>
        d.category === "academic" &&
        (d.status === "uploaded" || d.status === "verified")
    );
    if (!hasTranscripts) missing.push("Academic transcripts");

    // Check test scores
    const hasTestScores = userDocuments.some(
      (d) =>
        d.category === "test_scores" &&
        (d.status === "uploaded" || d.status === "verified")
    );
    if (!hasTestScores) missing.push("Test score reports");

    // Check LORs
    const requiredLors = app.program.requiresLor ?? 0;
    if (requiredLors > 0) {
      const lorCount = app.appDocuments.filter(
        (d) => d.type === "lor" && d.isComplete
      ).length;
      if (lorCount < requiredLors) {
        missing.push(
          `Letters of Recommendation (${lorCount}/${requiredLors})`
        );
      }
    }

    // Check resume/CV
    if (app.program.requiresResume) {
      const hasResume = app.appDocuments.some(
        (d) => d.type === "cv" && d.isComplete
      );
      if (!hasResume) missing.push("Resume/CV");
    }

    if (missing.length === 0) continue;

    const alertId = await createAlert({
      userId,
      type: "missing_document",
      title: `Missing documents for ${app.program.university.name}`,
      body: `${app.program.name} deadline is in ${Math.ceil(daysUntil)} days. Still missing: ${missing.join(", ")}. Upload these as soon as possible to avoid last-minute issues.`,
      priority: daysUntil <= 14 ? "urgent" : "high",
      actionUrl: "/documents",
      dedupeKey: `doc-gaps-${app.id}`,
      metadata: {
        applicationId: app.id,
        missingDocs: missing,
        daysUntilDeadline: Math.ceil(daysUntil),
      },
    });

    if (alertId) created++;
  }

  return created;
}

// ─── Check 4: Portfolio Balance ──────────────────────
// If user has no safety schools (all match scores <60%)

async function checkPortfolioBalance(
  user: UserWithRelations,
  apps: UserWithRelations["applications"]
): Promise<number> {
  if (!user.academicProfile || !user.preferences) return 0;
  if (apps.length < 3) return 0; // Need enough apps to assess balance

  let safetyCount = 0;
  let targetCount = 0;

  for (const app of apps) {
    const { score } = computeMatchScore(
      user.academicProfile,
      user.preferences,
      app.program
    );
    const bucket = getBucket(score, app.program.university.acceptanceRate);
    if (bucket === "safety") safetyCount++;
    if (bucket === "target") targetCount++;
  }

  if (safetyCount > 0) return 0; // Has at least one safety

  const alertId = await createAlert({
    userId: user.id,
    type: "portfolio_imbalance",
    title: "No safety schools in your portfolio",
    body: `All ${apps.length} of your applications are to target, reach, or long-shot schools. A balanced portfolio should include 2-3 safety schools where your profile strongly exceeds requirements. This significantly reduces the risk of no admits.`,
    priority: "high",
    actionUrl: "/universities",
    dedupeKey: `portfolio-no-safety-${user.id}`,
  });

  return alertId ? 1 : 0;
}

// ─── Check 5: Test Score Gaps ────────────────────────
// If targeting country that needs IELTS/GRE but scores missing

async function checkTestScoreGaps(
  user: UserWithRelations
): Promise<number> {
  if (!user.academicProfile || !user.preferences) return 0;

  let created = 0;
  const profile = user.academicProfile;
  const countries = user.preferences.targetCountries;

  // English test needed for all international students
  const hasEnglish =
    profile.ieltsScore != null ||
    profile.toeflScore != null ||
    profile.pteScore != null ||
    profile.duolingoScore != null;

  if (!hasEnglish && countries.length > 0) {
    const alertId = await createAlert({
      userId: user.id,
      type: "test_score_gap",
      title: "English proficiency test score missing",
      body: `You're targeting ${countries.join(", ")} but haven't added an IELTS, TOEFL, PTE, or Duolingo score. Most universities require this for admission. Add your score or planned test date in your profile.`,
      priority: "high",
      actionUrl: "/settings",
      dedupeKey: `english-score-missing-${user.id}`,
    });
    if (alertId) created++;
  }

  // GRE check for US/Canada
  const greCountries = ["United States", "USA", "Canada"];
  const needsGre = countries.some((c) =>
    greCountries.some((gc) => c.toLowerCase().includes(gc.toLowerCase()))
  );

  if (
    needsGre &&
    profile.greScore == null &&
    !profile.plannedTests.some((t) => t.toLowerCase().includes("gre"))
  ) {
    // Check if any of their programs actually require GRE
    const greRequired = user.applications.some(
      (a) => a.program.requiresGre
    );

    if (greRequired) {
      const alertId = await createAlert({
        userId: user.id,
        type: "test_score_gap",
        title: "GRE score missing for US/Canada applications",
        body: `Some of your target programs require the GRE but you haven't added a score. Even test-optional programs often favor applicants with strong GRE scores (320+). Consider taking the GRE to strengthen your applications.`,
        priority: "medium",
        actionUrl: "/settings",
        dedupeKey: `gre-score-missing-${user.id}`,
      });
      if (alertId) created++;
    }
  }

  return created;
}

// ─── Check 6: Application Count ─────────────────────
// If user has >10 applications, warn about SOP quality degradation

async function checkApplicationCount(
  userId: string,
  apps: UserWithRelations["applications"]
): Promise<number> {
  if (apps.length <= 10) return 0;

  const alertId = await createAlert({
    userId,
    type: "too_many_applications",
    title: `You have ${apps.length} active applications`,
    body: `Managing more than 10 applications often leads to lower SOP quality and missed details. Consider narrowing to your top 8-10 choices with a good mix of safety, target, and reach schools. Quality over quantity leads to better outcomes.`,
    priority: "medium",
    actionUrl: "/applications",
    dedupeKey: `too-many-apps-${userId}`,
  });

  return alertId ? 1 : 0;
}

// ─── Check 7: Deadline Clustering ───────────────────
// If 3+ deadlines within same 2-week window

async function checkDeadlineClustering(
  userId: string,
  apps: UserWithRelations["applications"]
): Promise<number> {
  // Gather upcoming deadlines (next 90 days)
  const now = new Date();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

  const upcoming = apps
    .filter((a) => {
      const d = a.program.applicationDeadline;
      return d && d.getTime() > now.getTime() && d.getTime() - now.getTime() <= ninetyDaysMs;
    })
    .sort(
      (a, b) =>
        (a.program.applicationDeadline?.getTime() ?? 0) -
        (b.program.applicationDeadline?.getTime() ?? 0)
    );

  if (upcoming.length < 3) return 0;

  // Sliding window: check every deadline as window start
  const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < upcoming.length; i++) {
    const windowStart = upcoming[i].program.applicationDeadline!.getTime();
    const windowEnd = windowStart + twoWeeksMs;

    const inWindow = upcoming.filter((a) => {
      const t = a.program.applicationDeadline!.getTime();
      return t >= windowStart && t <= windowEnd;
    });

    if (inWindow.length >= 3) {
      const names = inWindow
        .map((a) => a.program.university.name)
        .slice(0, 4)
        .join(", ");

      const windowStartDate = new Date(windowStart).toLocaleDateString();
      const windowEndDate = new Date(windowEnd).toLocaleDateString();

      const alertId = await createAlert({
        userId,
        type: "deadline_cluster",
        title: `${inWindow.length} deadlines in a 2-week window`,
        body: `You have ${inWindow.length} applications due between ${windowStartDate} and ${windowEndDate}: ${names}. Plan ahead — start SOPs and document prep now so you're not rushing multiple submissions at once.`,
        priority: "high",
        actionUrl: "/applications",
        dedupeKey: `deadline-cluster-${userId}-${windowStartDate}`,
        metadata: {
          windowStart: windowStartDate,
          windowEnd: windowEndDate,
          applicationCount: inWindow.length,
          universities: inWindow.map((a) => a.program.university.name),
        },
      });

      // Only alert for the first cluster found
      return alertId ? 1 : 0;
    }
  }

  return 0;
}
