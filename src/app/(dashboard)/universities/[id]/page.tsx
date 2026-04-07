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
import { ApplyNowButton } from "@/components/ui/apply-now-btn";
import { fetchExternalProgramById } from "@/lib/external-university-api";
import type { AuditParameter, AuditRoadmapItem } from "@/lib/scoring";

export default async function UniversityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/login");

  const isExternal = id.startsWith("ext-prog-");

  const [program, dbUser] = await Promise.all([
    isExternal
      ? fetchExternalProgramById(id)
      : prisma.program.findUnique({
          where: { id },
          include: { university: true },
        }),
    prisma.user.findUnique({
      where: { id: user.id },
      include: { academicProfile: true, preferences: true },
    }),
  ]);

  if (!program) notFound();
  if (!dbUser?.academicProfile || !dbUser?.preferences) redirect("/onboarding");

  const { academicProfile, preferences } = dbUser;
  const audit = generateAdmissionAudit(academicProfile, preferences, program);

  /* SVG ring calcs */
  const circumference = 2 * Math.PI * 44;
  const dashoffset = Math.round(circumference * (1 - audit.overallScore / 100));

  const deadline = formatDeadline(program.applicationDeadline);

  const universityLogoUrl = getUniversityLogoUrl(
    program.university.logoUrl,
    program.university.websiteUrl
  );

  /* Status helpers */
  function statusIcon(status: AuditParameter["status"]) {
    switch (status) {
      case "exceeds": return { icon: "verified", color: "text-tertiary" };
      case "meets": return { icon: "check_circle", color: "text-primary" };
      case "borderline": return { icon: "help", color: "text-secondary" };
      case "below": return { icon: "error", color: "text-error" };
      case "missing": return { icon: "cancel", color: "text-error" };
      case "auto_reject": return { icon: "block", color: "text-error" };
      case "not_required": return { icon: "remove_circle_outline", color: "text-secondary" };
    }
  }

  function statusLabel(status: AuditParameter["status"]) {
    switch (status) {
      case "exceeds": return "Exceeds";
      case "meets": return "Meets";
      case "borderline": return "Borderline";
      case "below": return "Below";
      case "missing": return "Missing";
      case "auto_reject": return "Auto-Reject Risk";
      case "not_required": return "Not Required";
    }
  }

  function statusBg(status: AuditParameter["status"]) {
    switch (status) {
      case "exceeds": return "bg-tertiary-fixed/10 text-tertiary";
      case "meets": return "bg-primary-container/20 text-primary";
      case "borderline": return "bg-secondary/10 text-secondary";
      case "below": return "bg-error/10 text-error";
      case "missing": return "bg-error/10 text-error";
      case "auto_reject": return "bg-error/20 text-error font-bold";
      case "not_required": return "bg-surface-container text-secondary";
    }
  }

  function priorityStyle(priority: AuditRoadmapItem["priority"]) {
    switch (priority) {
      case "critical": return { color: "text-error", bg: "bg-error text-white", label: "Critical" };
      case "high": return { color: "text-primary", bg: "bg-primary-container text-on-primary", label: "High Priority" };
      case "medium": return { color: "text-secondary", bg: "bg-surface-container-highest text-on-surface", label: "Medium" };
      case "low": return { color: "text-secondary", bg: "bg-surface-container text-on-surface-variant", label: "Low" };
      case "optional": return { color: "text-secondary", bg: "bg-surface-container text-on-surface-variant", label: "Optional" };
    }
  }

  const scoreColor = audit.overallScore >= 80 ? "stroke-tertiary" : audit.overallScore >= 60 ? "stroke-primary" : audit.overallScore >= 40 ? "stroke-secondary" : "stroke-error";

  /* Split parameters into groups */
  const criticalParams = audit.parameters.filter(p => p.status === "below" || p.status === "missing" || p.status === "auto_reject");
  const passingParams = audit.parameters.filter(p => p.status === "exceeds" || p.status === "meets" || p.status === "not_required");

  /* Acceptance rate */
  const acceptanceRate = program.university.acceptanceRate
    ? `${(program.university.acceptanceRate * 100).toFixed(1)}%`
    : null;

  return (
    <main className="flex-1 p-8 lg:p-12">
      {/* ── Header Section ──────────────────────────────── */}
      <div className="max-w-6xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <Link
            href="/universities"
            className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary transition-colors mb-4"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Universities
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-primary font-semibold tracking-wider text-xs uppercase">
              Admission Audit Report
            </span>
            <div className="h-px w-8 bg-primary" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight mb-2">
            {program.university.name}
          </h1>
          <p className="text-secondary text-lg max-w-2xl leading-relaxed">
            Real-time profile comparison against{" "}
            <span className="text-on-surface font-semibold">
              {program.name}
            </span>{" "}
            admission requirements.
          </p>
        </div>

        {/* Admission Chance Ring */}
        <div className="bg-surface-container-lowest p-6 rounded-lg editorial-shadow flex flex-col items-center min-w-[140px]">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" fill="transparent" r="44" stroke="#eceef0" strokeWidth="4" />
              <circle
                cx="48" cy="48" fill="transparent" r="44"
                className={scoreColor}
                strokeDasharray={Math.round(circumference).toString()}
                strokeDashoffset={dashoffset.toString()}
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-2xl font-bold font-headline">
              {audit.overallScore}%
            </span>
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-primary">
            Match Score
          </p>
          <p className="text-[10px] text-secondary mt-1">
            {audit.parameters.filter(p => p.status === "exceeds" || p.status === "meets" || p.status === "not_required").length}/{audit.parameters.filter(p => p.weight > 0).length} parameters met
          </p>
        </div>
      </div>

      {/* ── Verdict Banner ──────────────────────────────── */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className={`p-6 rounded-xl ${criticalParams.length >= 2 ? "bg-error/5 border border-error/20" : criticalParams.length === 1 ? "bg-secondary/5 border border-secondary/20" : "bg-tertiary-fixed/10 border border-tertiary/20"}`}>
          <div className="flex items-start gap-3">
            <span className={`material-symbols-outlined mt-0.5 ${criticalParams.length >= 2 ? "text-error" : criticalParams.length === 1 ? "text-secondary" : "text-tertiary"}`}>
              {criticalParams.length >= 2 ? "warning" : criticalParams.length === 1 ? "info" : "task_alt"}
            </span>
            <div>
              <p className="font-bold text-on-surface mb-1">Assessment Verdict</p>
              <p className="text-sm text-secondary leading-relaxed">{audit.verdict}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Admission Probability + Hard Filters + Country Alerts ── */}
      <div className="max-w-6xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Admission Probability */}
        <div className="bg-surface-container-lowest p-5 rounded-xl editorial-shadow">
          <p className="text-[10px] uppercase tracking-widest text-secondary mb-2">Estimated Admission Probability</p>
          <p className="text-2xl font-bold font-headline text-on-surface">
            {audit.admissionProbability.low}–{audit.admissionProbability.high}%
          </p>
          <p className={`text-xs font-semibold mt-1 ${
            audit.admissionProbability.label === "Strong" ? "text-tertiary" :
            audit.admissionProbability.label === "Competitive" ? "text-primary" :
            audit.admissionProbability.label === "Moderate" ? "text-secondary" : "text-error"
          }`}>
            {audit.admissionProbability.label}
          </p>
          <p className="text-[10px] text-secondary mt-2 leading-relaxed">
            Based on sigmoid probability model calibrated to program selectivity. SOP/LOR quality (unmeasurable) can shift this significantly.
          </p>
        </div>

        {/* Hard Filter Status */}
        <div className={`p-5 rounded-xl ${audit.hardFiltersFailed.length > 0 ? "bg-error/5 border border-error/20" : "bg-tertiary-fixed/5 border border-tertiary/10"}`}>
          <p className="text-[10px] uppercase tracking-widest text-secondary mb-2">Hard Filter Check</p>
          {audit.hardFiltersFailed.length > 0 ? (
            <div>
              <p className="text-sm font-bold text-error mb-2">
                {audit.hardFiltersFailed.length} Auto-Reject Risk{audit.hardFiltersFailed.length > 1 ? "s" : ""}
              </p>
              <div className="space-y-1.5">
                {audit.hardFiltersFailed.map((hf, i) => (
                  <p key={i} className="text-xs text-error/80 flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-xs mt-0.5">block</span>
                    {hf}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-bold text-tertiary flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                All Hard Filters Passed
              </p>
              <p className="text-xs text-secondary mt-1">No auto-reject triggers detected. Your application will receive full review.</p>
            </div>
          )}
        </div>

        {/* Country Context */}
        <div className="bg-surface-container-lowest p-5 rounded-xl editorial-shadow">
          <p className="text-[10px] uppercase tracking-widest text-secondary mb-2">
            How {program.university.country} Evaluates
          </p>
          <p className="text-xs text-secondary leading-relaxed">{audit.countryContext}</p>
        </div>
      </div>

      {/* Country-Specific Alerts */}
      {audit.countryAlerts.length > 0 && (
        <div className="max-w-6xl mx-auto mb-8 space-y-3">
          {audit.countryAlerts.map((alert, i) => (
            <div key={i} className={`p-4 rounded-lg flex items-start gap-3 ${
              alert.severity === "blocker" ? "bg-error/5 border border-error/20" :
              alert.severity === "warning" ? "bg-secondary/5 border border-secondary/20" :
              "bg-surface-container-low border border-surface-container"
            }`}>
              <span className={`material-symbols-outlined text-sm mt-0.5 ${
                alert.severity === "blocker" ? "text-error" :
                alert.severity === "warning" ? "text-secondary" : "text-primary"
              }`}>
                {alert.severity === "blocker" ? "gpp_bad" : alert.severity === "warning" ? "warning" : "info"}
              </span>
              <div>
                <p className="text-sm font-bold text-on-surface">{alert.title}</p>
                <p className="text-xs text-secondary leading-relaxed mt-0.5">{alert.description}</p>
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${
                alert.severity === "blocker" ? "bg-error/10 text-error" :
                alert.severity === "warning" ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"
              }`}>
                {alert.type.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Bento Grid ──────────────────────────────────── */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Parameters & Roadmap */}
        <div className="lg:col-span-2 space-y-8">

          {/* ── Parameter-by-Parameter Breakdown ────────── */}
          <div className="bg-surface-container-lowest p-8 rounded-xl editorial-shadow">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold font-headline flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">
                  analytics
                </span>
                Requirement-by-Requirement Analysis
              </h3>
              <span className="text-[10px] font-semibold px-3 py-1 bg-primary-container text-on-primary rounded-full uppercase tracking-wider">
                {audit.parameters.filter(p => p.weight > 0).length} Parameters
              </span>
            </div>

            <div className="space-y-1">
              {audit.parameters.filter(p => p.weight > 0).map((param) => {
                const si = statusIcon(param.status);
                return (
                  <div key={param.name} className="border border-surface-container rounded-lg p-5 hover:border-primary/20 transition-colors">
                    {/* Parameter Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined ${si.color}`}>
                          {si.icon}
                        </span>
                        <div>
                          <p className="font-bold text-on-surface">{param.name}</p>
                          <p className="text-xs text-secondary">
                            {param.category.replace("_", " ")} · Weight: {param.weight}%
                            {param.isHardFilter && <span className="ml-1 text-error font-semibold">(hard filter)</span>}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusBg(param.status)}`}>
                        {statusLabel(param.status)}
                      </span>
                    </div>

                    {/* Comparison Bar */}
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="bg-surface-container-low rounded-md px-3 py-2">
                        <p className="text-[10px] uppercase tracking-widest text-secondary mb-0.5">Your Profile</p>
                        <p className="text-sm font-semibold text-on-surface">{param.studentValue}</p>
                      </div>
                      <div className="bg-surface-container-low rounded-md px-3 py-2">
                        <p className="text-[10px] uppercase tracking-widest text-secondary mb-0.5">Requirement</p>
                        <p className="text-sm font-semibold text-on-surface">{param.requiredValue}</p>
                      </div>
                    </div>

                    {/* Score Bar */}
                    <div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all ${
                          param.status === "exceeds" ? "bg-tertiary" :
                          param.status === "meets" || param.status === "not_required" ? "bg-primary" :
                          param.status === "borderline" ? "bg-secondary" :
                          "bg-error"
                        }`}
                        style={{ width: `${param.score}%` }}
                      />
                    </div>

                    {/* Gap & Recommendation */}
                    {param.gap && (
                      <p className="text-xs text-error/80 mt-2 flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-xs mt-0.5">trending_down</span>
                        {param.gap}
                      </p>
                    )}
                    {param.recommendation && (
                      <p className="text-xs text-secondary mt-1 flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-xs mt-0.5">lightbulb</span>
                        {param.recommendation}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Document Requirements (non-weighted) */}
              {audit.parameters.filter(p => p.weight === 0).map((param) => (
                <div key={param.name} className="border border-surface-container rounded-lg p-5 bg-surface-container-low/30">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-secondary">description</span>
                      <p className="font-bold text-on-surface">{param.name}</p>
                    </div>
                  </div>
                  <p className="text-sm text-secondary">{param.requiredValue}</p>
                  {param.recommendation && (
                    <p className="text-xs text-secondary mt-2 flex items-start gap-1.5">
                      <span className="material-symbols-outlined text-xs mt-0.5">lightbulb</span>
                      {param.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Improvement Roadmap ─────────────────────── */}
          {audit.roadmap.length > 0 && (
            <div className="bg-surface-container-low p-8 rounded-xl">
              <h3 className="text-xl font-bold font-headline mb-2 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">
                  route
                </span>
                Personalized Improvement Roadmap
              </h3>
              <p className="text-sm text-secondary mb-6">
                {audit.roadmap.filter(r => r.priority === "critical").length > 0
                  ? `${audit.roadmap.filter(r => r.priority === "critical").length} critical action(s) needed before applying`
                  : "Action items ranked by impact on your admission chances"}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {audit.roadmap.map((item, idx) => {
                  const ps = priorityStyle(item.priority);
                  return (
                    <div
                      key={idx}
                      className={`bg-surface-container-lowest p-6 rounded-lg flex flex-col gap-3 ${
                        item.priority === "critical" ? "ring-1 ring-error/30" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`w-8 h-8 rounded-full ${ps.bg} flex items-center justify-center font-bold text-sm`}>
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${ps.color}`}>
                          {ps.label}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-on-surface mb-1">{item.title}</p>
                        <p className="text-sm text-secondary leading-relaxed">{item.description}</p>
                      </div>
                      <div className="mt-auto pt-2 border-t border-surface-container">
                        <p className="text-[10px] text-secondary uppercase tracking-wider mb-0.5">Impact</p>
                        <p className="text-xs text-on-surface font-medium">{item.impact}</p>
                        {item.timeEstimate && (
                          <p className="text-[10px] text-secondary mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">schedule</span>
                            {item.timeEstimate}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Column ──────────────────────────────── */}
        <div className="space-y-8">
          {/* Strengths & Risks */}
          {(audit.strengths.length > 0 || audit.risks.length > 0) && (
            <div className="bg-surface-container-lowest p-8 rounded-xl editorial-shadow">
              <h3 className="text-lg font-bold font-headline mb-5">
                Profile Summary
              </h3>

              {audit.strengths.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-tertiary mb-3">
                    Strengths
                  </p>
                  <div className="space-y-3">
                    {audit.strengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-tertiary text-sm mt-0.5">check_circle</span>
                        <p className="text-xs text-secondary leading-relaxed">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {audit.risks.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-error mb-3">
                    Risk Factors
                  </p>
                  <div className="space-y-3">
                    {audit.risks.map((r, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-error text-sm mt-0.5">warning</span>
                        <p className="text-xs text-secondary leading-relaxed">{r}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Program & University Facts (real data only) */}
          <div className="bg-on-surface text-white p-8 rounded-xl editorial-shadow overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container opacity-20 blur-3xl -mr-16 -mt-16" />
            <h3 className="text-lg font-bold font-headline mb-6 border-b border-secondary/30 pb-4">
              Program Facts
            </h3>
            <div className="space-y-5">
              {acceptanceRate && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary-container">Acceptance Rate</span>
                  <span className="font-bold font-headline">{acceptanceRate}</span>
                </div>
              )}
              {program.university.qsRanking && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary-container">QS Ranking</span>
                  <span className="font-bold font-headline">#{program.university.qsRanking}</span>
                </div>
              )}
              {program.university.theRanking && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary-container">THE Ranking</span>
                  <span className="font-bold font-headline">#{program.university.theRanking}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-container">Duration</span>
                <span className="font-bold font-headline">{program.durationMonths} months</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-container">Tuition</span>
                <span className="font-bold font-headline">{formatTuition(program.tuitionAnnual, program.tuitionCurrency)}</span>
              </div>
              {program.university.internationalPct != null && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary-container">Intl. Students</span>
                  <span className="font-bold font-headline">{(program.university.internationalPct * 100).toFixed(0)}%</span>
                </div>
              )}
              {program.university.employmentRate != null && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary-container">Employment Rate</span>
                  <span className="font-bold font-headline">{(program.university.employmentRate * 100).toFixed(0)}%</span>
                </div>
              )}
              {program.placementRate != null && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary-container">Placement Rate</span>
                  <span className="font-bold font-headline">{(program.placementRate * 100).toFixed(0)}%</span>
                </div>
              )}
              {program.scholarshipsCount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary-container">Scholarships</span>
                  <span className="font-bold font-headline">{program.scholarshipsCount} available</span>
                </div>
              )}
              {program.stemDesignated && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary-container">STEM Designated</span>
                  <span className="font-bold font-headline text-tertiary-fixed">Yes</span>
                </div>
              )}
              {program.university.postStudyWorkVisa && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary-container">Post-Study Work</span>
                  <span className="font-bold font-headline text-sm">{program.university.postStudyWorkVisa}</span>
                </div>
              )}
            </div>

            {/* Data Confidence */}
            <div className="mt-8 pt-5 border-t border-secondary/30">
              <p className="text-[10px] uppercase tracking-widest text-secondary-container mb-3">
                Data Confidence
              </p>
              <p className="text-[10px] text-secondary-container italic leading-relaxed">
                {audit.confidenceNote}
              </p>
            </div>
          </div>

          {/* University Card */}
          <div className="rounded-xl overflow-hidden relative group">
            <div className="w-full h-48 bg-surface-container flex items-center justify-center">
              {universityLogoUrl ? (
                <Image
                  src={universityLogoUrl}
                  alt={program.university.name}
                  width={128}
                  height={128}
                  className="w-24 h-24 object-contain"
                  unoptimized
                />
              ) : (
                <span className="material-symbols-outlined text-6xl text-outline-variant">
                  school
                </span>
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-on-surface via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-white font-bold text-lg leading-tight">
                {program.university.name}
              </p>
              <p className="text-white/70 text-xs uppercase tracking-widest font-semibold">
                {program.university.city}, {program.university.country}
              </p>
            </div>
          </div>

          {/* Quick Stats: What You Need */}
          {program.applicationDeadline && (
            <div className="bg-surface-container-lowest p-6 rounded-xl editorial-shadow">
              <h3 className="text-sm font-bold font-headline mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">event</span>
                Key Dates
              </h3>
              <div className="space-y-2">
                {program.earlyDeadline && (
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Early Deadline</span>
                    <span className="font-semibold">{formatDeadline(program.earlyDeadline)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Final Deadline</span>
                  <span className="font-semibold">{deadline}</span>
                </div>
                {program.intakesAvailable.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Intakes</span>
                    <span className="font-semibold text-right">{program.intakesAvailable.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Apply Now Section ──────────────────────────── */}
      <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-surface-container">
        <div className="bg-gradient-to-br from-surface-container-lowest to-surface-container p-8 rounded-2xl editorial-shadow">
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            {/* Left: CTA */}
            <div className="flex-1">
              <h3 className="text-2xl font-extrabold font-headline text-on-surface mb-2">
                Ready to Apply?
              </h3>
              <p className="text-sm text-secondary leading-relaxed mb-4">
                {audit.hardFiltersFailed.length > 0
                  ? `We recommend addressing ${audit.hardFiltersFailed.length} critical gap(s) before applying. But you can start preparing your application workspace now.`
                  : audit.overallScore >= 70
                  ? "Your profile looks competitive. Start your application workspace to organize documents, draft your SOP, and track your progress."
                  : "Start your application workspace to organize everything you need. Our tools will guide you through each step."}
              </p>

              {/* What you get */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">checklist</span>
                  <span className="text-xs text-on-surface">Smart document checklist</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">edit_note</span>
                  <span className="text-xs text-on-surface">AI-guided SOP drafting</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">mail</span>
                  <span className="text-xs text-on-surface">LOR templates & tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">timeline</span>
                  <span className="text-xs text-on-surface">Personalized timeline</span>
                </div>
              </div>

              <div className="max-w-sm">
                <ApplyNowButton
                  programId={program.id}
                  matchScore={audit.overallScore}
                  universityName={program.university.name}
                />
              </div>

              <p className="text-[10px] text-secondary mt-3">
                We help you organize and optimize — we do not submit applications on your behalf.
                You apply directly on the university portal.
              </p>
            </div>

            {/* Right: Quick summary */}
            <div className="bg-on-surface text-white p-6 rounded-xl w-full lg:w-72 shrink-0">
              <p className="text-xs uppercase tracking-widest text-secondary-container mb-4">
                Application Summary
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary-container">Match Score</span>
                  <span className="font-bold">{audit.overallScore}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-container">Admission Chance</span>
                  <span className="font-bold">
                    {audit.admissionProbability.low}–{audit.admissionProbability.high}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-container">Deadline</span>
                  <span className="font-bold text-sm">{deadline}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-container">Hard Filters</span>
                  <span className={`font-bold ${audit.hardFiltersFailed.length > 0 ? "text-error" : "text-tertiary-fixed"}`}>
                    {audit.hardFiltersFailed.length > 0
                      ? `${audit.hardFiltersFailed.length} Failed`
                      : "All Passed"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
