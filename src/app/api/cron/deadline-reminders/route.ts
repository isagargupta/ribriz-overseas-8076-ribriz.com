import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { deadlineReminderEmail } from "@/lib/email/templates";
import { runDailyWatchdog } from "@/lib/proactive/watchdog";
import { deliverPendingAlerts } from "@/lib/proactive/nudge-engine";

// Triggered by Vercel Cron or external scheduler
// Add to vercel.json: { "crons": [{ "path": "/api/cron/deadline-reminders", "schedule": "0 8 * * *" }] }

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const reminderDays = [30, 14, 3]; // Send reminders at these intervals

    const results: { sent: number; errors: number } = { sent: 0, errors: 0 };

    for (const days of reminderDays) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + days);

      // Find programs with deadlines on this target date
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const applications = await prisma.application.findMany({
        where: {
          program: {
            applicationDeadline: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          status: {
            notIn: ["applied", "decision", "enrolled"],
          },
        },
        include: {
          user: true,
          program: { include: { university: true } },
        },
      });

      for (const app of applications) {
        try {
          const deadline = app.program.applicationDeadline
            ? app.program.applicationDeadline.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : "Unknown";

          const { subject, html } = deadlineReminderEmail(
            app.user.name,
            app.program.university.name,
            app.program.name,
            deadline,
            days
          );

          await sendEmail({
            to: app.user.email,
            subject,
            html,
          });

          // Create proactive in-app alert
          const priority = days <= 3 ? "urgent" : days <= 14 ? "high" : "medium";
          await prisma.proactiveAlert.create({
            data: {
              userId: app.userId,
              type: "deadline_approaching",
              title: `${days} days until ${app.program.university.name} deadline`,
              body: `Your application for ${app.program.name} at ${app.program.university.name} is due on ${deadline}. Status: ${app.status.replace(/_/g, " ")}.`,
              priority,
              actionUrl: "/applications",
              metadata: {
                applicationId: app.id,
                programId: app.programId,
                universityName: app.program.university.name,
                daysUntilDeadline: days,
              },
              expiresAt: app.program.applicationDeadline ?? undefined,
            },
          });

          results.sent++;
        } catch {
          results.errors++;
        }
      }
    }

    // ─── Proactive: Missing documents for upcoming deadlines ───
    const upcomingApps = await prisma.application.findMany({
      where: {
        program: {
          applicationDeadline: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        status: { notIn: ["applied", "decision", "enrolled"] },
      },
      include: {
        user: { include: { documents: true, sopDrafts: true } },
        program: { include: { university: true } },
      },
    });

    for (const app of upcomingApps) {
      const docs = app.user.documents;
      const hasSop = app.user.sopDrafts.some((s) => s.applicationId === app.id);
      const missingDocs: string[] = [];

      if (!docs.some((d) => d.category === "academic" && (d.status === "uploaded" || d.status === "verified")))
        missingDocs.push("Academic transcripts");
      if (!docs.some((d) => d.category === "test_scores" && (d.status === "uploaded" || d.status === "verified")))
        missingDocs.push("Test scores");
      if (app.program.requiresSop && !hasSop)
        missingDocs.push("Statement of Purpose");

      if (missingDocs.length > 0) {
        // Check if similar alert already exists (avoid spam)
        const existing = await prisma.proactiveAlert.findFirst({
          where: {
            userId: app.userId,
            type: "missing_document",
            isDismissed: false,
            metadata: { path: ["applicationId"], equals: app.id },
          },
        });

        if (!existing) {
          await prisma.proactiveAlert.create({
            data: {
              userId: app.userId,
              type: "missing_document",
              title: `Missing documents for ${app.program.university.name}`,
              body: `You still need: ${missingDocs.join(", ")}. Deadline approaching.`,
              priority: "high",
              actionUrl: "/documents",
              metadata: {
                applicationId: app.id,
                missingDocs,
                universityName: app.program.university.name,
              },
            },
          });
        }
      }
    }

    // ─── Proactive: Incomplete profile alerts ───
    // Paginate in batches of 100 to avoid locking the DB on large user tables.
    const BATCH_SIZE = 100;
    let skip = 0;
    let batch: { id: string; academicProfile: { ieltsScore: number | null; toeflScore: number | null; pteScore: number | null } | null; preferences: { careerGoals: string | null; targetCountries: string[] } | null }[];
    do {
      batch = await prisma.user.findMany({
        where: {
          onboardingComplete: true,
          applications: { some: {} },
        },
        include: { academicProfile: true, preferences: true },
        skip,
        take: BATCH_SIZE,
      });
      skip += BATCH_SIZE;
      for (const u of batch) {
        const missing: string[] = [];
        if (!u.academicProfile?.ieltsScore && !u.academicProfile?.toeflScore && !u.academicProfile?.pteScore)
          missing.push("English test score");
        if (!u.preferences?.careerGoals)
          missing.push("Career goals");

        if (missing.length > 0) {
          const existing = await prisma.proactiveAlert.findFirst({
            where: {
              userId: u.id,
              type: "profile_incomplete",
              isDismissed: false,
              createdAt: { gt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
            },
          });

          if (!existing) {
            await prisma.proactiveAlert.create({
              data: {
                userId: u.id,
                type: "profile_incomplete",
                title: "Complete your profile for better matches",
                body: `Missing: ${missing.join(", ")}. A complete profile improves university matching accuracy.`,
                priority: "medium",
                actionUrl: "/settings",
              },
            });
          }
        }
      }
    } while (batch.length === BATCH_SIZE);

    // ─── Run daily watchdog (stale apps, portfolio balance, etc.) ───
    let watchdogResult = null;
    try {
      watchdogResult = await runDailyWatchdog();
    } catch (err) {
      console.error("Watchdog failed:", err);
    }

    // ─── Deliver pending alerts (email for urgent/high) ───
    let nudgeResult = null;
    try {
      nudgeResult = await deliverPendingAlerts();
    } catch (err) {
      console.error("Nudge delivery failed:", err);
    }

    return NextResponse.json({
      success: true,
      ...results,
      watchdog: watchdogResult,
      nudge: nudgeResult,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Deadline reminder cron error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron job failed" },
      { status: 500 }
    );
  }
}
