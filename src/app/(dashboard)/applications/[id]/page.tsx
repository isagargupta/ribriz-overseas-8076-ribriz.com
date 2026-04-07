import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getUser } from "@/lib/supabase/auth";
import { prisma } from "@/lib/db";
import {
  generateAdmissionAudit,
  formatDeadline,
  formatTuition,
} from "@/lib/scoring";
import { getUniversityLogoUrl } from "@/lib/university-logo";
import {
  StatusUpdateButton,
  ApplicationNotes,
  DeleteApplicationButton,
} from "@/components/ui/workspace-actions";
import { DocumentGeneratorPanel } from "@/components/ui/doc-generator-btn";

/* ── Status Pipeline ─────────────────────────────────── */

const STATUS_STEPS = [
  { key: "not_started", label: "Start", icon: "play_circle" },
  { key: "docs_pending", label: "Documents", icon: "folder_open" },
  { key: "sop_pending", label: "SOP & LORs", icon: "edit_note" },
  { key: "ready", label: "Review", icon: "fact_check" },
  { key: "applied", label: "Applied", icon: "send" },
  { key: "decision", label: "Decision", icon: "gavel" },
] as const;

function getStatusIndex(status: string): number {
  return STATUS_STEPS.findIndex((s) => s.key === status);
}

/* ── Timeline Generator ──────────────────────────────── */

interface TimelineItem {
  month: string;
  tasks: string[];
  status: "done" | "current" | "upcoming";
}

function generateTimeline(
  deadline: Date | null,
  requiresSop: boolean,
  lorCount: number,
  hasGre: boolean,
  hasIelts: boolean,
  country: string
): TimelineItem[] {
  const items: TimelineItem[] = [];
  const now = new Date();
  const deadlineDate = deadline ? new Date(deadline) : null;

  // Calculate months until deadline
  const monthsLeft = deadlineDate
    ? Math.max(
        0,
        (deadlineDate.getFullYear() - now.getFullYear()) * 12 +
          deadlineDate.getMonth() -
          now.getMonth()
      )
    : 6;

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  if (monthsLeft >= 6) {
    // Phase 1: Research & Test Prep (now)
    const phase1Tasks = ["Research program requirements", "Verify document checklist"];
    if (!hasIelts) phase1Tasks.push("Book IELTS/TOEFL test date");
    if (!hasGre) phase1Tasks.push("Start GRE/GMAT preparation");
    items.push({ month: fmt(now), tasks: phase1Tasks, status: "current" });

    // Phase 2: Tests (month 2-3)
    const m2 = new Date(now);
    m2.setMonth(m2.getMonth() + 2);
    const phase2Tasks = ["Take standardized tests"];
    if (country === "Germany") phase2Tasks.push("Apply for APS certificate");
    if (country === "Canada") phase2Tasks.push("Start WES credential evaluation");
    items.push({ month: fmt(m2), tasks: phase2Tasks, status: "upcoming" });

    // Phase 3: Documents (month 3-4)
    const m3 = new Date(now);
    m3.setMonth(m3.getMonth() + 3);
    const phase3Tasks = ["Collect all academic documents", "Get transcripts attested"];
    if (lorCount > 0) phase3Tasks.push(`Request ${lorCount} LOR(s) from recommenders`);
    items.push({ month: fmt(m3), tasks: phase3Tasks, status: "upcoming" });

    // Phase 4: SOP (month 4-5)
    const m4 = new Date(now);
    m4.setMonth(m4.getMonth() + 4);
    const phase4Tasks: string[] = [];
    if (requiresSop) phase4Tasks.push("Write program-specific SOP (draft 1)");
    phase4Tasks.push("Build tailored resume/CV");
    phase4Tasks.push("Get SOP reviewed by mentor/counselor");
    items.push({ month: fmt(m4), tasks: phase4Tasks, status: "upcoming" });

    // Phase 5: Apply (month 5-6)
    const m5 = new Date(now);
    m5.setMonth(m5.getMonth() + 5);
    const phase5Tasks = [
      "Final review of all documents",
      "Submit application on university portal",
      "Pay application fee",
    ];
    if (country === "Germany") phase5Tasks.push("Submit via uni-assist portal");
    items.push({ month: fmt(m5), tasks: phase5Tasks, status: "upcoming" });
  } else if (monthsLeft >= 3) {
    // Compressed timeline
    const phase1Tasks = ["Gather all documents immediately"];
    if (!hasIelts) phase1Tasks.push("Book earliest IELTS/TOEFL slot");
    if (lorCount > 0) phase1Tasks.push(`Request ${lorCount} LOR(s) urgently`);
    items.push({ month: fmt(now), tasks: phase1Tasks, status: "current" });

    const m1 = new Date(now);
    m1.setMonth(m1.getMonth() + 1);
    const phase2Tasks: string[] = [];
    if (requiresSop) phase2Tasks.push("Write and finalize SOP");
    phase2Tasks.push("Build resume/CV", "Complete document checklist");
    items.push({ month: fmt(m1), tasks: phase2Tasks, status: "upcoming" });

    const m2 = new Date(now);
    m2.setMonth(m2.getMonth() + 2);
    items.push({
      month: fmt(m2),
      tasks: ["Final review", "Submit application", "Pay fee"],
      status: "upcoming",
    });
  } else {
    // Urgent
    items.push({
      month: fmt(now),
      tasks: [
        "URGENT: Gather all documents",
        requiresSop ? "Write SOP immediately" : "Prepare application",
        lorCount > 0 ? `Get ${lorCount} LOR(s) — express request` : "Finalize resume",
        "Submit application ASAP",
      ],
      status: "current",
    });
  }

  return items;
}

