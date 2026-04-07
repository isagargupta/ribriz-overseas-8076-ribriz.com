import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus, Decision } from "@/generated/prisma/client";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const apps = await prisma.application.findMany({
      where: { userId: user.id },
      include: { program: { include: { university: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ applications: apps });
  } catch (error) {
    console.error("Applications fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { programId, matchScore } = await request.json();
    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    // Check for duplicate
    const existing = await prisma.application.findFirst({
      where: { userId: user.id, programId },
    });
    if (existing) {
      return NextResponse.json({ error: "Application already exists", application: existing }, { status: 409 });
    }

    const app = await prisma.application.create({
      data: {
        userId: user.id,
        programId,
        matchScore: matchScore ?? null,
        status: "not_started",
      },
      include: { program: { include: { university: true } } },
    });

    return NextResponse.json({ application: app }, { status: 201 });
  } catch (error) {
    console.error("Application create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { applicationId, status, decision } = await request.json() as {
      applicationId: string;
      status?: ApplicationStatus;
      decision?: Decision;
    };

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId required" }, { status: 400 });
    }

    const app = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
    });
    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      if (status === "applied") updateData.appliedDate = new Date();
    }
    if (decision) updateData.decision = decision;

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: updateData,
      include: { program: { include: { university: true } } },
    });

    return NextResponse.json({ application: updated });
  } catch (error) {
    console.error("Application update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { applicationId } = await request.json();
    if (!applicationId) {
      return NextResponse.json({ error: "applicationId required" }, { status: 400 });
    }

    const app = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
    });
    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.application.delete({ where: { id: applicationId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Application delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
