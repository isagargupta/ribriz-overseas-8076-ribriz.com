import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getUser } from "@/lib/supabase/auth";
import { prisma } from "@/lib/db";
import { formatDeadline, formatTuition } from "@/lib/scoring";
import { getUniversityLogoUrl } from "@/lib/university-logo";

const statusLabels: Record<string, { label: string; color: string; icon: string }> = {
  not_started: { label: "Not Started", color: "text-secondary bg-surface-container", icon: "play_circle" },
  docs_pending: { label: "Docs Pending", color: "text-secondary bg-secondary/10", icon: "folder_open" },
  sop_pending: { label: "SOP Pending", color: "text-primary bg-primary-container/20", icon: "edit_note" },
  ready: { label: "Ready to Apply", color: "text-tertiary bg-tertiary-fixed/10", icon: "fact_check" },
  applied: { label: "Applied", color: "text-primary bg-primary-container/20", icon: "send" },
  decision: { label: "Decision", color: "text-on-surface bg-surface-container-highest", icon: "gavel" },
  enrolled: { label: "Enrolled", color: "text-tertiary bg-tertiary-fixed/10", icon: "celebration" },
};

const decisionLabels: Record<string, { label: string; color: string }> = {
  accepted: { label: "Accepted", color: "text-tertiary bg-tertiary-fixed/10" },
  rejected: { label: "Rejected", color: "text-error bg-error/10" },
  waitlisted: { label: "Waitlisted", color: "text-secondary bg-secondary/10" },
};

