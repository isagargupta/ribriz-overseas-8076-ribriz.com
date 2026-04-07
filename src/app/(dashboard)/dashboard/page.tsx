import { Sparkles } from "lucide-react";
import { getUser } from "@/lib/supabase/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { computeMatchScore, getBadge } from "@/lib/scoring";
import { getUniversityLogoUrl } from "@/lib/university-logo";
import { fetchExternalPrograms } from "@/lib/external-university-api";
import { ExportRoadmapButton } from "@/components/ui/export-roadmap-btn";
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
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto pb-20 md:pb-8">
      {/* Auto-refresh every 2 minutes for live feel */}
      <AutoRefresh intervalMs={120000} />

      {/* ── Header ──────────────────────────────────────── */}
      <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight font-headline">
              Welcome back, {firstName}
            </h2>
            <LivePulse />
          </div>
          <p className="text-sm text-on-surface-variant max-w-2xl leading-relaxed font-body">
            Targeting{" "}
            <span className="font-semibold text-primary">
              {targetDegree === "masters" ? "Master's" : targetDegree === "mba" ? "MBA" : targetDegree === "phd" ? "PhD" : "Bachelor's"}
            </span>{" "}
            in <span className="font-semibold text-on-surface">{targetField}</span>
            {targetCountries.length > 0 && (
              <>
                {" "}across{" "}
                <span className="font-semibold text-on-surface">
                  {targetCountries.slice(0, 3).join(", ")}
                  {targetCountries.length > 3 && ` +${targetCountries.length - 3} more`}
                </span>
              </>
            )}
            {" "}for{" "}
            <span className="px-2 py-0.5 bg-primary-container text-on-primary-container rounded text-xs font-bold">
              {targetIntake}
            </span>
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3 shrink-0">
          <ExportRoadmapButton />
          <Link
            href="/riz-ai"
            className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-md shadow-sm hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Sparkles size={14} />
            Ask Riz AI
          </Link>
        </div>
      </div>

      {/* ── Quick Stats Row ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Link href="/applications" className="bg-surface-container-lowest rounded-xl p-5 border border-transparent hover:border-primary/20 transition-all group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-lg text-on-primary-container">school</span>
            </div>
            <AnimatedNumber value={totalApps} className="text-2xl font-extrabold text-on-surface font-headline" />
          </div>
          <p className="text-xs font-bold text-outline uppercase tracking-wider">Applications</p>
          {appliedCount > 0 && (
            <p className="text-[10px] text-primary font-semibold mt-1">{appliedCount} submitted</p>
          )}
        </Link>

        <Link href="/documents" className="bg-surface-container-lowest rounded-xl p-5 border border-transparent hover:border-primary/20 transition-all group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-lg text-on-secondary-container">description</span>
            </div>
            <span className="text-2xl font-extrabold text-on-surface font-headline">
              <AnimatedNumber value={uploadedDocs} className="" />/{totalDocs || "0"}
            </span>
          </div>
          <p className="text-xs font-bold text-outline uppercase tracking-wider">Documents Ready</p>
          {verifiedDocs > 0 && (
            <p className="text-[10px] text-secondary font-semibold mt-1">{verifiedDocs} verified</p>
          )}
        </Link>

        <div className="bg-surface-container-lowest rounded-xl p-5 border border-transparent">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-tertiary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-lg text-on-tertiary-fixed">emoji_events</span>
            </div>
            <AnimatedNumber value={acceptedCount} className="text-2xl font-extrabold text-on-surface font-headline" />
          </div>
          <p className="text-xs font-bold text-outline uppercase tracking-wider">Acceptances</p>
          {waitlistedCount > 0 && (
            <p className="text-[10px] text-tertiary font-semibold mt-1">{waitlistedCount} waitlisted</p>
          )}
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-5 border border-transparent">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${nextDeadlineDays != null && nextDeadlineDays <= 14 ? "bg-error-container" : "bg-surface-container-high"}`}>
              <span className={`material-symbols-outlined text-lg ${nextDeadlineDays != null && nextDeadlineDays <= 14 ? "text-on-error-container" : "text-on-surface-variant"}`}>schedule</span>
            </div>
            {nextDeadlineDays != null ? (
              <AnimatedNumber value={nextDeadlineDays} className="text-2xl font-extrabold text-on-surface font-headline" />
            ) : (
              <span className="text-2xl font-extrabold text-outline font-headline">--</span>
            )}
          </div>
          <p className="text-xs font-bold text-outline uppercase tracking-wider">Days to Deadline</p>
          {nextDeadlineDays != null && nextDeadlineDays <= 14 && (
            <p className="text-[10px] text-error font-semibold mt-1 flex items-center gap-1">
              <LivePulse className="!h-1.5 !w-1.5" /> Urgent
            </p>
          )}
        </div>
      </div>

      {/* ── Main Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Profile Strength (4 cols) ─────────────────── */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl p-6 flex flex-col border border-transparent">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-outline">
              Profile Strength
            </h3>
            <span className="text-xs font-extrabold text-primary bg-primary-container px-2 py-0.5 rounded-full">
              {profile.total}%
            </span>
          </div>

          {/* Animated ring */}
          <div className="flex justify-center py-4">
            <ProfileRing percentage={profile.total} grade={grade} gradeLabel={gradeLabel} />
          </div>

          {/* Segment bars showing completed vs total */}
          <div className="mb-4">
            <div className="flex gap-0.5">
              {profile.items.map((item, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    item.done ? "bg-primary" : "bg-surface-container-low"
                  }`}
                  title={`${item.label}: ${item.done ? "Complete" : "Missing"}`}
                />
              ))}
            </div>
            <p className="text-[10px] text-outline mt-1.5 text-center">
              {profile.items.filter((i) => i.done).length} of {profile.items.length} fields complete
            </p>
          </div>

          {/* Checklist */}
          <div className="space-y-1 flex-1 overflow-y-auto max-h-44">
            {profile.items.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors ${
                  item.done
                    ? "bg-transparent"
                    : "bg-error-container/30"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-sm ${
                    item.done ? "text-primary" : "text-error"
                  }`}
                >
                  {item.done ? "check_circle" : "radio_button_unchecked"}
                </span>
                <span
                  className={`text-[11px] font-medium ${
                    item.done
                      ? "text-on-surface-variant line-through opacity-60"
                      : "text-on-surface"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <Link
            href="/onboarding"
            className="mt-4 text-center text-xs font-bold text-primary py-2.5 border border-primary/20 rounded-lg hover:bg-primary-container transition-colors"
          >
            {profile.total >= 100 ? "Review Profile" : "Complete Profile"}
          </Link>
        </div>

        {/* ── Application Pipeline (8 cols) ─────────────── */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl border border-transparent overflow-hidden">
          <div className="px-6 py-5 border-b border-surface-container-low flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-outline">
                Application Pipeline
              </h3>
              {totalApps > 0 && <LivePulse />}
            </div>
            <Link href="/applications" className="text-xs font-bold text-primary hover:underline">
              Manage All
            </Link>
          </div>

          {totalApps > 0 ? (
            <>
              {/* Status bar */}
              <div className="px-6 pt-5 pb-3">
                <div className="flex h-3 rounded-full overflow-hidden bg-surface-container-low gap-0.5">
                  {(["not_started", "docs_pending", "sop_pending", "ready", "applied", "decision", "enrolled"] as const).map(
                    (status) => {
                      const count = appStatusCounts[status] || 0;
                      if (count === 0) return null;
                      const pct = (count / totalApps) * 100;
                      const colors: Record<string, string> = {
                        not_started: "bg-outline/30",
                        docs_pending: "bg-secondary/50",
                        sop_pending: "bg-tertiary/60",
                        ready: "bg-primary/70",
                        applied: "bg-primary",
                        decision: "bg-secondary",
                        enrolled: "bg-tertiary",
                      };
                      return (
                        <div
                          key={status}
                          className={`${colors[status]} rounded-full transition-all`}
                          style={{ width: `${pct}%` }}
                          title={`${STATUS_LABELS[status]}: ${count}`}
                        />
                      );
                    }
                  )}
                </div>
              </div>

              {/* Status legend */}
              <div className="px-6 pb-4 flex flex-wrap gap-2">
                {Object.entries(appStatusCounts).map(([status, count]) => (
                  <span
                    key={status}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold ${STATUS_COLORS[status] || "bg-surface-container text-on-surface-variant"}`}
                  >
                    {count} {STATUS_LABELS[status] || status}
                  </span>
                ))}
              </div>

              {/* Recent applications with logos */}
              <div className="px-6 pb-5 space-y-2">
                {dbUser.applications.slice(0, 4).map((app) => {
                  const days = daysUntil(app.program.applicationDeadline);
                  const logo = getUniversityLogoUrl(
                    app.program.university.logoUrl,
                    app.program.university.websiteUrl
                  );
                  return (
                    <Link
                      key={app.id}
                      href={`/applications/${app.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant/10 hover:bg-surface hover:border-primary/15 transition-all group"
                    >
                      <UniversityLogo
                        logoUrl={logo}
                        name={app.program.university.name}
                        size={38}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-on-surface truncate">
                          {app.program.university.name}
                        </p>
                        <p className="text-[11px] text-on-surface-variant truncate">
                          {app.program.name} &middot; {app.program.university.country}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_COLORS[app.status]}`}>
                          {STATUS_LABELS[app.status]}
                        </span>
                        {days != null && days > 0 && (
                          <DeadlineCountdown
                            days={days}
                            className="block text-[10px] mt-1 font-semibold"
                          />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="px-6 py-14 text-center">
              <span className="material-symbols-outlined text-5xl text-outline/20 mb-4 block">school</span>
              <p className="text-sm text-on-surface font-semibold mb-1">
                No applications yet
              </p>
              <p className="text-xs text-outline mb-5">
                Start by exploring universities matched to your profile
              </p>
              <Link
                href="/universities"
                className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg text-xs font-bold hover:opacity-90 transition-all"
              >
                <span className="material-symbols-outlined text-sm">search</span>
                Find Universities
              </Link>
            </div>
          )}
        </div>

        {/* ── Upcoming Deadlines (8 cols) ───────────────── */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl border border-transparent overflow-hidden">
          <div className="px-6 py-5 border-b border-surface-container-low flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-outline">
                Upcoming Deadlines
              </h3>
              {deadlineRows.some((r) => r.daysLeft <= 14) && <LivePulse />}
            </div>
            {deadlineRows.length > 0 && (
              <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-high px-2 py-1 rounded">
                {deadlineRows.length} approaching
              </span>
            )}
          </div>

          {deadlineRows.length > 0 ? (
            <div className="divide-y divide-surface-container-low">
              {deadlineRows.map((row, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-surface-container-high/50 transition-colors">
                  <UniversityLogo logoUrl={row.logoUrl} name={row.university} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{row.university}</p>
                    <p className="text-[11px] text-on-surface-variant truncate">{row.program}</p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-xs font-medium text-on-surface">{row.deadline}</p>
                    <DeadlineCountdown days={row.daysLeft} className={`text-[10px] font-bold ${row.priority.text}`} />
                  </div>
                  <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${row.priority.badge} text-[10px] font-bold shrink-0`}>
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
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${STATUS_COLORS[row.status]}`}>
                    {STATUS_LABELS[row.status]}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-sm text-outline font-medium">
              No upcoming deadlines. Add universities to track deadlines.
            </div>
          )}
        </div>

        {/* ── Test Scores & Gaps (4 cols) ───────────────── */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl border border-transparent p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-outline">
              Test Scores
            </h3>
            <Link href="/onboarding" className="text-[10px] font-bold text-primary hover:underline">
              Update
            </Link>
          </div>

          {ac ? (
            <div className="space-y-4">
              {/* GPA */}
              <div className="p-3 rounded-lg bg-surface-container-low">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-on-surface">GPA</span>
                  <span className="text-sm font-extrabold text-primary font-headline">
                    {ac.gpa}/{ac.gpaScale === "scale_4" ? "4.0" : ac.gpaScale === "scale_10" ? "10" : "100"}
                  </span>
                </div>
                <p className="text-[10px] text-on-surface-variant mt-1">
                  {ac.degreeName} &middot; {ac.collegeName}
                </p>
              </div>

              {/* Test scores */}
              {testScores.map((t) => (
                <div key={t.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`material-symbols-outlined text-sm ${
                        t.status === "done"
                          ? "text-primary"
                          : t.status === "low"
                          ? "text-secondary"
                          : "text-outline/40"
                      }`}
                    >
                      {t.status === "done"
                        ? "check_circle"
                        : t.status === "low"
                        ? "warning"
                        : "radio_button_unchecked"}
                    </span>
                    <span className="text-xs font-bold text-on-surface">{t.name}</span>
                  </div>
                  {t.score ? (
                    <span className={`text-sm font-extrabold font-headline ${t.status === "low" ? "text-secondary" : "text-on-surface"}`}>
                      {t.score}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-outline italic">Not taken</span>
                  )}
                </div>
              ))}

              {/* Work experience */}
              {ac.workExperienceMonths > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-surface-container-low">
                  <span className="text-xs font-bold text-on-surface-variant">Work Experience</span>
                  <span className="text-sm font-extrabold text-on-surface font-headline">
                    {ac.workExperienceMonths >= 12
                      ? `${Math.floor(ac.workExperienceMonths / 12)}y ${ac.workExperienceMonths % 12}m`
                      : `${ac.workExperienceMonths}m`}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-outline font-medium">Complete onboarding to see scores.</p>
            </div>
          )}
        </div>

        {/* ── Top University Matches (8 cols) ───────────── */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl border border-transparent p-6">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-outline">
                Top University Matches
              </h3>
              {topMatches.length > 0 && <LivePulse />}
            </div>
            <Link href="/universities" className="text-xs font-bold text-primary hover:underline">
              Explore All
            </Link>
          </div>

          {topMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topMatches.slice(0, 6).map((uni) => (
                <Link
                  key={uni.programId}
                  href={`/universities/${uni.id}`}
                  className="flex items-start gap-3 p-4 border border-outline-variant/10 rounded-xl hover:bg-surface hover:border-primary/15 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <UniversityLogo
                    logoUrl={uni.logoUrl}
                    name={uni.name}
                    size={44}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-on-surface truncate">{uni.name}</h4>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${uni.badgeColor}`}>
                        {uni.score}%
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant truncate mt-0.5">{uni.course}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                      {uni.rank && (
                        <span className="text-[10px] font-bold text-primary bg-primary-container/50 px-1.5 py-0.5 rounded">
                          QS #{uni.rank}
                        </span>
                      )}
                      {uni.scholarships > 0 && (
                        <span className="text-[10px] font-bold text-tertiary bg-tertiary-fixed/50 px-1.5 py-0.5 rounded">
                          {uni.scholarships} scholarships
                        </span>
                      )}
                      {uni.stemDesignated && (
                        <span className="text-[10px] font-bold text-secondary bg-secondary-container px-1.5 py-0.5 rounded">
                          STEM
                        </span>
                      )}
                      {uni.coopInternship && (
                        <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded">
                          Co-op
                        </span>
                      )}
                      {uni.country && (
                        <span className="text-[10px] text-outline">
                          {uni.city}, {uni.country}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm text-outline font-medium">
                Complete your profile to see personalized university matches.
              </p>
            </div>
          )}
        </div>

        {/* ── Alerts & Actions (4 cols) ─────────────────── */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl border border-transparent flex flex-col">
          <div className="px-6 py-5 border-b border-surface-container-low flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-outline">
                Alerts & Actions
              </h3>
              {unreadAlerts > 0 && <LivePulse />}
            </div>
            {unreadAlerts > 0 && (
              <span className="w-5 h-5 bg-error text-on-error text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadAlerts}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-2.5 max-h-80">
            {alerts.length > 0 ? (
              alerts.map((alert) => {
                const icons: Record<string, { icon: string; bg: string; text: string }> = {
                  deadline_approaching: { icon: "schedule", bg: "bg-error-container", text: "text-on-error-container" },
                  missing_document: { icon: "upload_file", bg: "bg-secondary-container", text: "text-on-secondary-container" },
                  new_scholarship: { icon: "redeem", bg: "bg-tertiary-fixed", text: "text-on-tertiary-fixed" },
                  profile_incomplete: { icon: "person_alert", bg: "bg-primary-container", text: "text-on-primary-container" },
                  status_update: { icon: "notifications", bg: "bg-surface-container-high", text: "text-on-surface-variant" },
                };
                const style = icons[alert.type] || icons.status_update;

                return (
                  <div
                    key={alert.id}
                    className={`flex gap-3 p-3 rounded-lg transition-colors ${!alert.isRead ? "bg-surface-container-low border border-primary/10" : "hover:bg-surface-container-low"}`}
                  >
                    <div className={`w-8 h-8 rounded-full ${style.bg} flex items-center justify-center shrink-0`}>
                      <span className={`material-symbols-outlined text-sm ${style.text}`}>
                        {style.icon}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-on-surface font-semibold leading-tight truncate">
                        {alert.title}
                      </p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5 line-clamp-2">
                        {alert.body}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          alert.priority === "urgent" ? "bg-error-container text-on-error-container" :
                          alert.priority === "high" ? "bg-secondary-container text-on-secondary-container" :
                          "bg-surface-container-high text-on-surface-variant"
                        }`}>
                          {alert.priority}
                        </span>
                        <RelativeTime date={alert.createdAt.toISOString()} className="text-[9px] text-outline" />
                        {alert.actionUrl && (
                          <Link href={alert.actionUrl} className="text-[10px] font-bold text-primary hover:underline ml-auto">
                            Action
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="space-y-2.5">
                {pendingDocs > 0 && (
                  <Link href="/documents" className="flex gap-3 p-3 rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors">
                    <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-sm text-on-secondary-container">upload_file</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface">{pendingDocs} documents need uploading</p>
                      <p className="text-[10px] text-on-surface-variant">Upload to speed up applications</p>
                    </div>
                  </Link>
                )}
                {totalAppsNeedingSop > sopsWritten && (
                  <Link href="/sop-writer" className="flex gap-3 p-3 rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors">
                    <div className="w-8 h-8 rounded-full bg-tertiary-fixed flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-sm text-on-tertiary-fixed">edit_note</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface">{totalAppsNeedingSop - sopsWritten} SOPs still needed</p>
                      <p className="text-[10px] text-on-surface-variant">Use AI to draft your SOPs</p>
                    </div>
                  </Link>
                )}
                {profile.total < 100 && (
                  <Link href="/onboarding" className="flex gap-3 p-3 rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-sm text-on-primary-container">person</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface">Profile {profile.total}% complete</p>
                      <p className="text-[10px] text-on-surface-variant">A complete profile gets better matches</p>
                    </div>
                  </Link>
                )}
                {totalApps === 0 && (
                  <Link href="/universities" className="flex gap-3 p-3 rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-sm text-on-primary-container">search</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface">Explore universities</p>
                      <p className="text-[10px] text-on-surface-variant">Find programs that match your profile</p>
                    </div>
                  </Link>
                )}
                {pendingDocs === 0 && totalApps > 0 && profile.total >= 100 && totalAppsNeedingSop <= sopsWritten && (
                  <div className="py-6 text-center">
                    <span className="material-symbols-outlined text-2xl text-primary/30 mb-2 block">check_circle</span>
                    <p className="text-xs text-outline font-medium">All caught up!</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 bg-surface-container-low mt-auto border-t border-surface-container-low">
            <Link
              href="/riz-ai"
              className="w-full text-center text-xs font-bold text-primary py-2 hover:bg-surface-container-highest rounded transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Sparkles size={12} />
              Get AI Advice
            </Link>
          </div>
        </div>

        {/* ── Document Readiness (full width) ───────────── */}
        {totalDocs > 0 && (
          <div className="lg:col-span-12 bg-surface-container-lowest rounded-xl border border-transparent p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-outline">
                Document Readiness
              </h3>
              <Link href="/documents" className="text-xs font-bold text-primary hover:underline">
                Manage Documents
              </Link>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-[10px] font-bold text-outline mb-2">
                <span>{uploadedDocs} of {totalDocs} uploaded</span>
                <span>{verifiedDocs} verified</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-surface-container-low gap-0.5">
                {verifiedDocs > 0 && (
                  <div className="bg-primary rounded-full transition-all" style={{ width: `${(verifiedDocs / totalDocs) * 100}%` }} />
                )}
                {uploadedDocs - verifiedDocs > 0 && (
                  <div className="bg-secondary/60 rounded-full transition-all" style={{ width: `${((uploadedDocs - verifiedDocs) / totalDocs) * 100}%` }} />
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
                  <div key={cat} className={`p-3 rounded-lg text-center transition-all ${isComplete ? "bg-primary-container/30" : "bg-surface-container-low"}`}>
                    <span className={`material-symbols-outlined text-lg ${isComplete ? "text-primary" : "text-outline/40"}`}>
                      {catIcons[cat]}
                    </span>
                    <p className="text-[10px] font-bold text-on-surface mt-1">{catLabels[cat]}</p>
                    <p className={`text-[10px] font-bold mt-0.5 ${isComplete ? "text-primary" : "text-on-surface-variant"}`}>
                      {catReady}/{catDocs.length}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="mt-8 sm:mt-12 py-6 border-t border-surface-container flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[10px] sm:text-[11px] text-outline font-medium tracking-tight text-center">
          &copy; {new Date().getFullYear()} RIBRIZ Academic Consultancy. All rights reserved.
        </p>
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-[10px] sm:text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
          <Link className="hover:text-primary transition-colors" href="/settings">Settings</Link>
          <Link className="hover:text-primary transition-colors" href="/settings">Privacy & Data</Link>
          <Link className="hover:text-primary transition-colors" href="/riz-ai">Ask Riz AI</Link>
        </div>
      </footer>
    </div>
  );
}
