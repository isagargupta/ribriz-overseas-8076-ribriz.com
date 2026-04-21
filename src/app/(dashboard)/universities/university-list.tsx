"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";

export type AdmissionBucket = "safety" | "target" | "reach" | "long_shot";

export interface UniversityItem {
  programId: string;
  name: string;
  country: string;
  countryFlag: string;
  city: string;
  courseName: string;
  logoUrl: string | null;
  tuition: string;
  tuitionRaw: number;
  tuitionCurrency: string;
  tuitionPeriod: string;
  qsRanking: number;
  matchScore: number;
  field: string;
  subField: string;
  degreeLevel: string;
  intake: string;
  intakesAvailable: string[];
  durationMonths: number;
  universityType: string;
  stemDesignated: boolean;
  coopInternship: boolean;
  scholarshipsCount: number;
  hasAssistantship: boolean;
  hasFellowship: boolean;
  backlogsAllowed: number | null;
  requiresGre: boolean;
  requiresGmat: boolean;
  badge: string;
  badgeColor: string;
  bucket: AdmissionBucket;
  isShortlisted: boolean;
}

export interface ProfileInsights {
  archetype: string;
  overallStrength: string;
  completeness: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  bucketCounts: Record<AdmissionBucket, number>;
  totalMatches: number;
  shortlistedCount: number;
  targetField: string;
  targetCountries: string[];
}

const ITEMS_PER_PAGE = 8;

type SortOption = "match_desc" | "match_asc" | "rank_asc" | "rank_desc" | "tuition_asc" | "tuition_desc" | "name_asc";

const SORT_LABELS: Record<SortOption, string> = {
  match_desc: "Best Match", match_asc: "Lowest Match", rank_asc: "QS Rank (Top First)",
  rank_desc: "QS Rank (Lowest First)", tuition_asc: "Tuition (Low to High)",
  tuition_desc: "Tuition (High to Low)", name_asc: "Name (A-Z)",
};

const DEGREE_LABELS: Record<string, string> = { masters: "Master's", mba: "MBA", bachelors: "Bachelor's" };

const DURATION_OPTIONS = [
  { label: "< 1 Year", max: 12 }, { label: "1 Year", min: 12, max: 12 },
  { label: "1.5 Years", min: 13, max: 18 }, { label: "2 Years", min: 19, max: 24 },
  { label: "2+ Years", min: 25 },
];

