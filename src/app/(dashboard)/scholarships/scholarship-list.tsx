"use client";

import { useState, useMemo } from "react";

/* ─── Types ─────────────────────────────────────────────── */

export interface ScholarshipItem {
  id: string;
  name: string;
  provider: string;
  country: string;
  universityName: string | null;
  amount: string;
  type: "full" | "partial" | "stipend" | "tuition-waiver";
  degreeLevel: string[];
  deadline: string;
  eligibility: string;
  description: string;
  link: string;
  renewable: boolean;
  numberOfAwards: number | null;
  scholarshipType: string | null;
}

/* ─── Constants ─────────────────────────────────────────── */

const typeLabels: Record<string, { label: string; color: string }> = {
  full: { label: "Fully Funded", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  partial: { label: "Partial", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  stipend: { label: "Stipend", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  "tuition-waiver": { label: "Tuition Waiver", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
};

const degreeLevels = ["All", "Bachelor", "Master", "PhD"] as const;
const fundingTypes = ["All", "full", "partial", "stipend", "tuition-waiver"] as const;

/* ─── Component ─────────────────────────────────────────── */

export default function ScholarshipList({
  scholarships,
  totalInApi,
}: {
  scholarships: ScholarshipItem[];
  totalInApi: number;
}) {
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedDegree, setSelectedDegree] = useState<string>("All");
  const [search, setSearch] = useState("");

  // Derive unique countries from data
  const countries = useMemo(() => {
    const set = new Set(scholarships.map((s) => s.country).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [scholarships]);
  const [selectedCountry, setSelectedCountry] = useState<string>("All");

  const filtered = useMemo(() => {
    return scholarships.filter((s) => {
      if (selectedCountry !== "All" && s.country !== selectedCountry) return false;
      if (selectedDegree !== "All" && !s.degreeLevel.some((d) => d.toLowerCase().includes(selectedDegree.toLowerCase()))) return false;
      if (selectedType !== "All" && s.type !== selectedType) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.provider.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.eligibility.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [scholarships, selectedCountry, selectedDegree, selectedType, search]);

  const fullyFundedCount = filtered.filter((s) => s.type === "full").length;

  return (
    <div className="transition-colors duration-300">
      {/* Header */}
      <header className="mb-10 md:mb-12">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-4">
          <span>Scholarships</span>
          <span className="material-symbols-outlined text-[10px]">chevron_right</span>
          <span className="text-on-surface-variant">
            {selectedCountry === "All" ? "All Countries" : selectedCountry}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-2 text-on-surface font-headline">
              Scholarship Finder
            </h1>
            <p className="text-on-surface-variant max-w-2xl text-sm leading-relaxed">
              Live scholarship data from the RIBRIZ university database. Filter by country, degree level, and funding type to find opportunities that match your profile.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-surface-container-low p-4 border border-outline-variant/10 shrink-0 transition-colors">
            <div className="w-12 h-12 bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">school</span>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-outline tracking-wider">Showing</div>
              <div className="text-xl font-bold text-primary">
                {filtered.length}{" "}
                <span className="text-sm font-normal text-on-surface-variant">
                  of {scholarships.length} scholarships
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Country Tabs */}
        <div className="flex flex-wrap gap-2 mt-8">
          {countries.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCountry(c)}
              className={`px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 ${
                selectedCountry === c
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-surface-container-low text-outline border border-outline-variant/10 hover:text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </header>

      {/* Filters + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Search + Inline Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="Search by name, provider, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant/10 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>
            <select
              value={selectedDegree}
              onChange={(e) => setSelectedDegree(e.target.value)}
              className="px-4 py-3 bg-surface-container-low border border-outline-variant/10 text-sm text-on-surface focus:outline-none focus:border-primary/40 transition-colors"
            >
              {degreeLevels.map((d) => (
                <option key={d} value={d}>
                  {d === "All" ? "All Degrees" : d}
                </option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-3 bg-surface-container-low border border-outline-variant/10 text-sm text-on-surface focus:outline-none focus:border-primary/40 transition-colors"
            >
              {fundingTypes.map((t) => (
                <option key={t} value={t}>
                  {t === "All" ? "All Types" : typeLabels[t]?.label ?? t}
                </option>
              ))}
            </select>
          </div>

          {/* Scholarship Cards */}
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-5xl text-outline mb-4 block">
                search_off
              </span>
              <p className="text-on-surface-variant text-sm">
                No scholarships match your filters. Try broadening your search.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((s) => (
                <div
                  key={s.id}
                  className="group p-6 bg-surface-container-low border border-outline-variant/10 hover:bg-surface-container transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Top row: badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${typeLabels[s.type].color}`}
                        >
                          {typeLabels[s.type].label}
                        </span>
                        {s.renewable && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-xs">autorenew</span>
                            Renewable
                          </span>
                        )}
                        {s.numberOfAwards && (
                          <span className="text-[10px] font-bold text-outline">
                            {s.numberOfAwards} awards
                          </span>
                        )}
                        {s.degreeLevel.map((dl) => (
                          <span
                            key={dl}
                            className="text-[10px] font-bold uppercase tracking-wider text-outline"
                          >
                            {dl}
                          </span>
                        ))}
                      </div>

                      {/* Name + Provider */}
                      <h3 className="text-base font-bold text-on-surface mb-1 leading-snug">
                        {s.name}
                      </h3>
                      <p className="text-xs text-on-surface-variant mb-3">
                        {s.provider}
                        {s.country && <> &middot; {s.country}</>}
                      </p>

                      {/* Amount */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-primary text-base">
                          payments
                        </span>
                        <span className="text-sm font-semibold text-on-surface">{s.amount}</span>
                      </div>

                      {/* Description */}
                      {s.description && (
                        <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                          {s.description}
                        </p>
                      )}

                      {/* Eligibility */}
                      {s.eligibility && (
                        <p className="text-xs text-outline leading-relaxed">
                          Eligibility: {s.eligibility}
                        </p>
                      )}
                    </div>

                    {/* Right side: deadline + link */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase text-outline tracking-wider mb-1">
                          Deadline
                        </div>
                        <div className="text-sm font-semibold text-on-surface">{s.deadline}</div>
                      </div>
                      {s.link && (
                        <a
                          href={s.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                        >
                          Apply
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-24">
          {/* Quick Stats */}
          <div className="p-8 bg-[#4f55f1] text-white relative overflow-hidden shadow-2xl shadow-[#4f55f1]/20">
            <div className="relative z-10">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-6">
                Quick Stats
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-80">Displayed</span>
                  <span className="text-2xl font-bold">{filtered.length}</span>
                </div>
                <div className="h-px bg-white/20" />
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-80">Fully Funded</span>
                  <span className="text-2xl font-bold">{fullyFundedCount}</span>
                </div>
                <div className="h-px bg-white/20" />
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-80">Countries</span>
                  <span className="text-2xl font-bold">
                    {new Set(filtered.map((s) => s.country).filter(Boolean)).size}
                  </span>
                </div>
                <div className="h-px bg-white/20" />
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-80">In Database</span>
                  <span className="text-2xl font-bold">{totalInApi}</span>
                </div>
              </div>
            </div>
            <div className="absolute -right-8 -bottom-8 opacity-20 rotate-12">
              <span className="material-symbols-outlined text-[96px]">workspace_premium</span>
            </div>
          </div>

          {/* Tips Card */}
          <div className="p-6 bg-surface-container-low border border-outline-variant/10 transition-colors">
            <div className="flex items-center gap-3 mb-4 text-primary">
              <span className="material-symbols-outlined">tips_and_updates</span>
              <span className="text-[10px] font-black uppercase tracking-widest">
                Application Tips
              </span>
            </div>
            <ul className="space-y-3">
              {[
                "Start applications 6\u201312 months before deadlines",
                "Tailor your SOP for each scholarship\u2019s values",
                "Get strong recommendation letters early",
                "Research the scholarship provider\u2019s mission",
                "Apply to multiple scholarships to increase chances",
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary text-sm mt-0.5">
                    check_circle
                  </span>
                  <span className="text-xs text-on-surface-variant leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Disclaimer */}
          <div className="p-6 bg-surface-container-low border border-outline-variant/10 transition-colors">
            <div className="flex items-center gap-3 mb-4 text-primary">
              <span className="material-symbols-outlined">info</span>
              <span className="text-[10px] font-black uppercase tracking-widest">Disclaimer</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Scholarship details, deadlines, and amounts are subject to change. Always verify
              information on the official scholarship website before applying. Data sourced from
              the RIBRIZ university database.
            </p>
          </div>

          {/* Top Fully Funded */}
          {fullyFundedCount > 0 && (
            <div className="p-6 bg-surface-container-low border border-outline-variant/10 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-emerald-500">verified</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  Top Fully Funded
                </span>
              </div>
              <div className="space-y-3">
                {filtered
                  .filter((s) => s.type === "full")
                  .slice(0, 5)
                  .map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 bg-surface-container-lowest hover:bg-surface-container-high transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-on-surface block truncate">
                          {s.name}
                        </span>
                        <span className="text-[10px] text-outline">
                          {s.provider}
                          {s.country && <> &middot; {s.country}</>}
                        </span>
                      </div>
                      {s.link && (
                        <a
                          href={s.link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className="material-symbols-outlined text-sm text-outline hover:translate-x-1 transition-transform shrink-0">
                            open_in_new
                          </span>
                        </a>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
