import { Sparkles } from "lucide-react";
import { getUser } from "@/lib/supabase/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { computeMatchScore, getBadge } from "@/lib/scoring";
import { getUniversityLogoUrl } from "@/lib/university-logo";
import { fetchExternalPrograms } from "@/lib/external-university-api";
import { ExportRoadmapButton } from "@/components/ui/export-roadmap-btn";
import { DashboardUpsellSection } from "@/components/dashboard/upsell-section";
import { DashboardUpgradeCTA } from "@/components/dashboard/upgrade-cta";
import {
  AnimatedNumber,
  LivePulse,
  RelativeTime,
  AutoRefresh,
  DeadlineCountdown,
  ProfileRing,
  UniversityLogo,
} from "@/components/dashboard/live-indicators";

/* ── Helpers ────────────────────────────────────────────── */

function computeProfileStrength(dbUser: {
  phone: string | null;
  city: string | null;
  dob: Date | null;
  nationality: string | null;
  passportNumber: string | null;
  academicProfile: {
    ieltsScore: number | null;
    toeflScore: number | null;
    pteScore: number | null;
    greScore: number | null;
    gmatScore: number | null;
    gpa: number;
    workExperienceMonths: number;
    tenthPercentage: number | null;
    twelfthPercentage: number | null;
  } | null;
  preferences: object | null;
  financialProfile: object | null;
}): { total: number; items: { label: string; done: boolean; icon: string }[] } {
  const items = [
    { label: "Phone number", done: !!dbUser.phone, icon: "phone" },
    { label: "City & Location", done: !!dbUser.city, icon: "location_on" },
    { label: "Date of birth", done: !!dbUser.dob, icon: "cake" },
    { label: "Nationality", done: !!dbUser.nationality, icon: "flag" },
    { label: "Passport details", done: !!dbUser.passportNumber, icon: "badge" },
    { label: "Academic profile", done: !!dbUser.academicProfile, icon: "school" },
    {
      label: "10th & 12th scores",
      done: !!(
        dbUser.academicProfile?.tenthPercentage &&
        dbUser.academicProfile?.twelfthPercentage
      ),
      icon: "grade",
    },
    {
      label: "English proficiency",
      done: !!(
        dbUser.academicProfile?.ieltsScore ||
        dbUser.academicProfile?.toeflScore ||
        dbUser.academicProfile?.pteScore
      ),
      icon: "translate",
    },
    {
      label: "GRE / GMAT scores",
      done: !!(
        dbUser.academicProfile?.greScore || dbUser.academicProfile?.gmatScore
      ),
      icon: "quiz",
    },
    { label: "Study preferences", done: !!dbUser.preferences, icon: "tune" },
    { label: "Financial profile", done: !!dbUser.financialProfile, icon: "account_balance" },
  ];
  const filled = items.filter((i) => i.done).length;
  return { total: Math.round((filled / items.length) * 100), items };
}

function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDeadline(date: Date | null): string {
  if (!date) return "TBD";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function getPriorityStyle(days: number) {
  if (days <= 14)
    return {
      label: "URGENT",
      badge: "bg-error-container text-on-error-container",
      dot: "bg-error",
      text: "text-error",
    };
  if (days <= 30)
    return {
      label: "SOON",
      badge: "bg-secondary-container text-on-secondary-container",
      dot: "bg-secondary",
      text: "text-secondary",
    };
  return {
    label: "ON TRACK",
    badge: "bg-surface-container-high text-on-surface-variant",
    dot: "bg-outline",
    text: "text-outline",
  };
}

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  docs_pending: "Docs Pending",
  sop_pending: "SOP Pending",
  ready: "Ready to Submit",
  applied: "Applied",
  decision: "Decision",
  enrolled: "Enrolled",
};

const STATUS_COLORS: Record<string, string> = {
  not_started: "bg-surface-container-high text-on-surface-variant",
  docs_pending: "bg-secondary-container text-on-secondary-container",
  sop_pending: "bg-tertiary-fixed text-on-tertiary-fixed",
  ready: "bg-primary-container text-on-primary-container",
  applied: "bg-primary text-on-primary",
  decision: "bg-secondary text-on-secondary",
  enrolled: "bg-tertiary text-on-tertiary",
};

function getGrade(strength: number) {
  if (strength >= 90) return { grade: "A+", label: "EXCEPTIONAL" };
  if (strength >= 80) return { grade: "A-", label: "COMPETITIVE" };
  if (strength >= 70) return { grade: "B+", label: "STRONG" };
  if (strength >= 60) return { grade: "B", label: "GOOD" };
  return { grade: "C+", label: "DEVELOPING" };
}