/* ── Page ─────────────────────────────────────────────── */

export default async function ApplicationWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/login");

  const application = await prisma.application.findFirst({
    where: { id, userId: user.id },
    include: {
      program: { include: { university: true } },
      sopDrafts: { orderBy: { updatedAt: "desc" }, take: 1 },
      appDocuments: { orderBy: { updatedAt: "desc" } },
    },
  });

  if (!application) notFound();

  const { program } = application;
  const prog = program as Record<string, unknown>;

  // Fetch student data
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { academicProfile: true, preferences: true },
  });

  if (!dbUser?.academicProfile || !dbUser?.preferences) redirect("/onboarding");

  // Fetch documents for this user
  const documents = await prisma.document.findMany({
    where: { userId: user.id },
    orderBy: { category: "asc" },
  });

  // Generate audit for probability
  const audit = generateAdmissionAudit(
    dbUser.academicProfile,
    dbUser.preferences,
    program
  );

  // Logo
  const universityLogoUrl = getUniversityLogoUrl(
    program.university.logoUrl,
    program.university.websiteUrl
  );

  // Document stats
  const requiredDocs = documents.filter((d) => d.isRequired);
  const completedDocs = requiredDocs.filter(
    (d) => d.status === "uploaded" || d.status === "verified"
  );
  const docProgress =
    requiredDocs.length > 0
      ? Math.round((completedDocs.length / requiredDocs.length) * 100)
      : 0;

  // Group documents by category
  const docsByCategory = documents.reduce(
    (acc, doc) => {
      const cat = doc.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(doc);
      return acc;
    },
    {} as Record<string, typeof documents>
  );

  const categoryLabels: Record<string, string> = {
    academic: "Academic Documents",
    test_scores: "Test Score Reports",
    identity: "Identity & Travel",
    financial: "Financial Documents",
    application: "Application Materials",
  };

  const categoryIcons: Record<string, string> = {
    academic: "school",
    test_scores: "quiz",
    identity: "badge",
    financial: "account_balance",
    application: "description",
  };

  // Status pipeline
  const currentStep = getStatusIndex(application.status);

  // SOP status
  const latestSop = application.sopDrafts[0] ?? null;
  const sopStatus = latestSop
    ? latestSop.wordCount >= 800
      ? "Complete"
      : `Draft (${latestSop.wordCount} words)`
    : "Not started";

  // LOR info
  const lorCount = (prog.requiresLor as number | null) ?? 0;
  const lorDocs = documents.filter((d) => d.name.startsWith("Letter of Recommendation"));
  const lorsComplete = lorDocs.filter(
    (d) => d.status === "uploaded" || d.status === "verified"
  ).length;

  // Deadline info
  const deadline = program.applicationDeadline;
  const deadlineStr = formatDeadline(deadline);
  const daysLeft = deadline
    ? Math.max(
        0,
        Math.ceil(
          (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : null;

  // Timeline
  const timeline = generateTimeline(
    deadline,
    (prog.requiresSop as boolean) !== false,
    lorCount,
    dbUser.academicProfile.ieltsScore != null ||
      dbUser.academicProfile.toeflScore != null ||
      dbUser.academicProfile.pteScore != null,
    dbUser.academicProfile.greScore != null ||
      dbUser.academicProfile.gmatScore != null,
    program.university.country
  );

  // Overall progress
  const overallProgress = Math.round(
    (docProgress * 0.4 +
      (sopStatus === "Complete" ? 100 : sopStatus === "Not started" ? 0 : 50) * 0.3 +
      (lorCount > 0 ? (lorsComplete / lorCount) * 100 : 100) * 0.2 +
      (currentStep >= 3 ? 100 : 0) * 0.1)
  );

  return (
    <main className="flex-1 p-8 lg:p-12">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto mb-8">
        <Link
          href="/workspaces"
          className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary transition-colors mb-4"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          All Workspaces
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-surface-container rounded-xl flex items-center justify-center shrink-0">
              {universityLogoUrl ? (
                <Image
                  src={universityLogoUrl}
                  alt={program.university.name}
                  width={48}
                  height={48}
                  className="w-12 h-12 object-contain"
                  unoptimized
                />
              ) : (
                <span className="material-symbols-outlined text-3xl text-outline-variant">
                  school
                </span>
              )}
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold text-on-surface tracking-tight">
                {program.university.name}
              </h1>
              <p className="text-secondary text-lg">
                {program.name} &middot; {program.university.city},{" "}
                {program.university.country}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4">
            {/* Admission Probability */}
            <div className="bg-surface-container-lowest px-5 py-3 rounded-xl editorial-shadow text-center">
              <p className="text-2xl font-bold font-headline text-on-surface">
                {audit.admissionProbability.low}–{audit.admissionProbability.high}%
              </p>
              <p className="text-[10px] uppercase tracking-widest text-secondary">
                Admission Chance
              </p>
            </div>
            {/* Deadline */}
            {daysLeft != null && (
              <div
                className={`px-5 py-3 rounded-xl text-center ${
                  daysLeft <= 30
                    ? "bg-error/10 border border-error/20"
                    : "bg-surface-container-lowest editorial-shadow"
                }`}
              >
                <p
                  className={`text-2xl font-bold font-headline ${
                    daysLeft <= 30 ? "text-error" : "text-on-surface"
                  }`}
                >
                  {daysLeft}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-secondary">
                  Days Left
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status Pipeline ────────────────────────────── */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-surface-container-lowest p-6 rounded-xl editorial-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold font-headline flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">
                linear_scale
              </span>
              Application Progress
            </h3>
            <span className="text-sm font-bold text-primary">{overallProgress}% Complete</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-surface-container-low rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-gradient-to-r from-primary to-tertiary rounded-full transition-all"
              style={{ width: `${overallProgress}%` }}
            />
          </div>

          {/* Steps */}
          <div className="flex justify-between">
            {STATUS_STEPS.map((step, idx) => {
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;
              return (
                <div key={step.key} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                      isCompleted
                        ? "bg-primary text-on-primary"
                        : isCurrent
                        ? "bg-primary-container text-primary ring-2 ring-primary"
                        : "bg-surface-container text-secondary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {isCompleted ? "check" : step.icon}
                    </span>
                  </div>
                  <p
                    className={`text-xs font-semibold ${
                      isCurrent ? "text-primary" : isCompleted ? "text-on-surface" : "text-secondary"
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main Grid ──────────────────────────────────── */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Documents + SOP + LOR */}
        <div className="lg:col-span-2 space-y-8">
          {/* ── Document Checklist ──────────────────────── */}
          <div className="bg-surface-container-lowest p-8 rounded-xl editorial-shadow">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold font-headline flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">
                  checklist
                </span>
                Document Checklist
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-primary">
                  {completedDocs.length}/{requiredDocs.length} Ready
                </span>
                <Link
                  href="/documents"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  Manage <span className="material-symbols-outlined text-xs">open_in_new</span>
                </Link>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden mb-6">
              <div
                className={`h-full rounded-full transition-all ${
                  docProgress >= 80
                    ? "bg-tertiary"
                    : docProgress >= 50
                    ? "bg-primary"
                    : "bg-error"
                }`}
                style={{ width: `${docProgress}%` }}
              />
            </div>

            {/* Documents by category */}
            <div className="space-y-6">
              {Object.entries(docsByCategory).map(([category, docs]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-secondary text-lg">
                      {categoryIcons[category] ?? "folder"}
                    </span>
                    <p className="text-sm font-bold text-on-surface">
                      {categoryLabels[category] ?? category}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {docs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between px-4 py-3 bg-surface-container-low rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`material-symbols-outlined text-sm ${
                              doc.status === "verified"
                                ? "text-tertiary"
                                : doc.status === "uploaded"
                                ? "text-primary"
                                : doc.status === "in_progress"
                                ? "text-secondary"
                                : "text-outline-variant"
                            }`}
                          >
                            {doc.status === "verified"
                              ? "verified"
                              : doc.status === "uploaded"
                              ? "check_circle"
                              : doc.status === "in_progress"
                              ? "pending"
                              : "radio_button_unchecked"}
                          </span>
                          <span className="text-sm text-on-surface">{doc.name}</span>
                          {doc.isRequired && doc.status === "not_started" && (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-error bg-error/10 px-1.5 py-0.5 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-xs font-semibold capitalize ${
                            doc.status === "verified"
                              ? "text-tertiary"
                              : doc.status === "uploaded"
                              ? "text-primary"
                              : "text-secondary"
                          }`}
                        >
                          {doc.status.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Application Documents (Unified Engine) ──── */}
          <div className="bg-surface-container-lowest p-8 rounded-xl editorial-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold font-headline flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">
                  description
                </span>
                Application Documents
              </h3>
              <span className="text-xs font-semibold text-secondary">
                {application.appDocuments.filter((d) => d.isComplete).length}/
                {application.appDocuments.length} complete
              </span>
            </div>
            <p className="text-sm text-secondary mb-5">
              Every document is tied to {program.university.name} &mdash; {program.name}.
              Click to create or continue editing. Auto-saves as you type.
            </p>

            <DocumentGeneratorPanel
              applicationId={application.id}
              existingDocs={application.appDocuments.map((d) => ({
                id: d.id,
                type: d.type,
                title: d.title,
                wordCount: d.wordCount,
                isComplete: d.isComplete,
                lastEditedAt: d.lastEditedAt.toISOString(),
              }))}
            />

            <div className="mt-5 p-3 bg-secondary/5 rounded-lg border border-secondary/10">
              <p className="text-xs text-secondary flex items-start gap-2">
                <span className="material-symbols-outlined text-xs mt-0.5">info</span>
                AI assists your writing but does NOT write for you. Use &quot;Generate Draft&quot; for
                structure, then rewrite in your own voice. Press Tab for inline autocomplete.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right Column ─────────────────────────────── */}
        <div className="space-y-8">
          {/* Application Timeline / Roadmap */}
          <div className="bg-surface-container-lowest p-6 rounded-xl editorial-shadow">
            <h3 className="text-lg font-bold font-headline mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">
                timeline
              </span>
              Your Application Timeline
            </h3>

            {deadlineStr !== "Rolling" && (
              <div
                className={`mb-5 p-3 rounded-lg text-center ${
                  daysLeft != null && daysLeft <= 30
                    ? "bg-error/10"
                    : "bg-surface-container-low"
                }`}
              >
                <p className="text-xs text-secondary">Deadline</p>
                <p
                  className={`text-sm font-bold ${
                    daysLeft != null && daysLeft <= 30
                      ? "text-error"
                      : "text-on-surface"
                  }`}
                >
                  {deadlineStr}
                </p>
              </div>
            )}

            <div className="space-y-0">
              {timeline.map((item, idx) => (
                <div key={idx} className="flex gap-3">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        item.status === "done"
                          ? "bg-tertiary"
                          : item.status === "current"
                          ? "bg-primary ring-2 ring-primary/30"
                          : "bg-surface-container-highest"
                      }`}
                    />
                    {idx < timeline.length - 1 && (
                      <div className="w-px h-full bg-surface-container-highest min-h-[40px]" />
                    )}
                  </div>

                  <div className="pb-5">
                    <p
                      className={`text-xs font-bold mb-1 ${
                        item.status === "current"
                          ? "text-primary"
                          : "text-secondary"
                      }`}
                    >
                      {item.month}
                    </p>
                    <div className="space-y-1">
                      {item.tasks.map((task, tIdx) => (
                        <p
                          key={tIdx}
                          className={`text-xs leading-relaxed ${
                            item.status === "done"
                              ? "text-secondary line-through"
                              : "text-on-surface"
                          }`}
                        >
                          {task}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Program Quick Facts */}
          <div className="bg-on-surface text-white p-6 rounded-xl editorial-shadow overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container opacity-20 blur-3xl -mr-16 -mt-16" />
            <h3 className="text-sm font-bold font-headline mb-4 border-b border-secondary/30 pb-3">
              Program Details
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary-container">Tuition</span>
                <span className="font-bold">
                  {formatTuition(program.tuitionAnnual, program.tuitionCurrency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-container">Duration</span>
                <span className="font-bold">{program.durationMonths} months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-container">Deadline</span>
                <span className="font-bold">{deadlineStr}</span>
              </div>
              {program.applicationFee != null && program.applicationFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-secondary-container">App Fee</span>
                  <span className="font-bold">
                    {program.applicationFeeCcy ?? ""} {program.applicationFee}
                  </span>
                </div>
              )}
              {program.scholarshipsCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-secondary-container">Scholarships</span>
                  <span className="font-bold">{program.scholarshipsCount} available</span>
                </div>
              )}
            </div>
          </div>

          {/* Update Status */}
          <div className="bg-surface-container-lowest p-6 rounded-xl editorial-shadow">
            <h3 className="text-sm font-bold font-headline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">
                update
              </span>
              Update Progress
            </h3>

            {/* Decision badge if exists */}
            {application.decision && (
              <div className={`mb-4 p-3 rounded-lg text-center ${
                application.decision === "accepted" ? "bg-tertiary-fixed/10" :
                application.decision === "rejected" ? "bg-error/10" :
                "bg-secondary/10"
              }`}>
                <p className={`text-lg font-bold ${
                  application.decision === "accepted" ? "text-tertiary" :
                  application.decision === "rejected" ? "text-error" :
                  "text-secondary"
                }`}>
                  {application.decision === "accepted" ? "Accepted!" :
                   application.decision === "rejected" ? "Rejected" :
                   "Waitlisted"}
                </p>
              </div>
            )}

            <StatusUpdateButton
              applicationId={application.id}
              currentStatus={application.status}
            />
          </div>

          {/* Notes */}
          <div className="bg-surface-container-lowest p-6 rounded-xl editorial-shadow">
            <ApplicationNotes
              applicationId={application.id}
              initialNotes={application.notes}
            />
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href={`/universities/${program.id}`}
              className="w-full px-4 py-3 bg-surface-container-lowest rounded-xl font-semibold text-sm text-center flex items-center justify-center gap-2 hover:bg-surface-container transition-colors editorial-shadow"
            >
              <span className="material-symbols-outlined text-sm">analytics</span>
              View Admission Audit
            </Link>

            {program.applicationUrl && (
              <a
                href={program.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-4 py-3 bg-primary text-on-primary rounded-xl font-semibold text-sm text-center flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                Go to University Application Portal
              </a>
            )}

            {program.university.applicationPortalUrl &&
              program.university.applicationPortalUrl !== program.applicationUrl && (
                <a
                  href={program.university.applicationPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-3 bg-surface-container text-on-surface rounded-xl font-semibold text-sm text-center flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">language</span>
                  University Website
                </a>
              )}
          </div>

          {/* Delete */}
          <DeleteApplicationButton applicationId={application.id} />

          {/* Legal disclaimer */}
          <div className="p-4 bg-surface-container-low rounded-lg">
            <p className="text-[10px] text-secondary leading-relaxed">
              This workspace helps you organize your application. We do not submit
              applications on your behalf — you must apply directly on the
              university&apos;s official portal. We optimize your chances through
              structure and guidance, not guarantees.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