const BUCKET_META: Record<AdmissionBucket, { label: string; icon: string; color: string; bgColor: string; advice: string }> = {
  safety: { label: "Safety", icon: "verified_user", color: "text-green-700", bgColor: "bg-green-50 border-green-200", advice: "High admission confidence. Include 2-3." },
  target: { label: "Target", icon: "ads_click", color: "text-on-surface", bgColor: "bg-surface-container border-outline-variant/30", advice: "Realistic chance. Core of your list (3-5)." },
  reach: { label: "Reach", icon: "rocket_launch", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200", advice: "Competitive. Worth trying with strong SOP (2-3)." },
  long_shot: { label: "Ambitious", icon: "star", color: "text-red-700", bgColor: "bg-red-50 border-red-200", advice: "Significant gaps. Only with exceptional factors." },
};

type BucketTab = "all" | AdmissionBucket | "shortlisted";

/* ── Collapsible filter section ─────────────────────── */
function FilterSection({ title, defaultOpen = true, children, count }: { title: string; defaultOpen?: boolean; children: React.ReactNode; count?: number }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-surface-container pb-4">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full text-left group">
        <span className="text-xs font-semibold text-outline-variant uppercase tracking-wider">
          {title}
          {count !== undefined && count > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-on-primary text-[9px] font-bold">{count}</span>
          )}
        </span>
        <span className="material-symbols-outlined text-outline-variant text-sm transition-transform duration-200" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>expand_more</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

export default function UniversityList({
  universities,
  summaryLine,
  totalCount,
  insights,
  isLimited = false,
  totalUnlocked = 0,
}: {
  universities: UniversityItem[];
  summaryLine: string;
  totalCount: number;
  insights: ProfileInsights;
  isLimited?: boolean;
  totalUnlocked?: number;
}) {
  /* ── Filter state ───────────────────────────────────── */
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [selectedDegrees, setSelectedDegrees] = useState<Set<string>>(new Set());
  const [selectedIntakes, setSelectedIntakes] = useState<Set<string>>(new Set());
  const [selectedDurations, setSelectedDurations] = useState<Set<number>>(new Set());
  const [selectedUniTypes, setSelectedUniTypes] = useState<Set<string>>(new Set());
  const [maxTuition, setMaxTuition] = useState(100);
  const [minRank, setMinRank] = useState("");
  const [maxRank, setMaxRank] = useState("");
  const [minMatch, setMinMatch] = useState(0);
  const [stemOnly, setStemOnly] = useState(false);
  const [coopOnly, setCoopOnly] = useState(false);
  const [scholarshipOnly, setScholarshipOnly] = useState(false);
  const [fundingOnly, setFundingOnly] = useState(false);
  const [backlogsOk, setBacklogsOk] = useState(false);
  const [noGreRequired, setNoGreRequired] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("match_desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  /* ── Agentic state ──────────────────────────────────── */
  const [activeBucket, setActiveBucket] = useState<BucketTab>("all");
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(() =>
    new Set(universities.filter((u) => u.isShortlisted).map((u) => u.programId))
  );
  const [loadingShortlist, setLoadingShortlist] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [showInsights, setShowInsights] = useState(true);

  /* ── Shortlist action ───────────────────────────────── */
  const toggleShortlist = useCallback(async (programId: string, matchScore: number) => {
    setLoadingShortlist((prev) => new Set(prev).add(programId));
    try {
      if (shortlistedIds.has(programId)) {
        // Get application ID first, then delete
        const res = await fetch("/api/applications");
        const data = await res.json();
        const app = data.applications?.find((a: { programId: string }) => a.programId === programId);
        if (app) {
          await fetch("/api/applications", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ applicationId: app.id }),
          });
        }
        setShortlistedIds((prev) => { const next = new Set(prev); next.delete(programId); return next; });
      } else {
        await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ programId, matchScore }),
        });
        setShortlistedIds((prev) => new Set(prev).add(programId));
      }
    } catch (e) {
      console.error("Shortlist error:", e);
    } finally {
      setLoadingShortlist((prev) => { const next = new Set(prev); next.delete(programId); return next; });
    }
  }, [shortlistedIds]);

  /* ── Smart Portfolio Builder ────────────────────────── */
  const buildPortfolio = useCallback(async () => {
    // Pick a balanced mix: 2 safety, 3 target, 2 reach
    const buckets: Record<AdmissionBucket, UniversityItem[]> = { safety: [], target: [], reach: [], long_shot: [] };
    universities.forEach((u) => { if (!shortlistedIds.has(u.programId)) buckets[u.bucket].push(u); });

    const picks: UniversityItem[] = [
      ...buckets.safety.slice(0, 2),
      ...buckets.target.slice(0, 3),
      ...buckets.reach.slice(0, 2),
    ];

    for (const pick of picks) {
      if (!shortlistedIds.has(pick.programId)) {
        await toggleShortlist(pick.programId, pick.matchScore);
        // Small delay to avoid race conditions
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }, [universities, shortlistedIds, toggleShortlist]);

  /* ── Derive filter options ──────────────────────────── */
  const filterOptions = useMemo(() => {
    const countries = new Map<string, { flag: string; count: number }>();
    const fields = new Map<string, number>();
    const degrees = new Map<string, number>();
    const intakes = new Map<string, number>();
    const uniTypes = new Map<string, number>();
    universities.forEach((u) => {
      const existing = countries.get(u.country);
      if (existing) existing.count++; else countries.set(u.country, { flag: u.countryFlag, count: 1 });
      fields.set(u.field, (fields.get(u.field) ?? 0) + 1);
      degrees.set(u.degreeLevel, (degrees.get(u.degreeLevel) ?? 0) + 1);
      if (u.intake) { const season = u.intake.split(" ")[0]; intakes.set(season, (intakes.get(season) ?? 0) + 1); }
      u.intakesAvailable.forEach((ia) => { const season = ia.split(" ")[0]; if (!intakes.has(season)) intakes.set(season, 0); });
      if (u.universityType) uniTypes.set(u.universityType, (uniTypes.get(u.universityType) ?? 0) + 1);
    });
    return {
      countries: Array.from(countries.entries()).map(([name, { flag, count }]) => ({ name, flag, count })).sort((a, b) => b.count - a.count),
      fields: Array.from(fields.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      degrees: Array.from(degrees.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      intakes: Array.from(intakes.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => { const order = ["Fall", "Spring", "Winter", "Summer"]; return (order.indexOf(a.name) ?? 99) - (order.indexOf(b.name) ?? 99); }),
      uniTypes: Array.from(uniTypes.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    };
  }, [universities]);

  const toggleSet = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) => {
    setter((prev) => { const next = new Set(prev); if (next.has(value)) next.delete(value); else next.add(value); return next; });
    setPage(1);
  }, []);

  const activeFilterCount =
    selectedCountries.size + selectedFields.size + selectedDegrees.size + selectedIntakes.size +
    selectedDurations.size + selectedUniTypes.size + (maxTuition < 100 ? 1 : 0) +
    (minRank || maxRank ? 1 : 0) + (minMatch > 0 ? 1 : 0) + (stemOnly ? 1 : 0) +
    (coopOnly ? 1 : 0) + (scholarshipOnly ? 1 : 0) + (fundingOnly ? 1 : 0) +
    (backlogsOk ? 1 : 0) + (noGreRequired ? 1 : 0) + (searchQuery ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedCountries(new Set()); setSelectedFields(new Set()); setSelectedDegrees(new Set());
    setSelectedIntakes(new Set()); setSelectedDurations(new Set()); setSelectedUniTypes(new Set());
    setMaxTuition(100); setMinRank(""); setMaxRank(""); setMinMatch(0); setStemOnly(false);
    setCoopOnly(false); setScholarshipOnly(false); setFundingOnly(false); setBacklogsOk(false);
    setNoGreRequired(false); setSearchQuery(""); setPage(1);
  };

  /* ── Filtering + bucket logic ───────────────────────── */
  const filtered = useMemo(() => {
    let list = universities;

    // Bucket tab filter
    if (activeBucket === "shortlisted") {
      list = list.filter((u) => shortlistedIds.has(u.programId));
    } else if (activeBucket !== "all") {
      list = list.filter((u) => u.bucket === activeBucket);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((u) => u.name.toLowerCase().includes(q) || u.courseName.toLowerCase().includes(q) || u.field.toLowerCase().includes(q) || u.subField.toLowerCase().includes(q) || u.city.toLowerCase().includes(q) || u.country.toLowerCase().includes(q));
    }
    if (selectedCountries.size > 0) list = list.filter((u) => selectedCountries.has(u.country));
    if (selectedFields.size > 0) list = list.filter((u) => selectedFields.has(u.field));
    if (selectedDegrees.size > 0) list = list.filter((u) => selectedDegrees.has(u.degreeLevel));
    if (selectedIntakes.size > 0) list = list.filter((u) => { const mainSeason = u.intake?.split(" ")[0] ?? ""; if (selectedIntakes.has(mainSeason)) return true; return u.intakesAvailable.some((ia) => selectedIntakes.has(ia.split(" ")[0])); });
    if (selectedDurations.size > 0) list = list.filter((u) => Array.from(selectedDurations).some((idx) => { const opt = DURATION_OPTIONS[idx]; if (opt.min !== undefined && opt.max !== undefined) return u.durationMonths >= opt.min && u.durationMonths <= opt.max; if (opt.max !== undefined) return u.durationMonths <= opt.max; if (opt.min !== undefined) return u.durationMonths >= opt.min; return true; }));
    if (selectedUniTypes.size > 0) list = list.filter((u) => selectedUniTypes.has(u.universityType));
    if (maxTuition < 100) list = list.filter((u) => u.tuitionRaw / 1000 <= maxTuition);
    const minR = minRank ? parseInt(minRank) : 0;
    const maxR = maxRank ? parseInt(maxRank) : Infinity;
    if (minR > 0 || maxR < Infinity) list = list.filter((u) => u.qsRanking >= minR && u.qsRanking <= maxR);
    if (minMatch > 0) list = list.filter((u) => u.matchScore >= minMatch);
    if (stemOnly) list = list.filter((u) => u.stemDesignated);
    if (coopOnly) list = list.filter((u) => u.coopInternship);
    if (scholarshipOnly) list = list.filter((u) => u.scholarshipsCount > 0);
    if (fundingOnly) list = list.filter((u) => u.hasAssistantship || u.hasFellowship);
    if (backlogsOk) list = list.filter((u) => u.backlogsAllowed !== null && u.backlogsAllowed > 0);
    if (noGreRequired) list = list.filter((u) => !u.requiresGre);

    const sorted = [...list];
    switch (sortBy) {
      case "match_desc": sorted.sort((a, b) => b.matchScore - a.matchScore); break;
      case "match_asc": sorted.sort((a, b) => a.matchScore - b.matchScore); break;
      case "rank_asc": sorted.sort((a, b) => a.qsRanking - b.qsRanking); break;
      case "rank_desc": sorted.sort((a, b) => b.qsRanking - a.qsRanking); break;
      case "tuition_asc": sorted.sort((a, b) => a.tuitionRaw - b.tuitionRaw); break;
      case "tuition_desc": sorted.sort((a, b) => b.tuitionRaw - a.tuitionRaw); break;
      case "name_asc": sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return sorted;
  }, [universities, activeBucket, shortlistedIds, searchQuery, selectedCountries, selectedFields, selectedDegrees, selectedIntakes, selectedDurations, selectedUniTypes, maxTuition, minRank, maxRank, minMatch, stemOnly, coopOnly, scholarshipOnly, fundingOnly, backlogsOk, noGreRequired, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedItems = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  /* ── Active filter chips ────────────────────────────── */
  const activeChips: { label: string; onRemove: () => void }[] = [];
  selectedCountries.forEach((c) => activeChips.push({ label: c, onRemove: () => toggleSet(setSelectedCountries, c) }));
  selectedFields.forEach((f) => activeChips.push({ label: f, onRemove: () => toggleSet(setSelectedFields, f) }));
  selectedDegrees.forEach((d) => activeChips.push({ label: DEGREE_LABELS[d] ?? d, onRemove: () => toggleSet(setSelectedDegrees, d) }));
  selectedIntakes.forEach((i) => activeChips.push({ label: `${i} Intake`, onRemove: () => toggleSet(setSelectedIntakes, i) }));
  selectedDurations.forEach((idx) => activeChips.push({ label: DURATION_OPTIONS[idx].label, onRemove: () => toggleSet(setSelectedDurations, idx) }));
  selectedUniTypes.forEach((t) => activeChips.push({ label: `${t.charAt(0).toUpperCase()}${t.slice(1)}`, onRemove: () => toggleSet(setSelectedUniTypes, t) }));
  if (maxTuition < 100) activeChips.push({ label: `Tuition < $${maxTuition}k`, onRemove: () => setMaxTuition(100) });
  if (minRank || maxRank) activeChips.push({ label: `QS ${minRank || "1"}-${maxRank || "500+"}`, onRemove: () => { setMinRank(""); setMaxRank(""); } });
  if (minMatch > 0) activeChips.push({ label: `Match >= ${minMatch}%`, onRemove: () => setMinMatch(0) });
  if (stemOnly) activeChips.push({ label: "STEM", onRemove: () => setStemOnly(false) });
  if (coopOnly) activeChips.push({ label: "Co-op", onRemove: () => setCoopOnly(false) });
  if (scholarshipOnly) activeChips.push({ label: "Scholarships", onRemove: () => setScholarshipOnly(false) });
  if (fundingOnly) activeChips.push({ label: "Funding", onRemove: () => setFundingOnly(false) });
  if (backlogsOk) activeChips.push({ label: "Backlogs OK", onRemove: () => setBacklogsOk(false) });
  if (noGreRequired) activeChips.push({ label: "No GRE", onRemove: () => setNoGreRequired(false) });

  /* ── Filter sidebar content ─────────────────────────── */
  const filterContent = (
    <div className="space-y-5">
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-base">search</span>
        <input type="text" placeholder="Search universities, courses..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} className="w-full pl-9 pr-3 py-2.5 bg-surface-container-lowest border-none text-sm focus:ring-1 focus:ring-primary placeholder:text-outline" />
      </div>
      <FilterSection title="Country" count={selectedCountries.size}>
        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
          {filterOptions.countries.map(({ name, flag, count }) => (
            <label key={name} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-surface-container-high px-1 -mx-1 transition-colors">
              <input type="checkbox" checked={selectedCountries.has(name)} onChange={() => toggleSet(setSelectedCountries, name)} className="w-3.5 h-3.5 rounded-sm border-outline-variant text-primary focus:ring-primary" />
              <span className="text-sm flex-1 flex items-center gap-1.5">{flag && <span className="text-base">{flag}</span>}{name}</span>
              <span className="text-[10px] text-outline tabular-nums">{count}</span>
            </label>
          ))}
        </div>
      </FilterSection>
      <FilterSection title="Field of Study" count={selectedFields.size}>
        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
          {filterOptions.fields.map(({ name, count }) => (
            <label key={name} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-surface-container-high px-1 -mx-1 transition-colors">
              <input type="checkbox" checked={selectedFields.has(name)} onChange={() => toggleSet(setSelectedFields, name)} className="w-3.5 h-3.5 rounded-sm border-outline-variant text-primary focus:ring-primary" />
              <span className="text-sm flex-1 truncate">{name}</span>
              <span className="text-[10px] text-outline tabular-nums">{count}</span>
            </label>
          ))}
        </div>
      </FilterSection>
      {filterOptions.degrees.length > 1 && (
        <FilterSection title="Degree Level" count={selectedDegrees.size}>
          <div className="flex flex-wrap gap-2">
            {filterOptions.degrees.map(({ name, count }) => (
              <button key={name} onClick={() => toggleSet(setSelectedDegrees, name)} className={`px-3 py-1.5 text-xs font-semibold border transition-all ${selectedDegrees.has(name) ? "bg-primary text-on-primary border-primary" : "bg-surface-container-lowest text-on-surface-variant border-surface-container hover:border-primary"}`}>
                {DEGREE_LABELS[name] ?? name}<span className="ml-1 opacity-60">({count})</span>
              </button>
            ))}
          </div>
        </FilterSection>
      )}
      {filterOptions.intakes.length > 0 && (
        <FilterSection title="Intake Season" count={selectedIntakes.size} defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {filterOptions.intakes.map(({ name, count }) => (
              <button key={name} onClick={() => toggleSet(setSelectedIntakes, name)} className={`px-3 py-1.5 text-xs font-semibold border transition-all ${selectedIntakes.has(name) ? "bg-primary text-on-primary border-primary" : "bg-surface-container-lowest text-on-surface-variant border-surface-container hover:border-primary"}`}>
                {name}{count > 0 && <span className="ml-1 opacity-60">({count})</span>}
              </button>
            ))}
          </div>
        </FilterSection>
      )}
      <FilterSection title="Program Duration" count={selectedDurations.size} defaultOpen={false}>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((opt, idx) => (
            <button key={idx} onClick={() => toggleSet(setSelectedDurations, idx)} className={`px-3 py-1.5 text-xs font-semibold border transition-all ${selectedDurations.has(idx) ? "bg-primary text-on-primary border-primary" : "bg-surface-container-lowest text-on-surface-variant border-surface-container hover:border-primary"}`}>{opt.label}</button>
          ))}
        </div>
      </FilterSection>
      <FilterSection title="Max Annual Tuition" count={maxTuition < 100 ? 1 : 0}>
        <div>
          <input type="range" min={5} max={100} step={5} value={maxTuition} onChange={(e) => { setMaxTuition(Number(e.target.value)); setPage(1); }} className="w-full accent-primary" />
          <div className="flex justify-between text-[10px] font-medium text-outline mt-1"><span>$5k</span><span className="text-xs font-bold text-on-surface">{maxTuition >= 100 ? "Any" : `$${maxTuition}k`}</span><span>$100k+</span></div>
        </div>
      </FilterSection>
      <FilterSection title="QS Ranking" count={minRank || maxRank ? 1 : 0} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-[10px] text-outline mb-1 block">From</label><input type="number" placeholder="1" value={minRank} onChange={(e) => { setMinRank(e.target.value); setPage(1); }} className="w-full bg-surface-container-lowest border-none py-2 px-3 text-sm focus:ring-1 focus:ring-primary" /></div>
          <div><label className="text-[10px] text-outline mb-1 block">To</label><input type="number" placeholder="500" value={maxRank} onChange={(e) => { setMaxRank(e.target.value); setPage(1); }} className="w-full bg-surface-container-lowest border-none py-2 px-3 text-sm focus:ring-1 focus:ring-primary" /></div>
        </div>
      </FilterSection>
      <FilterSection title="Minimum Match Score" count={minMatch > 0 ? 1 : 0} defaultOpen={false}>
        <div>
          <input type="range" min={0} max={95} step={5} value={minMatch} onChange={(e) => { setMinMatch(Number(e.target.value)); setPage(1); }} className="w-full accent-primary" />
          <div className="flex justify-between text-[10px] font-medium text-outline mt-1"><span>Any</span><span className="text-xs font-bold text-on-surface">{minMatch === 0 ? "Any" : `${minMatch}%+`}</span><span>95%</span></div>
        </div>
      </FilterSection>
      {filterOptions.uniTypes.length > 0 && (
        <FilterSection title="University Type" count={selectedUniTypes.size} defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {filterOptions.uniTypes.map(({ name, count }) => (
              <button key={name} onClick={() => toggleSet(setSelectedUniTypes, name)} className={`px-3 py-1.5 text-xs font-semibold border capitalize transition-all ${selectedUniTypes.has(name) ? "bg-primary text-on-primary border-primary" : "bg-surface-container-lowest text-on-surface-variant border-surface-container hover:border-primary"}`}>{name}<span className="ml-1 opacity-60">({count})</span></button>
            ))}
          </div>
        </FilterSection>
      )}
      <FilterSection title="Program Features" count={[stemOnly, coopOnly, scholarshipOnly, fundingOnly, backlogsOk, noGreRequired].filter(Boolean).length} defaultOpen={false}>
        <div className="space-y-2.5">
          {[
            { label: "STEM Designated (OPT)", icon: "biotech", value: stemOnly, toggle: () => { setStemOnly(!stemOnly); setPage(1); } },
            { label: "Co-op / Internship", icon: "work", value: coopOnly, toggle: () => { setCoopOnly(!coopOnly); setPage(1); } },
            { label: "Scholarships Available", icon: "school", value: scholarshipOnly, toggle: () => { setScholarshipOnly(!scholarshipOnly); setPage(1); } },
            { label: "Assistantship / Fellowship", icon: "paid", value: fundingOnly, toggle: () => { setFundingOnly(!fundingOnly); setPage(1); } },
            { label: "Backlogs Accepted", icon: "fact_check", value: backlogsOk, toggle: () => { setBacklogsOk(!backlogsOk); setPage(1); } },
            { label: "No GRE Required", icon: "quiz", value: noGreRequired, toggle: () => { setNoGreRequired(!noGreRequired); setPage(1); } },
          ].map(({ label, icon, value, toggle }) => (
            <label key={label} className="flex items-center gap-2.5 cursor-pointer py-0.5">
              <button onClick={toggle} className={`w-8 h-[18px] rounded-full relative transition-colors ${value ? "bg-primary" : "bg-surface-container"}`}>
                <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${value ? "left-[17px]" : "left-[2px]"}`} />
              </button>
              <span className="material-symbols-outlined text-outline text-base">{icon}</span>
              <span className="text-xs text-on-surface-variant">{label}</span>
            </label>
          ))}
        </div>
      </FilterSection>
      {activeFilterCount > 0 && (
        <button onClick={clearAllFilters} className="w-full py-2.5 text-xs font-semibold text-error hover:bg-error-container/20 transition-colors border border-error/20">
          Clear All Filters ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-[1400px] pb-20 md:pb-0">
      {/* Header */}
      <header className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-on-surface mb-2">Match Explorer</h1>
        <p className="text-sm sm:text-base text-on-surface-variant font-body max-w-2xl">{summaryLine}</p>
      </header>

      {/* ── AI Insights Bar ────────────────────────────── */}
      {showInsights && (
        <div className="mb-6 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border border-primary/10 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-lg">psychology</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  Riz AI Portfolio Intelligence
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">{insights.archetype}</span>
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Profile strength: <span className="font-bold capitalize text-on-surface">{insights.overallStrength}</span> ({insights.completeness}% complete)
                </p>
              </div>
            </div>
            <button onClick={() => setShowInsights(false)} className="text-outline hover:text-on-surface shrink-0">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          {/* Bucket distribution */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            {(["safety", "target", "reach", "long_shot"] as AdmissionBucket[]).map((bucket) => {
              const meta = BUCKET_META[bucket];
              return (
                <button key={bucket} onClick={() => { setActiveBucket(bucket); setPage(1); }} className={`p-3 border text-left transition-all hover:shadow-sm ${meta.bgColor} ${activeBucket === bucket ? "ring-2 ring-primary shadow-sm" : ""}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`material-symbols-outlined text-base ${meta.color}`}>{meta.icon}</span>
                    <span className={`text-xs font-bold uppercase tracking-wide ${meta.color}`}>{meta.label}</span>
                  </div>
                  <span className="text-2xl font-extrabold text-on-surface">{insights.bucketCounts[bucket]}</span>
                  <p className="text-[10px] text-on-surface-variant mt-0.5 leading-tight">{meta.advice}</p>
                </button>
              );
            })}
          </div>

          {/* Recommendations */}
          {insights.recommendations.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {insights.recommendations.map((rec, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-surface-container-lowest text-[11px] text-on-surface-variant border border-surface-container">
                  <span className="material-symbols-outlined text-primary text-xs">tips_and_updates</span>
                  {rec}
                </span>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => startTransition(() => { buildPortfolio(); })}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              {isPending ? "Building..." : "Build Smart Portfolio (7 schools)"}
            </button>
            <Link href="/riz-ai" className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-container-lowest text-primary text-xs font-bold border border-primary/20 hover:bg-primary/5 transition-all">
              <span className="material-symbols-outlined text-sm">chat</span>
              Ask Riz AI for Strategy
            </Link>
          </div>
        </div>
      )}

      {/* ── Bucket Tabs + Sort ─────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {/* Mobile filter toggle */}
        <button onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)} className="md:hidden flex items-center gap-1.5 px-3 py-2 bg-surface-container-low text-sm font-semibold border border-surface-container">
          <span className="material-symbols-outlined text-base">tune</span>Filters
          {activeFilterCount > 0 && <span className="ml-1 w-5 h-5 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>}
        </button>

        {/* Bucket tabs */}
        {([
          { key: "all" as BucketTab, label: "All", count: insights.totalMatches },
          { key: "safety" as BucketTab, label: "Safety", count: insights.bucketCounts.safety },
          { key: "target" as BucketTab, label: "Target", count: insights.bucketCounts.target },
          { key: "reach" as BucketTab, label: "Reach", count: insights.bucketCounts.reach },
          { key: "long_shot" as BucketTab, label: "Ambitious", count: insights.bucketCounts.long_shot },
          { key: "shortlisted" as BucketTab, label: "Shortlisted", count: shortlistedIds.size },
        ]).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => { setActiveBucket(key); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-semibold border transition-all ${activeBucket === key ? "bg-primary text-on-primary border-primary" : "bg-surface-container-lowest text-on-surface-variant border-surface-container hover:border-primary"}`}
          >
            {label}
            <span className="ml-1 opacity-70">({count})</span>
          </button>
        ))}

        {/* Active chips */}
        {activeChips.slice(0, 3).map((chip, i) => (
          <span key={`${chip.label}-${i}`} className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-primary-container/30 text-primary text-[11px] font-medium border border-primary/10">
            {chip.label}
            <button onClick={chip.onRemove} className="hover:text-error"><span className="material-symbols-outlined text-xs">close</span></button>
          </span>
        ))}
        {activeChips.length > 3 && <button onClick={clearAllFilters} className="text-[11px] text-error font-medium hover:underline">+{activeChips.length - 3} more</button>}

        {/* Sort + count */}
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs text-outline-variant font-medium hidden sm:block">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          <div className="relative">
            <select value={sortBy} onChange={(e) => { setSortBy(e.target.value as SortOption); setPage(1); }} className="appearance-none pl-3 pr-8 py-2 bg-surface-container-lowest border border-surface-container text-xs font-medium text-on-surface focus:ring-1 focus:ring-primary cursor-pointer">
              {Object.entries(SORT_LABELS).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">unfold_more</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* ── Mobile filter overlay ────────────────────── */}
        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-surface overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-secondary">Filters</h3>
                <button onClick={() => setMobileFiltersOpen(false)}><span className="material-symbols-outlined text-outline">close</span></button>
              </div>
              {filterContent}
            </aside>
          </div>
        )}

        {/* ── Desktop sidebar ──────────────────────────── */}
        <aside className="hidden md:block w-72 shrink-0">
          <div className="bg-surface-container-low p-5 sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
            <h3 className="text-sm font-bold uppercase tracking-widest text-secondary mb-5">Refine Results</h3>
            {filterContent}
          </div>
        </aside>

        {/* ── Results ──────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="space-y-px bg-surface-container-low border border-surface-container-low overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-surface-container-highest text-[11px] font-bold text-secondary uppercase tracking-widest">
              <div className="col-span-4">Institution & Program</div>
              <div className="col-span-1 text-center">Bucket</div>
              <div className="col-span-2 text-center">QS / Tuition</div>
              <div className="col-span-1 text-center">Duration</div>
              <div className="col-span-2 text-center">Match</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Rows */}
            {paginatedItems.length > 0 ? (
              paginatedItems.map((uni) => {
                const bucketMeta = BUCKET_META[uni.bucket];
                const isShortlisted = shortlistedIds.has(uni.programId);
                const isLoading = loadingShortlist.has(uni.programId);
                return (
                  <div key={uni.programId} className="md:grid md:grid-cols-12 md:gap-4 px-4 sm:px-6 py-4 sm:py-5 bg-surface-container-lowest hover:bg-surface-container-high transition-all group md:items-center">
                    {/* Institution & Program */}
                    <Link href={`/universities/${uni.programId}`} className="md:col-span-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-surface-container flex items-center justify-center shrink-0 overflow-hidden">
                        {uni.logoUrl ? (
                          <Image src={uni.logoUrl} alt={uni.name} width={40} height={40} className="w-full h-full object-contain" unoptimized />
                        ) : (
                          <span className="text-primary font-bold text-[10px]">{uni.name.slice(0, 3).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate">{uni.name}</h4>
                        <p className="text-xs text-on-surface-variant truncate">{uni.courseName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-outline">{uni.city}, {uni.country}</span>
                          {uni.stemDesignated && <span className="text-[9px] font-bold text-tertiary bg-tertiary-container/30 px-1 py-px">STEM</span>}
                          {uni.coopInternship && <span className="text-[9px] font-bold text-secondary bg-secondary-container/30 px-1 py-px">CO-OP</span>}
                          {uni.scholarshipsCount > 0 && <span className="text-[9px] font-bold text-primary bg-primary-container/30 px-1 py-px">AID</span>}
                        </div>
                      </div>
                      {/* Mobile match score */}
                      <div className="md:hidden relative w-10 h-10 shrink-0">
                        <svg className="w-full h-full" viewBox="0 0 36 36">
                          <circle className="stroke-surface-container" cx="18" cy="18" fill="none" r="16" strokeWidth="1.5" />
                          <circle className="stroke-primary" cx="18" cy="18" fill="none" r="16" strokeDasharray="100, 100" strokeDashoffset={100 - uni.matchScore} strokeLinecap="butt" strokeWidth="1.5" style={{ transition: "stroke-dashoffset 0.35s", transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary">{uni.matchScore}%</span>
                      </div>
                    </Link>

                    {/* Mobile meta */}
                    <div className="flex items-center gap-2 mt-2 ml-[52px] md:hidden text-xs text-on-surface-variant flex-wrap">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 border ${bucketMeta.bgColor} ${bucketMeta.color}`}>{bucketMeta.label}</span>
                      <span className="font-bold text-on-surface">#{uni.qsRanking}</span>
                      <span className="w-1 h-1 bg-outline rounded-full opacity-30" />
                      <span>{uni.tuition}{uni.tuitionPeriod}</span>
                      <button
                        onClick={() => toggleShortlist(uni.programId, uni.matchScore)}
                        disabled={isLoading}
                        className={`ml-auto px-2 py-1 text-[10px] font-bold border transition-all ${isShortlisted ? "bg-primary text-on-primary border-primary" : "text-primary border-primary/30 hover:bg-primary/5"}`}
                      >
                        {isLoading ? "..." : isShortlisted ? "Shortlisted" : "+ Shortlist"}
                      </button>
                    </div>

                    {/* Bucket (desktop) */}
                    <div className="hidden md:flex col-span-1 justify-center">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 border ${bucketMeta.bgColor} ${bucketMeta.color}`}>{bucketMeta.label}</span>
                    </div>

                    {/* QS / Tuition (desktop) */}
                    <div className="hidden md:block col-span-2 text-center">
                      <div className="font-bold text-sm text-on-surface">#{uni.qsRanking}</div>
                      <div className="text-[11px] text-on-surface-variant">{uni.tuition}<span className="opacity-60 ml-0.5">{uni.tuitionPeriod}</span></div>
                    </div>

                    {/* Duration (desktop) */}
                    <div className="hidden md:block col-span-1 text-center text-xs text-on-surface-variant">
                      {uni.durationMonths >= 12 ? `${(uni.durationMonths / 12).toFixed(uni.durationMonths % 12 === 0 ? 0 : 1)} yr` : `${uni.durationMonths} mo`}
                    </div>

                    {/* Match Score (desktop) */}
                    <div className="hidden md:flex col-span-2 justify-center">
                      <div className="relative w-10 h-10">
                        <svg className="w-full h-full" viewBox="0 0 36 36">
                          <circle className="stroke-surface-container" cx="18" cy="18" fill="none" r="16" strokeWidth="1.5" />
                          <circle className="stroke-primary" cx="18" cy="18" fill="none" r="16" strokeDasharray="100, 100" strokeDashoffset={100 - uni.matchScore} strokeLinecap="butt" strokeWidth="1.5" style={{ transition: "stroke-dashoffset 0.35s", transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary">{uni.matchScore}%</span>
                      </div>
                    </div>

                    {/* Actions (desktop) */}
                    <div className="hidden md:flex col-span-2 justify-end items-center gap-2">
                      <button
                        onClick={() => toggleShortlist(uni.programId, uni.matchScore)}
                        disabled={isLoading}
                        className={`px-3 py-1.5 text-[11px] font-bold border transition-all ${isShortlisted ? "bg-primary text-on-primary border-primary" : "text-primary border-primary/30 hover:bg-primary/5"}`}
                      >
                        <span className="material-symbols-outlined text-sm mr-0.5 align-middle">{isShortlisted ? "bookmark" : "bookmark_border"}</span>
                        {isLoading ? "..." : isShortlisted ? "Listed" : "Shortlist"}
                      </button>
                      <Link href={`/universities/${uni.programId}`} className="text-outline group-hover:text-primary">
                        <span className="material-symbols-outlined">chevron_right</span>
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-16 bg-surface-container-lowest text-center">
                <span className="material-symbols-outlined text-outline text-4xl mb-3 block">search_off</span>
                <p className="text-sm text-outline font-medium mb-1">No programs match your filters</p>
                <p className="text-xs text-outline-variant">Try removing some filters or switching bucket tabs.</p>
                {activeFilterCount > 0 && (
                  <button onClick={clearAllFilters} className="mt-4 px-4 py-2 text-xs font-semibold text-primary border border-primary hover:bg-primary-container/20 transition-colors">Reset All Filters</button>
                )}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-xs text-outline-variant font-medium">
                Showing {(safePage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} programs
              </div>
              <div className="flex gap-1">
                <button onClick={() => setPage(1)} disabled={safePage === 1} className="w-9 h-9 flex items-center justify-center bg-surface-container-low text-secondary hover:bg-primary-container transition-colors disabled:opacity-30"><span className="material-symbols-outlined text-sm">first_page</span></button>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="w-9 h-9 flex items-center justify-center bg-surface-container-low text-secondary hover:bg-primary-container transition-colors disabled:opacity-30"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                {(() => {
                  const pages: number[] = [];
                  let start = Math.max(1, safePage - 2);
                  const end = Math.min(totalPages, start + 4);
                  if (end - start < 4) start = Math.max(1, end - 4);
                  for (let i = start; i <= end; i++) pages.push(i);
                  return pages.map((n) => (
                    <button key={n} onClick={() => setPage(n)} className={n === safePage ? "w-9 h-9 flex items-center justify-center bg-primary text-on-primary font-bold text-sm" : "w-9 h-9 flex items-center justify-center bg-surface-container-low text-secondary hover:bg-primary-container transition-colors font-bold text-sm"}>{n}</button>
                  ));
                })()}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="w-9 h-9 flex items-center justify-center bg-surface-container-low text-secondary hover:bg-primary-container transition-colors disabled:opacity-30"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} className="w-9 h-9 flex items-center justify-center bg-surface-container-low text-secondary hover:bg-primary-container transition-colors disabled:opacity-30"><span className="material-symbols-outlined text-sm">last_page</span></button>
              </div>
            </div>
          )}
        </div>

        {isLimited && (
          <div className="mt-6 p-5 bg-primary/[0.05] border border-primary/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-on-surface">
                {totalUnlocked - 5} more universities matched your profile
              </p>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                Upgrade to DIY or above to unlock all {totalUnlocked} matches.
              </p>
            </div>
            <a
              href="/settings"
              className="shrink-0 px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              Upgrade Plan
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