export default async function WorkspacesPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    include: {
      program: { include: { university: true } },
      sopDrafts: { orderBy: { updatedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch document counts
  const allDocs = await prisma.document.findMany({
    where: { userId: user.id },
    select: { status: true, isRequired: true },
  });

  const requiredDocs = allDocs.filter((d) => d.isRequired);
  const completedDocs = requiredDocs.filter(
    (d) => d.status === "uploaded" || d.status === "verified"
  );
  const globalDocProgress =
    requiredDocs.length > 0
      ? Math.round((completedDocs.length / requiredDocs.length) * 100)
      : 0;

  // Stats
  const totalApps = applications.length;
  const appliedCount = applications.filter(
    (a) => a.status === "applied" || a.status === "decision" || a.status === "enrolled"
  ).length;
  const acceptedCount = applications.filter((a) => a.decision === "accepted").length;
  const avgScore =
    totalApps > 0
      ? Math.round(
          applications.reduce((sum, a) => sum + (a.matchScore ?? 0), 0) / totalApps
        )
      : 0;

  return (
    <main className="flex-1 p-8 lg:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-on-surface tracking-tight mb-2">
            My Workspaces
          </h1>
          <p className="text-secondary text-lg">
            All your university applications in one place. Track progress, manage
            documents, and stay on top of deadlines.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface-container-lowest p-5 rounded-xl editorial-shadow text-center">
            <p className="text-3xl font-bold font-headline text-on-surface">
              {totalApps}
            </p>
            <p className="text-xs text-secondary uppercase tracking-widest mt-1">
              Applications
            </p>
          </div>
          <div className="bg-surface-container-lowest p-5 rounded-xl editorial-shadow text-center">
            <p className="text-3xl font-bold font-headline text-on-surface">
              {appliedCount}
            </p>
            <p className="text-xs text-secondary uppercase tracking-widest mt-1">
              Submitted
            </p>
          </div>
          <div className="bg-surface-container-lowest p-5 rounded-xl editorial-shadow text-center">
            <p className="text-3xl font-bold font-headline text-tertiary">
              {acceptedCount}
            </p>
            <p className="text-xs text-secondary uppercase tracking-widest mt-1">
              Accepted
            </p>
          </div>
          <div className="bg-surface-container-lowest p-5 rounded-xl editorial-shadow text-center">
            <p className="text-3xl font-bold font-headline text-on-surface">
              {globalDocProgress}%
            </p>
            <p className="text-xs text-secondary uppercase tracking-widest mt-1">
              Docs Ready
            </p>
          </div>
        </div>

        {/* Application Cards */}
        {applications.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-16 text-center editorial-shadow">
            <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">
              workspaces
            </span>
            <h3 className="text-xl font-bold text-on-surface mb-2">
              No workspaces yet
            </h3>
            <p className="text-sm text-secondary mb-6 max-w-md mx-auto">
              Start by finding universities that match your profile, then click
              &quot;Apply Now&quot; to create your first application workspace.
            </p>
            <Link
              href="/universities"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-sm">school</span>
              Find Universities
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const { program } = app;
              const university = program.university;
              const status = statusLabels[app.status] ?? statusLabels.not_started;
              const decision = app.decision
                ? decisionLabels[app.decision]
                : null;
              const latestSop = app.sopDrafts[0] ?? null;
              const logoUrl = getUniversityLogoUrl(
                university.logoUrl,
                university.websiteUrl
              );

              const deadline = program.applicationDeadline;
              const daysLeft = deadline
                ? Math.max(
                    0,
                    Math.ceil(
                      (new Date(deadline).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24)
                    )
                  )
                : null;

              // Compute progress for this application
              const sopDone = latestSop ? latestSop.wordCount >= 800 : false;
              const progress = Math.round(
                (globalDocProgress * 0.4 + (sopDone ? 100 : 0) * 0.3 + 30)
              );

              return (
                <Link
                  key={app.id}
                  href={`/applications/${app.id}`}
                  className="block bg-surface-container-lowest rounded-xl editorial-shadow hover:shadow-lg transition-shadow group"
                >
                  <div className="p-6 flex flex-col md:flex-row gap-5">
                    {/* Logo */}
                    <div className="w-14 h-14 bg-surface-container rounded-lg flex items-center justify-center shrink-0">
                      {logoUrl ? (
                        <Image
                          src={logoUrl}
                          alt={university.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 object-contain"
                          unoptimized
                        />
                      ) : (
                        <span className="material-symbols-outlined text-2xl text-outline-variant">
                          school
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                            {university.name}
                          </h3>
                          <p className="text-sm text-secondary truncate">
                            {program.name} &middot; {university.city},{" "}
                            {university.country}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {decision ? (
                            <span
                              className={`text-xs font-bold px-3 py-1 rounded-full ${decision.color}`}
                            >
                              {decision.label}
                            </span>
                          ) : (
                            <span
                              className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${status.color}`}
                            >
                              <span className="material-symbols-outlined text-xs">
                                {status.icon}
                              </span>
                              {status.label}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress + Stats Row */}
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3">
                        {/* Progress bar */}
                        <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                          <div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                progress >= 80
                                  ? "bg-tertiary"
                                  : progress >= 40
                                  ? "bg-primary"
                                  : "bg-error"
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-secondary whitespace-nowrap">
                            {progress}%
                          </span>
                        </div>

                        {/* Match Score */}
                        {app.matchScore != null && (
                          <div className="flex items-center gap-1.5 text-xs text-secondary">
                            <span className="material-symbols-outlined text-xs">
                              analytics
                            </span>
                            <span>Match: {Math.round(app.matchScore)}%</span>
                          </div>
                        )}

                        {/* Tuition */}
                        <div className="flex items-center gap-1.5 text-xs text-secondary">
                          <span className="material-symbols-outlined text-xs">
                            payments
                          </span>
                          <span>
                            {formatTuition(
                              program.tuitionAnnual,
                              program.tuitionCurrency
                            )}
                          </span>
                        </div>

                        {/* Deadline */}
                        {daysLeft != null && (
                          <div
                            className={`flex items-center gap-1.5 text-xs ${
                              daysLeft <= 30 ? "text-error font-bold" : "text-secondary"
                            }`}
                          >
                            <span className="material-symbols-outlined text-xs">
                              event
                            </span>
                            <span>
                              {daysLeft <= 0
                                ? "Deadline passed"
                                : `${daysLeft}d left`}
                            </span>
                          </div>
                        )}

                        {/* SOP Status */}
                        <div className="flex items-center gap-1.5 text-xs text-secondary">
                          <span className="material-symbols-outlined text-xs">
                            edit_note
                          </span>
                          <span>
                            SOP:{" "}
                            {latestSop
                              ? latestSop.wordCount >= 800
                                ? "Done"
                                : `${latestSop.wordCount}w`
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="hidden md:flex items-center">
                      <span className="material-symbols-outlined text-secondary group-hover:text-primary transition-colors">
                        chevron_right
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Find more universities CTA */}
        {applications.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              href="/universities"
              className="inline-flex items-center gap-2 px-6 py-3 bg-surface-container text-on-surface font-semibold rounded-xl hover:bg-surface-container-highest transition-colors"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Add More Universities
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
