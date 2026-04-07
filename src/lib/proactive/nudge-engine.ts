import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";

// ─── Deduplication Window ──────────────────────────────

const DEDUPE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Create Alert (with deduplication) ─────────────────

export async function createAlert(params: {
  userId: string;
  type: string;
  title: string;
  body: string;
  priority: "low" | "medium" | "high" | "urgent";
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
  expiresAt?: Date;
}): Promise<string | null> {
  const {
    userId,
    type,
    title,
    body,
    priority,
    actionUrl,
    metadata,
    dedupeKey,
    expiresAt,
  } = params;

  // Deduplicate: check for a similar undismissed alert within the window
  if (dedupeKey) {
    const existing = await prisma.proactiveAlert.findFirst({
      where: {
        userId,
        isDismissed: false,
        metadata: { path: ["dedupeKey"], equals: dedupeKey },
        createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
      },
    });

    if (existing) return null;
  }

  const alert = await prisma.proactiveAlert.create({
    data: {
      userId,
      type,
      title,
      body,
      priority,
      actionUrl,
      metadata: {
        ...metadata,
        ...(dedupeKey ? { dedupeKey } : {}),
      },
      expiresAt,
    },
  });

  return alert.id;
}

// ─── Deliver Pending Alerts ────────────────────────────

export async function deliverPendingAlerts(): Promise<{
  processed: number;
  emailsSent: number;
  errors: string[];
}> {
  const stats = { processed: 0, emailsSent: 0, errors: [] as string[] };

  // Find alerts that haven't been delivered yet (no emailSentAt in metadata)
  // For urgent/high priority, we send emails. All alerts are already in-app via the model.
  const undelivered = await prisma.proactiveAlert.findMany({
    where: {
      isDismissed: false,
      priority: { in: ["urgent", "high"] },
      // Only process alerts created in the last 48 hours to avoid sending stale emails
      createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "asc" },
    take: 100, // Process in batches
  });

  // Filter out already-emailed alerts (check metadata for emailSentAt)
  const pending = undelivered.filter((a) => {
    const meta = a.metadata as Record<string, unknown> | null;
    return !meta?.emailSentAt;
  });

  // Fetch user info for pending alerts
  const userIds = [...new Set(pending.map((a) => a.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true, notificationPreferences: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  for (const alert of pending) {
    stats.processed++;
    const alertUser = userMap.get(alert.userId);
    if (!alertUser) continue;

    try {
      // Check if user has opted out of email notifications
      const prefs = alertUser.notificationPreferences as Record<string, unknown> | null;
      const emailEnabled = prefs?.emailEnabled !== false;

      if (emailEnabled) {
        const priorityLabel = alert.priority === "urgent" ? "URGENT" : "Important";

        await sendEmail({
          to: alertUser.email,
          subject: `[${priorityLabel}] ${alert.title}`,
          html: buildAlertEmailHtml({
            name: alertUser.name,
            title: alert.title,
            body: alert.body,
            priority: alert.priority,
            actionUrl: alert.actionUrl,
          }),
        });

        stats.emailsSent++;
      }

      // Mark as delivered by updating metadata
      const existingMeta = (alert.metadata as Record<string, unknown>) ?? {};
      await prisma.proactiveAlert.update({
        where: { id: alert.id },
        data: {
          metadata: {
            ...existingMeta,
            emailSentAt: new Date().toISOString(),
          },
        },
      });
    } catch (err) {
      const msg = `Failed to deliver alert ${alert.id}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(msg);
      stats.errors.push(msg);
    }
  }

  return stats;
}

// ─── Weekly Summary ────────────────────────────────────

export async function generateWeeklySummary(userId: string): Promise<string> {
  const now = new Date();
  const fourteenDaysOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Fetch application data
  const [applications, recentAlerts, unreadAlerts] = await Promise.all([
    prisma.application.findMany({
      where: {
        userId,
        status: { notIn: ["decision", "enrolled"] },
      },
      include: {
        program: { include: { university: true } },
        appDocuments: true,
      },
    }),
    prisma.proactiveAlert.findMany({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.proactiveAlert.count({
      where: {
        userId,
        isRead: false,
        isDismissed: false,
      },
    }),
  ]);

  // Build summary sections
  const sections: string[] = [];

  // Header
  sections.push("Weekly Application Summary");
  sections.push("=".repeat(40));

  // Applications progress
  const statusCounts: Record<string, number> = {};
  for (const app of applications) {
    const label = app.status.replace(/_/g, " ");
    statusCounts[label] = (statusCounts[label] ?? 0) + 1;
  }

  sections.push("");
  sections.push(`Active Applications: ${applications.length}`);
  for (const [status, count] of Object.entries(statusCounts)) {
    sections.push(`  - ${status}: ${count}`);
  }

  // Upcoming deadlines (next 14 days)
  const upcomingDeadlines = applications
    .filter((app) => {
      const deadline = app.program.applicationDeadline;
      return deadline && deadline >= now && deadline <= fourteenDaysOut;
    })
    .sort(
      (a, b) =>
        (a.program.applicationDeadline?.getTime() ?? 0) -
        (b.program.applicationDeadline?.getTime() ?? 0)
    );

  if (upcomingDeadlines.length > 0) {
    sections.push("");
    sections.push("Upcoming Deadlines (next 14 days):");
    for (const app of upcomingDeadlines) {
      const deadline = app.program.applicationDeadline!;
      const daysLeft = Math.ceil(
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      sections.push(
        `  - ${app.program.university.name} — ${app.program.name}: ${daysLeft} days (${deadline.toLocaleDateString()})`
      );
    }
  } else {
    sections.push("");
    sections.push("No deadlines in the next 14 days.");
  }

  // Action items
  const actionItems: string[] = [];

  const notStarted = applications.filter((a) => a.status === "not_started");
  if (notStarted.length > 0) {
    actionItems.push(
      `${notStarted.length} application(s) not yet started`
    );
  }

  const missingDocs = applications.filter(
    (a) =>
      a.status !== "ready" &&
      a.status !== "applied" &&
      a.program.applicationDeadline &&
      a.program.applicationDeadline <= fourteenDaysOut
  );
  if (missingDocs.length > 0) {
    actionItems.push(
      `${missingDocs.length} application(s) still need documents before deadline`
    );
  }

  if (unreadAlerts > 0) {
    actionItems.push(`${unreadAlerts} unread alert(s) to review`);
  }

  if (actionItems.length > 0) {
    sections.push("");
    sections.push(`Action Items (${actionItems.length}):`);
    for (const item of actionItems) {
      sections.push(`  - ${item}`);
    }
  }

  // Recent alerts summary
  const urgentAlerts = recentAlerts.filter(
    (a) => a.priority === "urgent" || a.priority === "high"
  );
  if (urgentAlerts.length > 0) {
    sections.push("");
    sections.push("Important Alerts This Week:");
    for (const alert of urgentAlerts.slice(0, 5)) {
      sections.push(`  - [${alert.priority.toUpperCase()}] ${alert.title}`);
    }
  }

  const summaryText = sections.join("\n");

  // Create the summary as an alert
  await createAlert({
    userId,
    type: "weekly_summary",
    title: "Your Weekly Application Summary",
    body: summaryText,
    priority: "low",
    actionUrl: "/applications",
    dedupeKey: `weekly-summary-${userId}-${now.toISOString().slice(0, 10)}`,
  });

  return summaryText;
}

// ─── Email HTML Builder ────────────────────────────────

function buildAlertEmailHtml(params: {
  name: string;
  title: string;
  body: string;
  priority: string;
  actionUrl: string | null;
}): string {
  const { name, title, body, priority, actionUrl } = params;

  const priorityColor =
    priority === "urgent"
      ? "#dc2626"
      : priority === "high"
        ? "#ea580c"
        : "#2563eb";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.ribrizoverseas.com";
  const fullActionUrl = actionUrl ? `${baseUrl}${actionUrl}` : baseUrl;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="border-left: 4px solid ${priorityColor}; padding: 16px; background: #fafafa;">
        <p style="margin: 0 0 8px; color: #666; font-size: 13px;">Hi ${name},</p>
        <h2 style="margin: 0 0 12px; font-size: 18px; color: #111;">${title}</h2>
        <p style="margin: 0 0 16px; font-size: 14px; color: #333; line-height: 1.5; white-space: pre-line;">${body}</p>
        <a href="${fullActionUrl}" style="display: inline-block; padding: 10px 20px; background: ${priorityColor}; color: #fff; text-decoration: none; font-size: 14px; font-weight: 500;">
          View Details
        </a>
      </div>
      <p style="margin: 16px 0 0; font-size: 12px; color: #999;">
        RIBRIZ Overseas — You're receiving this because you have active applications.
      </p>
    </div>
  `.trim();
}