/* ── Page ────────────────────────────────────────────────── */

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      academicProfile: true,
      preferences: true,
      financialProfile: true,
      applications: {
        include: {
          program: { include: { university: true } },
          appDocuments: true,
          sopDrafts: true,
        },
        orderBy: { createdAt: "desc" },
      },
      documents: true,
      alerts: {
        where: { isDismissed: false },
        orderBy: { createdAt: "desc" },
        take: 6,
      },
    },
  });

  if (!dbUser || !dbUser.onboardingComplete) {
    const firstName =
      user.user_metadata?.full_name?.split(" ")[0] ||
      user.email?.split("@")[0] ||
      "there";

    return (
      <div className="p-8 max-w-[1400px] mx-auto w-full flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-24 h-24 rounded-xl bg-primary-fixed flex items-center justify-center mb-8">
          <Sparkles size={36} className="text-primary" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-on-surface mb-4 font-headline">
          Welcome, {firstName}!
        </h2>
        <p className="text-on-surface-variant text-lg max-w-md mb-12 leading-relaxed font-body font-medium">
          Complete your profile so we can start matching you with global
          opportunities.
        </p>
        <Link
          href="/onboarding"
          className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-8 py-4 text-sm font-semibold rounded-md shadow-sm hover:opacity-90 transition-all flex items-center gap-3"
        >
          <Sparkles size={20} />
          Launch Your Profile
        </Link>
      </div>
    );
  }

  /* ── Compute all real data ──────────────────────────── */

  const firstName = dbUser.name.split(" ")[0];
  const profile = computeProfileStrength(dbUser);
  const { grade, label: gradeLabel } = getGrade(profile.total);

  // Application pipeline counts
  const appStatusCounts: Record<string, number> = {};
  for (const app of dbUser.applications) {
    appStatusCounts[app.status] = (appStatusCounts[app.status] || 0) + 1;
  }
  const totalApps = dbUser.applications.length;
  const appliedCount = dbUser.applications.filter(
    (a) => a.status === "applied" || a.status === "decision" || a.status === "enrolled"
  ).length;
  const acceptedCount = dbUser.applications.filter(
    (a) => a.decision === "accepted"
  ).length;
  const waitlistedCount = dbUser.applications.filter(
    (a) => a.decision === "waitlisted"
  ).length;

  // Document readiness
  const totalDocs = dbUser.documents.length;
  const uploadedDocs = dbUser.documents.filter(
    (d) => d.status === "uploaded" || d.status === "verified"
  ).length;
  const verifiedDocs = dbUser.documents.filter(
    (d) => d.status === "verified"
  ).length;
  const pendingDocs = dbUser.documents.filter(
    (d) => d.status === "not_started" || d.status === "in_progress"
  ).length;

  // SOP progress
  const totalAppsNeedingSop = dbUser.applications.filter(
    (a) => a.program.requiresSop
  ).length;
  const sopsWritten = dbUser.applications.filter(
    (a) => a.sopDrafts.length > 0 || a.appDocuments.some((d) => d.type === "sop" && d.isComplete)
  ).length;

  // Test scores summary
  const ac = dbUser.academicProfile;
  const testScores: { name: string; score: string | null; required: boolean; status: "done" | "missing" | "low" }[] = [];
  if (ac) {
    testScores.push({
      name: "IELTS",
      score: ac.ieltsScore != null ? `${ac.ieltsScore}` : null,
      required: true,
      status: ac.ieltsScore != null ? (ac.ieltsScore >= 6.5 ? "done" : "low") : "missing",
    });
    testScores.push({
      name: "TOEFL",
      score: ac.toeflScore != null ? `${ac.toeflScore}` : null,
      required: !ac.ieltsScore,
      status: ac.toeflScore != null ? (ac.toeflScore >= 90 ? "done" : "low") : "missing",
    });
    testScores.push({
      name: "GRE",
      score: ac.greScore != null ? `${ac.greScore}` : null,
      required: false,
      status: ac.greScore != null ? (ac.greScore >= 310 ? "done" : "low") : "missing",
    });
    testScores.push({
      name: "GMAT",
      score: ac.gmatScore != null ? `${ac.gmatScore}` : null,
      required: false,
      status: ac.gmatScore != null ? (ac.gmatScore >= 650 ? "done" : "low") : "missing",
    });
  }

  // Top university matches — now with logo URLs
  let topMatches: {
    id: string;
    programId: string;
    name: string;
    country: string;
    city: string;
    course: string;
    score: number;
    badge: string;
    badgeColor: string;
    deadline: Date | null;
    rank: number | null;
    tuition: number;
    currency: string;
    scholarships: number;
    stemDesignated: boolean;
    coopInternship: boolean;
    acceptanceRate: number | null;
    logoUrl: string | null;
  }[] = [];

  if (ac && dbUser.preferences) {
    // Fetch from external API, fall back to local DB
    let programs: Awaited<ReturnType<typeof fetchExternalPrograms>>;
    try {
      programs = await fetchExternalPrograms({
        degreeLevel: dbUser.preferences.targetDegreeLevel,
        countries: dbUser.preferences.targetCountries,
        fieldSearch: dbUser.preferences.targetField || undefined,
        limit: 100,
      });
    } catch {
      programs = await prisma.program.findMany({
        where: {
          degreeLevel: dbUser.preferences.targetDegreeLevel,
          university: { country: { in: dbUser.preferences.targetCountries } },
        },
        include: { university: true },
      });
    }

    const scored = programs
      .map((p) => {
        const { score } = computeMatchScore(ac, dbUser.preferences!, p);
        const badge = getBadge(score);
        return {
          id: p.university.id,
          programId: p.id,
          name: p.university.name,
          country: p.university.country,
          city: p.university.city,
          course: p.name,
          score,
          badge: badge.label,
          badgeColor: badge.color,
          deadline: p.applicationDeadline,
          rank: p.university.qsRanking,
          tuition: p.tuitionAnnual,
          currency: p.tuitionCurrency,
          scholarships: p.scholarshipsCount,
          stemDesignated: p.stemDesignated,
          coopInternship: p.coopInternship,
          acceptanceRate: p.university.acceptanceRate,
          logoUrl: getUniversityLogoUrl(p.university.logoUrl, p.university.websiteUrl),
        };
      })
      .sort((a, b) => b.score - a.score);

    topMatches = scored.slice(0, 6);
  }

  // Upcoming deadlines from actual applications
  type DeadlineRow = {
    appId: string | null;
    university: string;
    program: string;
    country: string;
    deadline: string;
    daysLeft: number;
    priority: ReturnType<typeof getPriorityStyle>;
    status: string;
    matchScore: number | null;
    hasSop: boolean;
    docsCount: number;
    logoUrl: string | null;
  };

  const appDeadlines: DeadlineRow[] = [];
  for (const a of dbUser.applications) {
    if (a.status === "enrolled" || a.status === "decision") continue;
    const days = daysUntil(a.program.applicationDeadline);
    if (days == null || days < 0) continue;
    appDeadlines.push({
      appId: a.id,
      university: a.program.university.name,
      program: a.program.name,
      country: a.program.university.country,
      deadline: formatDeadline(a.program.applicationDeadline),
      daysLeft: days,
      priority: getPriorityStyle(days),
      status: a.status as string,
      matchScore: a.matchScore,
      hasSop: a.sopDrafts.length > 0 || a.appDocuments.some((d) => d.type === "sop"),
      docsCount: a.appDocuments.length,
      logoUrl: getUniversityLogoUrl(a.program.university.logoUrl, a.program.university.websiteUrl),
    });
  }
  appDeadlines.sort((a, b) => a.daysLeft - b.daysLeft);
  appDeadlines.splice(5);

  const deadlineRows: DeadlineRow[] =
    appDeadlines.length > 0
      ? appDeadlines
      : topMatches
          .filter((m) => {
            const d = daysUntil(m.deadline);
            return d != null && d > 0;
          })
          .map((m) => ({
            appId: null,
            university: m.name,
            program: m.course,
            country: m.country,
            deadline: formatDeadline(m.deadline),
            daysLeft: daysUntil(m.deadline)!,
            priority: getPriorityStyle(daysUntil(m.deadline)!),
            status: "not_started" as string,
            matchScore: m.score,
            hasSop: false,
            docsCount: 0,
            logoUrl: m.logoUrl,
          }))
          .slice(0, 5);

  // Target info
  const targetIntake = dbUser.preferences?.targetIntake || "Not set";
  const targetField = dbUser.preferences?.targetField || "Not set";
  const targetCountries = dbUser.preferences?.targetCountries || [];
  const targetDegree = dbUser.preferences?.targetDegreeLevel || "masters";

  // Alerts
  const alerts = dbUser.alerts;
  const unreadAlerts = alerts.filter((a) => !a.isRead).length;

  // Next closest deadline
  const nextDeadlineDays = deadlineRows.length > 0 ? deadlineRows[0].daysLeft : null;

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto pb-20 md:pb-8">
      <AutoRefresh intervalMs={120000} />

      {/* ── Header ──────────────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-on-surface-variant mb-1 uppercase tracking-widest">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-black text-on-surface tracking-tight">
              Welcome back, {firstName}
            </h2>
            <LivePulse />
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            {targetDegree === "masters" ? "Master's" : targetDegree === "mba" ? "MBA" : targetDegree === "phd" ? "PhD" : "Bachelor's"}
            {" · "}{targetField}
            {targetCountries.length > 0 && ` · ${targetCountries.slice(0, 2).join(", ")}${targetCountries.length > 2 ? ` +${targetCountries.length - 2}` : ""}`}
            {" · "}
            <span className="font-semibold text-primary">{targetIntake}</span>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <ExportRoadmapButton />
          <Link
            href="/riz-ai"
            className="bg-primary text-on-primary px-4 py-2 text-xs font-bold rounded-lg hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles size={13} />
            Ask Riz AI
          </Link>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Link href="/applications" className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-5 hover:border-primary/30 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-sm text-primary">school</span>
            </div>
            {appliedCount > 0 && (
              <span className="text-[10px] font-semibold text-primary">{appliedCount} submitted →</span>
            )}
          </div>
          <AnimatedNumber value={totalApps} className="text-4xl font-black text-on-surface" />
          <p className="text-xs text-on-surface-variant mt-1 font-medium">Applications</p>
        </Link>

        <Link href="/documents" className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-5 hover:border-primary/30 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-sm text-secondary">description</span>
            </div>
            {verifiedDocs > 0 && (
              <span className="text-[10px] font-semibold text-secondary">{verifiedDocs} verified →</span>
            )}
          </div>
          <div className="flex items-baseline gap-0.5">
            <AnimatedNumber value={uploadedDocs} className="text-4xl font-black text-on-surface" />
            <span className="text-xl font-medium text-on-surface-variant">/{totalDocs || 0}</span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1 font-medium">Documents Ready</p>
        </Link>

        <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-sm text-tertiary">emoji_events</span>
            </div>
            {waitlistedCount > 0 && (
              <span className="text-[10px] font-semibold text-on-surface-variant">{waitlistedCount} waitlisted</span>
            )}
          </div>
          <AnimatedNumber value={acceptedCount} className="text-4xl font-black text-on-surface" />
          <p className="text-xs text-on-surface-variant mt-1 font-medium">Acceptances</p>
        </div>

        <div className={`bg-surface-container-lowest border rounded-xl p-5 ${nextDeadlineDays != null && nextDeadlineDays <= 14 ? "border-error/30" : "border-outline-variant/15"}`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${nextDeadlineDays != null && nextDeadlineDays <= 14 ? "bg-error/10" : "bg-surface-container-high"}`}>
              <span className={`material-symbols-outlined text-sm ${nextDeadlineDays != null && nextDeadlineDays <= 14 ? "text-error" : "text-on-surface-variant"}`}>schedule</span>
            </div>
            {nextDeadlineDays != null && nextDeadlineDays <= 14 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-error">
                <LivePulse className="!h-1.5 !w-1.5" /> Urgent
              </span>
            )}
          </div>
          {nextDeadlineDays != null ? (
            <AnimatedNumber value={nextDeadlineDays} className="text-4xl font-black text-on-surface" />
          ) : (
            <span className="text-4xl font-black text-outline">--</span>
          )}
          <p className="text-xs text-on-surface-variant mt-1 font-medium">Days to Deadline</p>
        </div>
      </div>

      {/* ── Upgrade CTA (free users only) ───────────────── */}
      <DashboardUpgradeCTA tier={dbUser.subscriptionTier} />

      {/* ── Main Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── Application Pipeline Kanban (8 cols) ──────── */}
        <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant/15 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-on-surface">Application Pipeline</h3>
              {totalApps > 0 && <LivePulse />}
            </div>
            <Link href="/applications" className="text-xs font-semibold text-primary hover:underline">
              Manage All →
            </Link>
          </div>

          {totalApps > 0 ? (
            <div className="p-5">
              <div className="overflow-x-auto pb-2 -mx-1 px-1">
                <div className="flex gap-3 min-w-max">
                  {(["not_started", "docs_pending", "sop_pending", "ready", "applied", "decision", "enrolled"] as const).map((status) => {
                    const count = appStatusCounts[status] || 0;
                    if (count === 0) return null;
                    const statusApps = dbUser.applications.filter((a) => a.status === status);
                    const colHeaderColors: Record<string, string> = {
                      not_started: "bg-surface-container-high text-on-surface-variant",
                      docs_pending: "bg-secondary/15 text-secondary",
                      sop_pending: "bg-tertiary/15 text-tertiary",
                      ready: "bg-primary/15 text-primary",
                      applied: "bg-primary/20 text-primary",
                      decision: "bg-secondary/20 text-secondary",
                      enrolled: "bg-tertiary/20 text-tertiary",
                    };
                    return (
                      <div key={status} className="w-44 flex-shrink-0">
                        <div className="flex items-center justify-between mb-2.5 px-0.5">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider truncate">
                            {STATUS_LABELS[status]}
                          </span>
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0 ml-1 ${colHeaderColors[status]}`}>
                            {count}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {statusApps.slice(0, 3).map((app) => {
                            const days = daysUntil(app.program.applicationDeadline);
                            const logo = getUniversityLogoUrl(app.program.university.logoUrl, app.program.university.websiteUrl);
                            return (
                              <Link
                                key={app.id}
                                href={`/applications/${app.id}`}
                                className="block bg-surface border border-outline-variant/10 rounded-xl p-3 hover:border-primary/25 hover:shadow-sm transition-all"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <UniversityLogo logoUrl={logo} name={app.program.university.name} size={22} />
                                  <p className="text-[11px] font-bold text-on-surface truncate flex-1 leading-tight">
                                    {app.program.university.name}
                                  </p>
                                </div>
                                <p className="text-[10px] text-on-surface-variant truncate mb-2 leading-tight">
                                  {app.program.name}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] text-outline font-medium">{app.program.university.country}</span>
                                  {days != null && days > 0 && (
                                    <DeadlineCountdown days={days} className="text-[9px] font-bold text-on-surface-variant" />
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                          {count > 3 && (
                            <Link href="/applications" className="block text-center text-[10px] text-primary font-semibold py-1.5 hover:underline">
                              +{count - 3} more
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-5 py-14 text-center">
              <span className="material-symbols-outlined text-4xl text-outline/20 mb-3 block">school</span>
              <p className="text-sm font-bold text-on-surface mb-1">No applications yet</p>
              <p className="text-xs text-on-surface-variant mb-5">Explore universities matched to your profile</p>
              <Link href="/universities" className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-all">
                <span className="material-symbols-outlined text-sm">search</span>
                Find Universities
              </Link>
            </div>
          )}
        </div>

        {/* ── Profile Strength (4 cols) ─────────────────── */}
        <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-on-surface">Profile Strength</h3>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {profile.total}%
            </span>
          </div>

          <div className="flex justify-center py-2">
            <ProfileRing percentage={profile.total} grade={grade} gradeLabel={gradeLabel} />
          </div>

          <div className="my-3">
            <div className="flex gap-0.5 h-1.5">
              {profile.items.map((item, i) => (
                <div key={i} className={`flex-1 rounded-full transition-all ${item.done ? "bg-primary" : "bg-surface-container-high"}`} />
              ))}
            </div>
            <p className="text-[10px] text-on-surface-variant mt-1.5 text-center">
              {profile.items.filter((i) => i.done).length} of {profile.items.length} complete
            </p>
          </div>

          <div className="space-y-1 flex-1 overflow-y-auto max-h-44">
            {profile.items.map((item, i) => (
              <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${!item.done ? "bg-error/5" : ""}`}>
                <span className={`material-symbols-outlined text-sm shrink-0 ${item.done ? "text-primary" : "text-error/50"}`}>
                  {item.done ? "check_circle" : "radio_button_unchecked"}
                </span>
                <span className={`text-[11px] font-medium ${item.done ? "text-on-surface-variant line-through opacity-50" : "text-on-surface"}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <Link href="/onboarding" className="mt-4 block text-center text-xs font-bold text-primary py-2.5 border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors">
            {profile.total >= 100 ? "Review Profile" : "Complete Profile →"}
          </Link>
        </div>

        {/* ── Top University Matches (8 cols) ───────────── */}
        <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-on-surface">Top University Matches</h3>
              {topMatches.length > 0 && <LivePulse />}
            </div>
            <Link href="/universities" className="text-xs font-semibold text-primary hover:underline">
              Explore All →
            </Link>
          </div>

          {topMatches.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {topMatches.slice(0, 6).map((uni) => (
                <Link
                  key={uni.programId}
                  href={`/universities/${uni.id}`}
                  className="bg-surface border border-outline-variant/10 rounded-xl p-4 hover:border-primary/25 hover:shadow-sm transition-all group block"
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UniversityLogo logoUrl={uni.logoUrl} name={uni.name} size={34} />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-on-surface truncate leading-tight">{uni.name}</h4>
                        <p className="text-[10px] text-on-surface-variant truncate">{uni.city}, {uni.country}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg shrink-0 ${uni.badgeColor}`}>
                      {uni.score}%
                    </span>
                  </div>

                  <p className="text-[11px] text-on-surface-variant mb-3 truncate">{uni.course}</p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {uni.rank && (
                      <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">QS #{uni.rank}</span>
                    )}
                    {uni.scholarships > 0 && (
                      <span className="text-[9px] font-bold text-tertiary bg-tertiary/10 px-1.5 py-0.5 rounded">{uni.scholarships} scholarships</span>
                    )}
                    {uni.stemDesignated && (
                      <span className="text-[9px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">STEM</span>
                    )}
                    {uni.coopInternship && (
                      <span className="text-[9px] font-bold text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded">Co-op</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-outline-variant/10">
                    <span className="text-[9px] text-outline">
                      {uni.deadline ? `Due ${formatDeadline(uni.deadline)}` : "Check website"}
                    </span>
                    <span className="text-[9px] font-semibold text-primary group-hover:underline">View →</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm text-on-surface-variant font-medium">
                Complete your profile to see personalized matches.
              </p>
            </div>
          )}
        </div>

        {/* ── Test Scores (4 cols) ──────────────────────── */}
        <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-on-surface">Test Scores</h3>
            <Link href="/onboarding" className="text-[10px] font-semibold text-primary hover:underline">Update</Link>
          </div>

          {ac ? (
            <div className="space-y-3">
              <div className="bg-surface border border-outline-variant/10 rounded-xl p-3.5">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-xs font-semibold text-on-surface-variant">GPA</span>
                  <span className="text-xl font-black text-primary">
                    {ac.gpa}
                    <span className="text-sm font-medium text-on-surface-variant">
                      /{ac.gpaScale === "scale_4" ? "4.0" : ac.gpaScale === "scale_10" ? "10" : "100"}
                    </span>
                  </span>
                </div>
                <p className="text-[10px] text-on-surface-variant mt-1 truncate">{ac.degreeName} · {ac.collegeName}</p>
              </div>

              <div className="space-y-2.5 pt-1">
                {testScores.map((t) => (
                  <div key={t.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-sm ${t.status === "done" ? "text-primary" : t.status === "low" ? "text-secondary" : "text-outline/30"}`}>
                        {t.status === "done" ? "check_circle" : t.status === "low" ? "warning" : "radio_button_unchecked"}
                      </span>
                      <span className="text-xs font-semibold text-on-surface">{t.name}</span>
                    </div>
                    {t.score ? (
                      <span className={`text-sm font-black ${t.status === "low" ? "text-secondary" : "text-on-surface"}`}>{t.score}</span>
                    ) : (
                      <span className="text-[10px] text-outline italic">Not taken</span>
                    )}
                  </div>
                ))}
              </div>

              {ac.workExperienceMonths > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10">
                  <span className="text-xs text-on-surface-variant font-medium">Work Exp.</span>
                  <span className="text-sm font-black text-on-surface">
                    {ac.workExperienceMonths >= 12 ? `${Math.floor(ac.workExperienceMonths / 12)}y ${ac.workExperienceMonths % 12}m` : `${ac.workExperienceMonths}m`}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-on-surface-variant">Complete onboarding to see scores.</p>
            </div>
          )}
        </div>

        {/* ── Upcoming Deadlines (8 cols) ───────────────── */}
        <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant/15 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-on-surface">Upcoming Deadlines</h3>
              {deadlineRows.some((r) => r.daysLeft <= 14) && <LivePulse />}
            </div>
            {deadlineRows.length > 0 && (
              <span className="text-[10px] font-semibold text-on-surface-variant bg-surface-container-high px-2 py-1 rounded-lg">
                {deadlineRows.length} approaching
              </span>
            )}
          </div>

          {deadlineRows.length > 0 ? (
            <div className="divide-y divide-outline-variant/10">
              {deadlineRows.map((row, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-container-low/60 transition-colors">
                  <UniversityLogo logoUrl={row.logoUrl} name={row.university} size={34} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-on-surface truncate">{row.university}</p>
                    <p className="text-[10px] text-on-surface-variant truncate">{row.program}</p>
                  </div>
                  <div className="text-right hidden sm:block shrink-0">
                    <p className="text-xs font-medium text-on-surface">{row.deadline}</p>
                    <DeadlineCountdown days={row.daysLeft} className={`text-[10px] font-bold ${row.priority.text}`} />
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1.5 ${row.priority.badge}`}>
                    <span className={`w-1.5 h-1.5 ${row.priority.dot} rounded-full ${row.daysLeft <= 14 ? "animate-pulse" : ""}`} />
                    {row.priority.label}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 hidden md:flex">
                    <span className={`material-symbols-outlined text-xs ${row.hasSop ? "text-primary" : "text-outline/30"}`}>
                      {row.hasSop ? "check_circle" : "circle"}
                    </span>
                    <span className="text-[9px] text-on-surface-variant">SOP</span>
                    <span className={`material-symbols-outlined text-xs ${row.docsCount > 0 ? "text-primary" : "text-outline/30"}`}>
                      {row.docsCount > 0 ? "check_circle" : "circle"}
                    </span>
                    <span className="text-[9px] text-on-surface-variant">Docs</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-on-surface-variant font-medium">
              No upcoming deadlines. Add universities to track.
            </div>
          )}
        </div>

        {/* ── Alerts & Actions (4 cols) ─────────────────── */}
        <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant/15 rounded-xl flex flex-col">
          <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-on-surface">Alerts & Actions</h3>
              {unreadAlerts > 0 && <LivePulse />}
            </div>
            {unreadAlerts > 0 && (
              <span className="w-5 h-5 bg-error text-on-error text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadAlerts}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1.5 max-h-72">
            {alerts.length > 0 ? (
              alerts.map((alert) => {
                const icons: Record<string, { icon: string; color: string }> = {
                  deadline_approaching: { icon: "schedule", color: "text-error" },
                  missing_document: { icon: "upload_file", color: "text-secondary" },
                  new_scholarship: { icon: "redeem", color: "text-tertiary" },
                  profile_incomplete: { icon: "person_alert", color: "text-primary" },
                  status_update: { icon: "notifications", color: "text-on-surface-variant" },
                };
                const style = icons[alert.type] || icons.status_update;
                return (
                  <div
                    key={alert.id}
                    className={`flex gap-2.5 p-3 rounded-xl transition-colors ${!alert.isRead ? "bg-surface border border-primary/10" : "hover:bg-surface-container-low"}`}
                  >
                    <span className={`material-symbols-outlined text-sm mt-0.5 shrink-0 ${style.color}`}>{style.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-on-surface leading-tight">{alert.title}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5 line-clamp-2">{alert.body}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <RelativeTime date={alert.createdAt.toISOString()} className="text-[9px] text-outline" />
                        {alert.actionUrl && (
                          <Link href={alert.actionUrl} className="text-[10px] font-bold text-primary hover:underline ml-auto">
                            Take action →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="space-y-1.5">
                {pendingDocs > 0 && (
                  <Link href="/documents" className="flex gap-2.5 p-3 rounded-xl hover:bg-surface-container-low transition-colors">
                    <span className="material-symbols-outlined text-sm text-secondary mt-0.5 shrink-0">upload_file</span>
                    <div>
                      <p className="text-xs font-semibold text-on-surface">{pendingDocs} documents need uploading</p>
                      <p className="text-[10px] text-on-surface-variant">Upload to speed up applications</p>
                    </div>
                  </Link>
                )}
                {totalAppsNeedingSop > sopsWritten && (
                  <Link href="/sop-writer" className="flex gap-2.5 p-3 rounded-xl hover:bg-surface-container-low transition-colors">
                    <span className="material-symbols-outlined text-sm text-tertiary mt-0.5 shrink-0">edit_note</span>
                    <div>
                      <p className="text-xs font-semibold text-on-surface">{totalAppsNeedingSop - sopsWritten} SOPs still needed</p>
                      <p className="text-[10px] text-on-surface-variant">Use AI to draft your SOPs</p>
                    </div>
                  </Link>
                )}
                {profile.total < 100 && (
                  <Link href="/onboarding" className="flex gap-2.5 p-3 rounded-xl hover:bg-surface-container-low transition-colors">
                    <span className="material-symbols-outlined text-sm text-primary mt-0.5 shrink-0">person</span>
                    <div>
                      <p className="text-xs font-semibold text-on-surface">Profile {profile.total}% complete</p>
                      <p className="text-[10px] text-on-surface-variant">A complete profile gets better matches</p>
                    </div>
                  </Link>
                )}
                {totalApps === 0 && (
                  <Link href="/universities" className="flex gap-2.5 p-3 rounded-xl hover:bg-surface-container-low transition-colors">
                    <span className="material-symbols-outlined text-sm text-primary mt-0.5 shrink-0">search</span>
                    <div>
                      <p className="text-xs font-semibold text-on-surface">Explore universities</p>
                      <p className="text-[10px] text-on-surface-variant">Find programs that match your profile</p>
                    </div>
                  </Link>
                )}
                {pendingDocs === 0 && totalApps > 0 && profile.total >= 100 && totalAppsNeedingSop <= sopsWritten && (
                  <div className="py-6 text-center">
                    <span className="material-symbols-outlined text-2xl text-primary/30 mb-2 block">check_circle</span>
                    <p className="text-xs text-on-surface-variant">All caught up!</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-outline-variant/10">
            <Link href="/riz-ai" className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary py-2.5 rounded-lg text-xs font-bold hover:bg-primary/15 transition-colors">
              <Sparkles size={13} />
              Get AI Advice
            </Link>
          </div>
        </div>

        {/* ── Document Readiness (full width) ───────────── */}
        {totalDocs > 0 && (
          <div className="lg:col-span-12 bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-on-surface">Document Readiness</h3>
              <Link href="/documents" className="text-xs font-semibold text-primary hover:underline">Manage →</Link>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-[10px] font-semibold text-on-surface-variant mb-1.5">
                <span>{uploadedDocs} of {totalDocs} uploaded</span>
                <span>{verifiedDocs} verified</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-surface-container-low gap-0.5">
                {verifiedDocs > 0 && (
                  <div className="bg-primary rounded-full transition-all" style={{ width: `${(verifiedDocs / totalDocs) * 100}%` }} />
                )}
                {uploadedDocs - verifiedDocs > 0 && (
                  <div className="bg-secondary/50 rounded-full transition-all" style={{ width: `${((uploadedDocs - verifiedDocs) / totalDocs) * 100}%` }} />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {(["academic", "test_scores", "identity", "financial", "application"] as const).map((cat) => {
                const catDocs = dbUser.documents.filter((d) => d.category === cat);
                const catReady = catDocs.filter((d) => d.status === "uploaded" || d.status === "verified").length;
                const catLabels: Record<string, string> = {
                  academic: "Academic",
                  test_scores: "Test Scores",
                  identity: "Identity",
                  financial: "Financial",
                  application: "Application",
                };
                const catIcons: Record<string, string> = {
                  academic: "school",
                  test_scores: "quiz",
                  identity: "badge",
                  financial: "account_balance",
                  application: "description",
                };
                if (catDocs.length === 0) return null;
                const isComplete = catReady === catDocs.length;
                return (
                  <div key={cat} className={`p-4 rounded-xl text-center border transition-all ${isComplete ? "border-primary/20 bg-primary/5" : "border-outline-variant/10 bg-surface"}`}>
                    <span className={`material-symbols-outlined text-xl ${isComplete ? "text-primary" : "text-outline/40"}`}>
                      {catIcons[cat]}
                    </span>
                    <p className="text-[11px] font-bold text-on-surface mt-1.5">{catLabels[cat]}</p>
                    <p className={`text-xs font-black mt-0.5 ${isComplete ? "text-primary" : "text-on-surface-variant"}`}>
                      {catReady}/{catDocs.length}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Credits & Plans upsell ──────────────────────── */}
      <DashboardUpsellSection />

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="mt-8 py-6 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[11px] text-outline text-center">
          &copy; {new Date().getFullYear()} RIBRIZ Academic Consultancy. All rights reserved.
        </p>
        <div className="flex flex-wrap justify-center gap-6 text-[11px] font-semibold text-on-surface-variant">
          <Link className="hover:text-primary transition-colors" href="/settings">Settings</Link>
          <Link className="hover:text-primary transition-colors" href="/settings">Privacy & Data</Link>
          <Link className="hover:text-primary transition-colors" href="/riz-ai">Ask Riz AI</Link>
        </div>
      </footer>
    </div>
  );
}
