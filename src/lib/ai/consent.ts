import { prisma } from "@/lib/db";
import type { ApplicationStatus } from "@/generated/prisma/client";

/**
 * Persistent consent flow for AI-proposed database mutations.
 * Every write operation from the AI agent goes through this system:
 * 1. AI proposes a change → createConsentRequest()
 * 2. UI shows the proposal as a confirmation card
 * 3. User approves/rejects → resolveConsent()
 * 4. Only on approval does the mutation execute
 */

export async function createConsentRequest(params: {
  userId: string;
  threadId?: string;
  action: string;
  description: string;
  payload: Record<string, unknown>;
}): Promise<{
  id: string;
  action: string;
  description: string;
  payload: Record<string, unknown>;
  expiresAt: Date;
}> {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min expiry

  const request = await prisma.consentRequest.create({
    data: {
      userId: params.userId,
      threadId: params.threadId,
      action: params.action,
      description: params.description,
      payload: JSON.parse(JSON.stringify(params.payload)),
      expiresAt,
    },
  });

  return {
    id: request.id,
    action: request.action,
    description: request.description,
    payload: request.payload as Record<string, unknown>,
    expiresAt: request.expiresAt,
  };
}

export async function resolveConsent(
  consentId: string,
  userId: string,
  approved: boolean
): Promise<{ success: boolean; error?: string; result?: unknown }> {
  const request = await prisma.consentRequest.findUnique({
    where: { id: consentId },
  });

  if (!request) return { success: false, error: "Consent request not found" };
  if (request.userId !== userId) return { success: false, error: "Unauthorized" };
  if (request.status !== "pending") return { success: false, error: `Already ${request.status}` };

  if (new Date() > request.expiresAt) {
    await prisma.consentRequest.update({
      where: { id: consentId },
      data: { status: "expired" },
    });
    return { success: false, error: "Consent request expired — ask Riz AI to propose again" };
  }

  if (!approved) {
    await prisma.consentRequest.update({
      where: { id: consentId },
      data: { status: "rejected", resolvedAt: new Date() },
    });
    return { success: true };
  }

  // Execute the approved action
  try {
    const result = await executeConsentAction(
      request.action,
      request.payload as Record<string, unknown>,
      userId
    );
    await prisma.consentRequest.update({
      where: { id: consentId },
      data: { status: "approved", resolvedAt: new Date() },
    });
    return { success: true, result };
  } catch (error) {
    console.error("Consent action failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to execute action",
    };
  }
}

/**
 * Get pending consent requests for a user (for UI display on page load)
 */
export async function getPendingConsents(userId: string) {
  // Expire stale requests first
  await prisma.consentRequest.updateMany({
    where: {
      userId,
      status: "pending",
      expiresAt: { lt: new Date() },
    },
    data: { status: "expired" },
  });

  return prisma.consentRequest.findMany({
    where: { userId, status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

async function executeConsentAction(
  action: string,
  payload: Record<string, unknown>,
  userId: string
): Promise<unknown> {
  switch (action) {
    case "update_profile": {
      const updates = payload.updates as Record<string, unknown>;
      return prisma.academicProfile.update({
        where: { userId },
        data: updates,
      });
    }

    case "create_workspace": {
      return prisma.application.create({
        data: {
          userId,
          programId: payload.programId as string,
          status: "not_started",
          matchScore: (payload.matchScore as number) || 0,
        },
      });
    }

    case "update_application": {
      return prisma.application.update({
        where: { id: payload.applicationId as string },
        data: {
          status: payload.newStatus as ApplicationStatus,
          notes: payload.notes as string | undefined,
        },
      });
    }

    case "save_sop": {
      const content = payload.content as string;
      return prisma.sOPDraft.upsert({
        where: { id: (payload.sopId as string) || "00000000-0000-0000-0000-000000000000" },
        create: {
          userId,
          applicationId: payload.applicationId as string,
          targetUniversity: payload.universityName as string,
          content,
          wordCount: content.split(/\s+/).length,
          guidedAnswers: payload.guidedAnswers ? JSON.parse(JSON.stringify(payload.guidedAnswers)) : {},
          version: 1,
        },
        update: {
          content,
          wordCount: content.split(/\s+/).length,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });
    }

    case "save_email_draft": {
      return prisma.emailDraft.create({
        data: {
          userId,
          applicationId: payload.applicationId as string | undefined,
          type: payload.type as string,
          recipientEmail: payload.recipientEmail as string | undefined,
          recipientName: payload.recipientName as string | undefined,
          subject: payload.subject as string,
          body: payload.body as string,
        },
      });
    }

    case "remove_application": {
      return prisma.application.delete({
        where: { id: payload.applicationId as string },
      });
    }

    default:
      throw new Error(`Unknown consent action: ${action}`);
  }
}
