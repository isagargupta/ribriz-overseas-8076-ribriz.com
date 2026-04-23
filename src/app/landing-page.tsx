"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.55, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [demoStep, setDemoStep] = useState(0);
  useEffect(() => {
    const durations = [4000, 2800, 5200, 4500];
    const t = setTimeout(() => setDemoStep(s => (s + 1) % 4), durations[demoStep]);
    return () => clearTimeout(t);
  }, [demoStep]);

  return (
    <div className="min-h-screen bg-white text-[#191c1e] overflow-x-hidden">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-xl border-b border-black/[0.06]">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-5 md:px-10 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-extrabold tracking-tighter font-headline text-[#191c1e]">RIBRIZ</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#3525cd] bg-[#3525cd]/8 px-1.5 py-0.5 rounded">AI</span>
          </div>
          <nav className="hidden md:flex gap-8 text-[13px] font-semibold">
            {[["How it Works", "#how-it-works"], ["Compare", "#compare"], ["FAQ", "#faq"]].map(([label, href]) => (
              <a key={href} className="text-[#464555] hover:text-[#3525cd] transition-colors" href={href}>{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden md:inline-block text-sm font-semibold text-[#464555] hover:text-[#3525cd] transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="bg-[#3525cd] text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-[#2a1eb5] transition-all shadow-sm">
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── HERO ────────────────────────────────────────── */}
        <section className="pt-28 pb-0 bg-[#eeeeff] overflow-hidden">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-4xl mx-auto px-5 md:px-8 text-center"
          >
            {/* Label */}
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3525cd]" />
              <span className="text-sm font-semibold text-[#3525cd] tracking-wide">RIBRIZ study abroad platform</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-[2.6rem] sm:text-[3.5rem] md:text-[4.5rem] font-extrabold tracking-tighter leading-[1.06] mb-6 font-headline text-[#191c1e]"
            >
              Which universities should
              <br />
              <span className="text-[#3525cd]">you actually apply to?</span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg md:text-xl text-[#464555] leading-relaxed mb-8 max-w-2xl mx-auto"
            >
              Most students spend months applying to the wrong programs with the wrong SOPs.
              RIBRIZ shows your real admission odds, finds programs that fit your profile,
              and drafts your SOP — before you spend ₹50K on applications that won&apos;t work.
            </motion.p>

            {/* CTA row */}
            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
              <Link
                href="/signup"
                className="bg-[#3525cd] text-white px-9 py-4 rounded-full font-bold text-base hover:bg-[#2a1eb5] transition-all shadow-lg shadow-[#3525cd]/25 flex items-center justify-center gap-2"
              >
                Check My Admission Chances
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </Link>
              <a
                href="#compare"
                className="px-7 py-4 rounded-full font-bold text-base text-[#3525cd] border-2 border-[#3525cd]/25 hover:border-[#3525cd]/60 hover:bg-[#3525cd]/5 transition-all flex items-center justify-center"
              >
                See how it compares
              </a>
            </motion.div>

            {/* Trust line */}
            <motion.p variants={fadeUp} custom={4} className="text-sm text-[#777587] mb-12">
              Free to start &nbsp;·&nbsp; No credit card &nbsp;·&nbsp; No one will call you
            </motion.p>

            {/* Product mockup — centered, wider, clips at bottom */}
            <motion.div
              variants={fadeUp}
              custom={5}
              className="relative max-w-3xl mx-auto"
            >
              {/* Soft glow behind */}
              <div className="absolute inset-x-0 top-10 h-40 bg-[#3525cd]/10 blur-3xl rounded-full mx-auto w-3/4 pointer-events-none" />

              <div className="relative bg-white rounded-t-2xl shadow-2xl shadow-[#3525cd]/10 border border-black/[0.07] overflow-hidden">
                {/* Browser bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-[#f0f0f0] border-b border-black/[0.06]">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="flex-1 bg-white border border-black/[0.08] rounded px-3 py-0.5 text-[11px] text-[#777587] text-left ml-2">
                    app.ribriz.com/dashboard
                  </div>
                </div>

                {/* Dashboard — sidebar + main */}
                <div className="flex h-[320px] sm:h-[400px]">

                  {/* Sidebar — hidden on mobile */}
                  <div className="hidden sm:flex w-44 shrink-0 flex-col py-2 overflow-hidden" style={{ background: "#161b22" }}>
                    {/* User */}
                    <div className="flex items-center gap-2 px-3 py-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-[#3525cd] flex items-center justify-center text-white text-[10px] font-bold shrink-0">R</div>
                      <div className="min-w-0">
                        <div className="text-white text-[11px] font-semibold leading-none">Rohan</div>
                        <div className="text-white/40 text-[9px] truncate">rohan@ribriz.com</div>
                      </div>
                    </div>
                    <div className="h-px bg-white/[0.06] mx-3 mb-2" />
                    {/* Nav */}
                    {[
                      { icon: "dashboard", label: "Dashboard", active: true },
                      { icon: "auto_awesome", label: "Riz AI", active: false },
                      { icon: "description", label: "Applications", active: false },
                      { icon: "hub", label: "Workspaces", active: false },
                      { icon: "school", label: "University Match", active: false },
                      { icon: "folder", label: "Documents", active: false },
                      { icon: "edit_note", label: "SOP Writer", active: false },
                      { icon: "stars", label: "Scholarships", active: false },
                      { icon: "flight", label: "Visa", active: false },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`flex items-center gap-2 px-2.5 py-1.5 mx-1.5 rounded-md text-[11px] font-medium ${
                          item.active ? "bg-white/10 text-white" : "text-white/45"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px] shrink-0">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 overflow-hidden flex flex-col bg-white">
                    {/* Top bar */}
                    <div className="flex items-center justify-between px-5 py-2.5 border-b border-black/[0.05] shrink-0">
                      <div className="flex items-center gap-2 bg-[#f2f4f6] rounded-lg px-3 py-1.5">
                        <span className="material-symbols-outlined text-[#777587] text-[14px]">search</span>
                        <span className="text-[11px] text-[#777587]">Search...</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#777587] text-[18px]">dark_mode</span>
                        <span className="material-symbols-outlined text-[#777587] text-[18px]">notifications</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded bg-[#3525cd] flex items-center justify-center text-white text-[9px] font-bold">R</div>
                          <span className="text-[10px] font-bold text-[#191c1e]">RIBRIZ</span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden px-3 sm:px-5 py-3 sm:py-4">
                      {/* Welcome row */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0">
                          <h2 className="text-sm sm:text-base font-extrabold text-[#191c1e] leading-tight">Welcome back, Rohan •</h2>
                          <p className="text-[10px] text-[#777587] mt-0.5">
                            Targeting <span className="font-bold text-[#3525cd]">Bachelor&apos;s</span> in Data Science / AI across Canada, Germany, Australia
                            {" "}<span className="font-semibold">+6 more</span> for{" "}
                            <span className="bg-[#3525cd]/10 text-[#3525cd] px-1.5 py-0.5 rounded text-[9px] font-bold">Fall 2027</span>
                          </p>
                        </div>
                        <div className="hidden sm:flex gap-2 shrink-0">
                          <div className="flex items-center gap-1 border border-black/[0.1] rounded-md px-2 py-1">
                            <span className="material-symbols-outlined text-[11px] text-[#464555]">download</span>
                            <span className="text-[9px] font-semibold text-[#464555]">Export Roadmap</span>
                          </div>
                          <div className="flex items-center gap-1 bg-[#3525cd] rounded-md px-2 py-1">
                            <span className="material-symbols-outlined text-[11px] text-white">auto_awesome</span>
                            <span className="text-[9px] font-bold text-white">Ask Riz AI</span>
                          </div>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 mb-3">
                        {[
                          { icon: "school", val: "12", label: "APPLICATIONS", sub: "1 submitted", sub_color: "text-[#3525cd]" },
                          { icon: "description", val: "3/25", label: "DOCUMENTS READY", sub: "3 verified", sub_color: "text-[#3525cd]" },
                          { icon: "emoji_events", val: "1", label: "ACCEPTANCES", sub: "", sub_color: "" },
                          { icon: "schedule", val: "281", label: "DAYS TO DEADLINE", sub: "", sub_color: "" },
                        ].map((s) => (
                          <div key={s.label} className="bg-[#f7f9fb] rounded-lg p-2 sm:p-2.5 border border-black/[0.05] text-left">
                            <div className="w-5 h-5 rounded bg-[#3525cd]/10 flex items-center justify-center mb-1.5">
                              <span className="material-symbols-outlined text-[#3525cd] text-[12px]">{s.icon}</span>
                            </div>
                            <div className="text-lg font-extrabold text-[#191c1e] leading-none">{s.val}</div>
                            <div className="text-[8px] font-bold text-[#777587] uppercase tracking-wide mt-0.5">{s.label}</div>
                            {s.sub && <div className={`text-[8px] font-semibold mt-0.5 ${s.sub_color}`}>{s.sub}</div>}
                          </div>
                        ))}
                      </div>

                      {/* Application Pipeline */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-bold text-[#777587] uppercase tracking-widest flex items-center gap-1.5">
                            Application Pipeline
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          </span>
                          <span className="text-[9px] font-bold text-[#3525cd]">Manage All</span>
                        </div>
                        {/* Progress bar */}
                        <div className="h-1.5 bg-[#f2f4f6] rounded-full mb-2 flex overflow-hidden gap-0.5">
                          <div className="bg-amber-400 rounded-full" style={{ width: "8%" }} />
                          <div className="bg-[#e0e3e5] rounded-full flex-1" />
                          <div className="bg-[#3525cd] rounded-full" style={{ width: "8%" }} />
                        </div>
                        <div className="flex gap-2 text-[8px] font-semibold mb-2.5">
                          <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">1 Docs Pending</span>
                          <span className="bg-[#f2f4f6] text-[#464555] px-1.5 py-0.5 rounded-full">10 Not Started</span>
                          <span className="bg-[#3525cd]/10 text-[#3525cd] px-1.5 py-0.5 rounded-full">1 Decision</span>
                        </div>
                        {[
                          { initials: "GÖ", bg: "bg-blue-100 text-blue-700", name: "University of Göttingen", prog: "B.Sc. Data Science · Germany", status: "Docs Pending", days: "386d left", status_color: "text-amber-600 bg-amber-50 border-amber-200" },
                          { initials: "UH", bg: "bg-red-100 text-red-700", name: "University of Hamburg", prog: "B.Sc. Intelligent Adaptive Systems · Germany", status: "Not Started", days: "356d left", status_color: "text-[#464555] bg-[#f2f4f6] border-[#e0e3e5]" },
                          { initials: "MI", bg: "bg-gray-100 text-gray-600", name: "Massachusetts Institute of Technology", prog: "B.S. Data, Systems & Society · United States", status: "Not Started", days: "615d left", status_color: "text-[#464555] bg-[#f2f4f6] border-[#e0e3e5]" },
                        ].map((u) => (
                          <div key={u.name} className="flex items-center gap-2.5 py-2 border-b border-black/[0.05]">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0 ${u.bg}`}>{u.initials}</div>
                            <div className="flex-1 min-w-0 text-left">
                              <div className="text-[10px] font-semibold text-[#191c1e] truncate">{u.name}</div>
                              <div className="text-[9px] text-[#777587] truncate">{u.prog}</div>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className={`text-[8px] font-bold border px-1.5 py-0.5 rounded ${u.status_color}`}>{u.status}</span>
                              <div className="text-[8px] text-[#777587] mt-0.5">{u.days}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating card — left: student got admitted */}
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                className="absolute -left-6 top-28 hidden md:flex bg-white rounded-2xl shadow-xl border border-black/[0.07] px-3.5 py-3 items-center gap-3 max-w-[190px]"
              >
                <Image src="https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg?auto=compress&cs=tinysrgb&w=48&h=48&fit=crop" alt="student" width={36} height={36} className="w-9 h-9 rounded-full object-cover shrink-0 border-2 border-white" />
                <div className="text-left min-w-0">
                  <div className="text-xs font-bold text-[#191c1e] truncate">Priya got admitted 🎉</div>
                  <div className="text-[10px] text-[#777587]">University of Toronto</div>
                </div>
              </motion.div>

              {/* Floating card — right: deadline */}
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1, duration: 0.5 }}
                className="absolute -right-6 top-44 hidden md:flex bg-white rounded-2xl shadow-xl border border-black/[0.07] px-3.5 py-3 items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-amber-500 text-[16px]">schedule</span>
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-[#191c1e]">Deadline Alert</div>
                  <div className="text-[10px] text-[#777587]">UofT — 47 days left</div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* ── COUNSELLOR DEMO ─────────────────────────────── */}
        <section className="py-24 md:py-32 px-5 md:px-8" style={{ background: "#080b10" }}>
          <div className="max-w-6xl mx-auto">

            {/* Header */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="text-center mb-14">
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.22)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
                Live Feature Demo — Watch it happen
              </motion.div>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold tracking-tighter font-headline text-white leading-[1.05] mb-5">
                From profile scan to offer letter —
                <br />your counsellor does it live
              </motion.h2>
              <motion.p variants={fadeUp} className="text-base max-w-xl mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
                Watch how RIBRIZ analyses your profile, opens the real application portal, fills your forms with AI, and gets you an offer letter — all in one session.
              </motion.p>
            </motion.div>

            {/* Step selector */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="flex flex-wrap items-center justify-center gap-2 mb-10">
              {([
                { label: "Analyse Profile", icon: "manage_search" },
                { label: "Open Portal",     icon: "language" },
                { label: "Fill & Apply",    icon: "edit_note" },
                { label: "Offer Letter",    icon: "mark_email_read" },
              ] as { label: string; icon: string }[]).map(({ label, icon }, i) => (
                <button
                  key={label}
                  onClick={() => setDemoStep(i)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300"
                  style={{
                    background: demoStep === i ? "rgba(53,37,205,0.3)" : "rgba(255,255,255,0.05)",
                    color: demoStep === i ? "#bfc1ff" : "rgba(255,255,255,0.35)",
                    border: `1px solid ${demoStep === i ? "rgba(53,37,205,0.5)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {demoStep > i
                    ? <span className="material-symbols-outlined text-sm" style={{ color: "#4ade80" }}>check_circle</span>
                    : <span className="material-symbols-outlined text-sm">{icon}</span>
                  }
                  {label}
                  {i < 3 && <span className="material-symbols-outlined text-sm hidden sm:inline" style={{ color: "rgba(255,255,255,0.2)" }}>chevron_right</span>}
                </button>
              ))}
            </motion.div>

            {/* App mockup */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} className="relative">

              {/* Ambient glow */}
              <div className="absolute -inset-10 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(53,37,205,0.16), transparent 65%)" }} />

              {/* Device frame */}
              <div className="relative rounded-xl overflow-hidden shadow-2xl" style={{ border: "1px solid rgba(255,255,255,0.1)", background: "#0f0f0f" }}>

                {/* ── Top nav bar — breadcrumb updates per step ── */}
                <div className="flex items-center gap-3 px-4 py-3" style={{ background: "#141414", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <button className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <span className="material-symbols-outlined text-base" style={{ color: "rgba(255,255,255,0.5)" }}>arrow_back</span>
                  </button>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <span className="material-symbols-outlined text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>support_agent</span>
                    </div>
                    <span className="text-sm font-semibold text-white">Counselor</span>
                  </div>
                  <div className="flex items-center gap-1 ml-2 overflow-x-auto">
                    {(["Intake", "Analysis", "Shortlist", "Applying", "Done"] as const).map((label, i) => {
                      const activeIdx = [0, 1, 3, 4][demoStep];
                      const isDone = i < activeIdx;
                      const isActive = i === activeIdx;
                      return (
                        <div key={label} className="flex items-center gap-1 flex-shrink-0">
                          {i > 0 && <span className="material-symbols-outlined text-sm" style={{ color: "rgba(255,255,255,0.18)" }}>chevron_right</span>}
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full transition-all duration-500" style={{ background: isActive ? "rgba(53,37,205,0.25)" : "transparent", border: isActive ? "1px solid rgba(53,37,205,0.4)" : "1px solid transparent" }}>
                            {isDone ? <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#22c55e" }}><span className="material-symbols-outlined text-white" style={{ fontSize: "9px" }}>check</span></div>
                              : isActive ? <span className="material-symbols-outlined text-sm" style={{ color: "#bfc1ff" }}>radio_button_checked</span>
                              : <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ border: "1.5px solid rgba(255,255,255,0.18)" }} />}
                            <span className="text-[11px] font-medium" style={{ color: isActive ? "#bfc1ff" : isDone ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.25)" }}>{label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Animated step content ── */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={demoStep}
                    className="flex"
                    style={{ minHeight: "500px" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                  >

                    {/* ===== STEP 0: ANALYSE PROFILE ===== */}
                    {demoStep === 0 && <>
                      <div className="flex flex-col w-full md:w-[28%] md:flex-shrink-0 md:border-r" style={{ background: "#0f0f0f", borderColor: "rgba(255,255,255,0.07)" }}>
                        <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(53,37,205,0.3)" }}>
                              <span className="material-symbols-outlined text-sm" style={{ color: "#bfc1ff" }}>support_agent</span>
                            </div>
                            <span className="text-xs font-semibold text-white">RIBRIZ Counselor</span>
                            <span className="flex items-center gap-1 text-[10px]" style={{ color: "#4ade80" }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />typing…
                            </span>
                          </div>
                          <div className="text-xs leading-relaxed space-y-3" style={{ color: "rgba(255,255,255,0.7)" }}>
                            <p>Let me scan your profile before we begin…</p>
                            <div className="space-y-2.5">
                              {([
                                { label: "Academic records", detail: "GPA 8.0 / 10", loading: false },
                                { label: "Language score",  detail: "IELTS 8.0",     loading: false },
                                { label: "Financial plan",  detail: "₹10–20L/year",  loading: false },
                                { label: "Completeness",   detail: "100%",           loading: false },
                                { label: "Matching programs", detail: "scanning…",   loading: true  },
                              ] as { label: string; detail: string; loading: boolean }[]).map(item => (
                                <div key={item.label} className="flex items-center gap-2">
                                  {item.loading
                                    ? <div className="w-4 h-4 rounded-full border-2 border-transparent animate-spin flex-shrink-0" style={{ borderTopColor: "#bfc1ff" }} />
                                    : <span className="material-symbols-outlined text-base flex-shrink-0" style={{ color: "#4ade80" }}>check_circle</span>}
                                  <span className="text-[11px] flex-1" style={{ color: item.loading ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.75)" }}>{item.label}</span>
                                  <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: item.loading ? "#bfc1ff" : "rgba(255,255,255,0.38)" }}>{item.detail}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="px-3 py-2.5 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.18)" }}>Waiting for analysis…</div>
                        </div>
                      </div>
                      <div className="hidden md:flex flex-col flex-1 overflow-hidden" style={{ background: "#0a0d12" }}>
                        <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-white">Profile Analysis</span>
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}>100% Complete</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                            <div className="h-full rounded-full" style={{ width: "100%", background: "linear-gradient(90deg, #3525cd, #4ade80)" }} />
                          </div>
                        </div>
                        <div className="flex-1 p-5 overflow-y-auto">
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            {([
                              { icon: "school", label: "GPA", value: "8.0 / 10", sub: "Top 15% applicant", color: "#4ade80" },
                              { icon: "record_voice_over", label: "IELTS", value: "8.0", sub: "All programs unlocked", color: "#4ade80" },
                              { icon: "payments", label: "Budget", value: "₹10–20L", sub: "Good range", color: "#facc15" },
                              { icon: "history_edu", label: "Backlogs", value: "None", sub: "Clean record", color: "#4ade80" },
                            ] as { icon: string; label: string; value: string; sub: string; color: string }[]).map(m => (
                              <div key={m.label} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                                <div className="flex items-center gap-1.5 mb-2">
                                  <span className="material-symbols-outlined text-sm flex-shrink-0" style={{ color: m.color }}>{m.icon}</span>
                                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>{m.label}</span>
                                </div>
                                <div className="text-lg font-extrabold text-white">{m.value}</div>
                                <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>{m.sub}</div>
                              </div>
                            ))}
                          </div>
                          <div className="rounded-xl p-4" style={{ background: "rgba(53,37,205,0.1)", border: "1px solid rgba(53,37,205,0.25)" }}>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#bfc1ff] animate-pulse inline-block" />
                              <span className="text-xs font-semibold" style={{ color: "#bfc1ff" }}>Matching universities…</span>
                            </div>
                            {([
                              { name: "University of Leicester", prog: "MSc Data Science & AI", pct: 78 },
                              { name: "University of Essex",     prog: "MSc AI & Data Science", pct: 72 },
                              { name: "University of Nottingham",prog: "MSc Data Science",       pct: 68 },
                            ] as { name: string; prog: string; pct: number }[]).map((u, i) => (
                              <div key={u.name} className="flex items-center gap-3 mb-2">
                                <span className="text-[10px] w-3 text-center flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[11px] font-semibold text-white truncate">{u.name}</div>
                                  <div className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{u.prog}</div>
                                </div>
                                <span className="text-sm font-extrabold flex-shrink-0" style={{ color: "#4ade80" }}>{u.pct}%</span>
                              </div>
                            ))}
                            <div className="text-[10px] mt-2 pt-2" style={{ color: "rgba(255,255,255,0.28)", borderTop: "1px solid rgba(255,255,255,0.07)" }}>+ 13 more universities matched</div>
                          </div>
                        </div>
                      </div>
                    </>}

                    {/* ===== STEP 1: OPEN PORTAL ===== */}
                    {demoStep === 1 && <>
                      <div className="flex flex-col w-full md:w-[28%] md:flex-shrink-0 md:border-r" style={{ background: "#0f0f0f", borderColor: "rgba(255,255,255,0.07)" }}>
                        <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(53,37,205,0.3)" }}>
                              <span className="material-symbols-outlined text-sm" style={{ color: "#bfc1ff" }}>support_agent</span>
                            </div>
                            <span className="text-xs font-semibold text-white">RIBRIZ Counselor</span>
                          </div>
                          <div className="text-xs leading-relaxed space-y-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                            <p>Your profile is <strong className="text-white">100% complete</strong>. You&apos;re classified as a <strong className="text-white">competitive applicant</strong>.</p>
                            <p>Best match for your scores and budget:</p>
                            <div className="p-3 rounded-xl" style={{ background: "rgba(53,37,205,0.15)", border: "1px solid rgba(53,37,205,0.3)" }}>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-5 h-5 rounded flex items-center justify-center text-white font-extrabold text-[9px] flex-shrink-0" style={{ background: "#c8102e" }}>UL</div>
                                <span className="text-xs font-semibold text-white">University of Leicester</span>
                              </div>
                              <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>MSc Data Science &amp; AI · 78% match</div>
                            </div>
                            <p className="pt-1 flex items-center gap-2">
                              <span className="w-3.5 h-3.5 rounded-full border-2 border-transparent animate-spin flex-shrink-0" style={{ borderTopColor: "#bfc1ff" }} />
                              Opening the application portal now…
                            </p>
                          </div>
                        </div>
                        <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="px-3 py-2.5 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.18)" }}>Portal loading…</div>
                        </div>
                      </div>
                      <div className="hidden md:flex flex-col flex-1 overflow-hidden" style={{ background: "#0a0a0a" }}>
                        <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ background: "#111", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <span className="material-symbols-outlined text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>arrow_back</span>
                          <span className="material-symbols-outlined text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>arrow_forward</span>
                          <span className="material-symbols-outlined text-sm animate-spin" style={{ color: "#bfc1ff" }}>refresh</span>
                          <div className="flex-1 flex items-center gap-1.5 px-3 py-1 rounded-md mx-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <span className="material-symbols-outlined text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>lock</span>
                            <span className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>Finding the application portal for University of Leicester…</span>
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center gap-5">
                          <div className="relative w-14 h-14">
                            <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#bfc1ff", borderRightColor: "rgba(191,193,255,0.3)" }} />
                            <div className="absolute inset-2 rounded-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-xl" style={{ color: "rgba(255,255,255,0.2)" }}>language</span>
                            </div>
                          </div>
                          <div className="text-center space-y-2">
                            <p className="text-sm font-medium text-white">Finding the application portal for University of Leicester…</p>
                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>This takes a few seconds — we&apos;re launching a secure browser session.</p>
                          </div>
                          <div className="flex gap-1.5">
                            {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === 0 ? "#bfc1ff" : "rgba(255,255,255,0.15)" }} />)}
                          </div>
                        </div>
                        <div className="flex items-center justify-end px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: "rgba(53,37,205,0.25)", border: "1px solid rgba(53,37,205,0.4)" }}>
                            <span className="material-symbols-outlined text-base">play_arrow</span>
                            Start Application Guide
                          </div>
                        </div>
                      </div>
                    </>}

                    {/* ===== STEP 2: FILL & APPLY ===== */}
                    {demoStep === 2 && <>
                      <div className="flex flex-col w-full md:w-[28%] md:flex-shrink-0 md:border-r" style={{ background: "#0f0f0f", borderColor: "rgba(255,255,255,0.07)" }}>
                        <div className="flex-1 overflow-hidden p-4 flex flex-col gap-2">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(53,37,205,0.3)" }}>
                              <span className="material-symbols-outlined text-sm" style={{ color: "#bfc1ff" }}>support_agent</span>
                            </div>
                            <span className="text-xs font-semibold text-white">RIBRIZ Counselor</span>
                          </div>
                          <div className="text-xs leading-relaxed space-y-2" style={{ color: "rgba(255,255,255,0.75)" }}>
                            <p>Hello Sagar! You&apos;ve already been accepted at <strong className="text-white">Toronto Metropolitan University</strong>.</p>
                            <p>Now let&apos;s target <strong className="text-white">University of Leicester</strong> — your 78% match.</p>
                            <div className="space-y-1 pt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                              <p>✅ Strong GPA (8/10)</p>
                              <p>✅ Excellent IELTS (8.0)</p>
                              <p>✅ No backlogs</p>
                            </div>
                            <p className="pt-1">I&apos;m now filling in your <strong className="text-white">Personal Statement</strong> based on your profile data.</p>
                            <p className="flex items-center gap-2 text-[11px]" style={{ color: "#bfc1ff" }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-[#bfc1ff] animate-pulse inline-block" />
                              Typing your statement…
                            </p>
                          </div>
                        </div>
                        <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                            <span className="text-xs flex-1" style={{ color: "rgba(255,255,255,0.25)" }}>Reply to your counselor…</span>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#3525cd" }}>
                              <span className="material-symbols-outlined text-sm text-white">send</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="hidden md:flex flex-col flex-1 overflow-hidden" style={{ background: "#f5f6f8" }}>
                        <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
                          <span className="material-symbols-outlined text-sm" style={{ color: "#aaa" }}>arrow_back</span>
                          <span className="material-symbols-outlined text-sm" style={{ color: "#aaa" }}>refresh</span>
                          <div className="flex-1 flex items-center gap-1.5 px-3 py-1 rounded-md mx-2" style={{ background: "#f3f4f6", border: "1px solid #e5e7eb" }}>
                            <span className="material-symbols-outlined text-xs text-green-500">lock</span>
                            <span className="text-[11px] truncate text-gray-500">apply.le.ac.uk/postgraduate/application/form</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0 text-[10px] font-bold" style={{ background: "rgba(53,37,205,0.1)", color: "#3525cd", border: "1px solid rgba(53,37,205,0.25)" }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3525cd] animate-pulse inline-block" />AI Filling
                          </div>
                        </div>
                        <div className="flex items-center gap-3 px-5 py-2.5 flex-shrink-0" style={{ background: "#003b6f" }}>
                          <div className="w-6 h-6 rounded flex items-center justify-center text-white font-extrabold text-xs flex-shrink-0" style={{ background: "#c8102e" }}>UL</div>
                          <span className="text-white text-xs font-semibold">University of Leicester</span>
                          <span className="text-[10px] ml-1" style={{ color: "rgba(255,255,255,0.4)" }}>Online Application Portal</span>
                        </div>
                        <div className="flex items-center px-4 flex-shrink-0 overflow-x-auto" style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
                          {(["Personal", "Academic", "Statement", "Documents", "Submit"] as const).map((s, i) => (
                            <div key={s} className="flex items-center flex-shrink-0">
                              <div className={`flex items-center gap-1 px-3 py-2.5 text-[11px] font-semibold border-b-2 ${i < 2 ? "border-green-500 text-green-600" : i === 2 ? "border-[#003b6f] text-[#003b6f]" : "border-transparent text-gray-400"}`}>
                                {i < 2 && <span className="material-symbols-outlined text-xs text-green-500">check_circle</span>}{s}
                              </div>
                              {i < 4 && <span className="material-symbols-outlined text-xs text-gray-300">chevron_right</span>}
                            </div>
                          ))}
                        </div>
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-bold text-gray-800">Personal Statement</h3>
                              <p className="text-[11px] text-gray-500 mt-0.5">Explain your motivations and suitability for this programme</p>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold flex-shrink-0" style={{ background: "rgba(53,37,205,0.08)", color: "#3525cd", border: "1px solid rgba(53,37,205,0.2)" }}>
                              <span className="material-symbols-outlined text-sm" style={{ color: "#3525cd" }}>auto_fix_high</span>AI writing
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              { label: "Full Name",   value: "Sagar Kumar Gupta" },
                              { label: "Email",       value: "sgupta@ribriz.com" },
                              { label: "Programme",   value: "MSc Data Science & AI" },
                              { label: "Entry Year",  value: "September 2027" },
                            ] as { label: string; value: string }[]).map(f => (
                              <div key={f.label} className="px-3 py-2 rounded-lg" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                                <div className="flex items-center gap-1 mb-0.5">
                                  <span className="material-symbols-outlined text-xs text-green-500">check</span>
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-green-600">{f.label}</span>
                                </div>
                                <span className="text-[11px] font-medium text-gray-700">{f.value}</span>
                              </div>
                            ))}
                          </div>
                          <div className="rounded-lg overflow-hidden" style={{ border: "2px solid #3525cd", boxShadow: "0 0 0 3px rgba(53,37,205,0.1)" }}>
                            <div className="flex items-center justify-between px-3 py-2" style={{ background: "rgba(53,37,205,0.06)", borderBottom: "1px solid rgba(53,37,205,0.15)" }}>
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#3525cd]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#3525cd] animate-pulse inline-block" />
                                RIBRIZ AI — typing from your profile
                              </div>
                              <span className="text-[10px] text-gray-400">650 / 4000 chars</span>
                            </div>
                            <div className="p-3 text-[11px] leading-relaxed text-gray-700 bg-white" style={{ minHeight: "90px" }}>
                              My academic journey in Computer Science at Vistula University, where I graduated with a GPA of 8/10, has equipped me with a strong foundation in algorithmic thinking and applied mathematics. I am applying to the MSc Data Science &amp; AI programme at the University of Leicester because
                              <span className="inline-block w-0.5 h-3.5 bg-[#3525cd] align-middle ml-0.5 animate-pulse" />
                            </div>
                          </div>
                          <div className="rounded-lg p-3" style={{ background: "#fff", border: "1px solid #e5e7eb" }}>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Documents</p>
                            {([
                              { name: "Academic Transcripts",    done: true },
                              { name: "IELTS Score Report (8.0)", done: true },
                              { name: "2× Reference Letters",     done: false },
                            ] as { name: string; done: boolean }[]).map(d => (
                              <div key={d.name} className="flex items-center gap-2 mb-1.5">
                                <span className="material-symbols-outlined text-sm flex-shrink-0" style={{ color: d.done ? "#22c55e" : "#f59e0b" }}>{d.done ? "check_circle" : "pending"}</span>
                                <span className="text-[11px] text-gray-600">{d.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ background: "#fff", borderTop: "1px solid #e5e7eb" }}>
                          <span className="text-xs text-gray-400">Auto-saving…</span>
                          <button className="text-xs font-semibold px-4 py-1.5 rounded-lg text-white flex items-center gap-1" style={{ background: "#003b6f" }}>
                            Submit Application<span className="material-symbols-outlined text-sm">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                    </>}

                    {/* ===== STEP 3: OFFER LETTER ===== */}
                    {demoStep === 3 && <>
                      <div className="flex flex-col w-full md:w-[28%] md:flex-shrink-0 md:border-r" style={{ background: "#0f0f0f", borderColor: "rgba(255,255,255,0.07)" }}>
                        <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(53,37,205,0.3)" }}>
                              <span className="material-symbols-outlined text-sm" style={{ color: "#bfc1ff" }}>support_agent</span>
                            </div>
                            <span className="text-xs font-semibold text-white">RIBRIZ Counselor</span>
                          </div>
                          <div className="text-xs leading-relaxed space-y-3" style={{ color: "rgba(255,255,255,0.7)" }}>
                            <div className="p-3 rounded-xl text-center" style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)" }}>
                              <div className="text-2xl mb-1">🎉</div>
                              <p className="text-xs font-bold text-white">Application Submitted!</p>
                              <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>University of Leicester</p>
                            </div>
                            <p>Congratulations, Sagar! Your application to <strong className="text-white">MSc Data Science &amp; AI</strong> at the University of Leicester has been submitted.</p>
                            <p>You&apos;ve received a <strong className="text-white">Conditional Offer of Admission</strong>:</p>
                            <div className="space-y-1.5 text-[11px]">
                              <p>✅ Programme: MSc Data Science & AI</p>
                              <p>✅ Start: September 2027</p>
                              <p>⏳ Upload final degree certificate to confirm</p>
                            </div>
                            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Shall we apply to the next university on your shortlist?</p>
                          </div>
                        </div>
                        <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
                            <span className="text-xs flex-1 text-green-400 font-medium">Apply to next university →</span>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#22c55e" }}>
                              <span className="material-symbols-outlined text-sm text-white">send</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="hidden md:flex flex-col flex-1 overflow-hidden" style={{ background: "#f5f6f8" }}>
                        <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
                          <span className="material-symbols-outlined text-sm" style={{ color: "#aaa" }}>arrow_back</span>
                          <div className="flex-1 flex items-center gap-1.5 px-3 py-1 rounded-md mx-2" style={{ background: "#f3f4f6", border: "1px solid #e5e7eb" }}>
                            <span className="material-symbols-outlined text-xs text-green-500">lock</span>
                            <span className="text-[11px] truncate text-gray-500">apply.le.ac.uk/offer/confirmation/2027</span>
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0" style={{ background: "#16a34a" }}>
                            <span className="material-symbols-outlined text-xl text-white flex-shrink-0">check_circle</span>
                            <div>
                              <p className="text-sm font-bold text-white">Application Submitted Successfully</p>
                              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.75)" }}>Ref: UOL-2027-DS-48291 · Submitted just now</p>
                            </div>
                          </div>
                          <div className="px-6 py-5">
                            <div className="flex items-center gap-3 mb-5 pb-4" style={{ borderBottom: "2px solid #003b6f" }}>
                              <div className="w-10 h-10 rounded flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0" style={{ background: "#c8102e" }}>UL</div>
                              <div>
                                <div className="text-sm font-extrabold text-gray-800">University of Leicester</div>
                                <div className="text-[11px] text-gray-500">Office of Admissions · Leicester, UK</div>
                              </div>
                            </div>
                            <div className="text-[11px] text-gray-500 mb-3">23 April 2026</div>
                            <div className="text-sm font-bold text-gray-800 mb-1">Conditional Offer of Admission</div>
                            <p className="text-[11px] text-gray-600 mb-4">Dear Sagar Kumar Gupta,</p>
                            <p className="text-[11px] text-gray-600 leading-relaxed mb-4">We are delighted to offer you a conditional place on the following programme of study:</p>
                            <div className="p-4 rounded-xl mb-4" style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}>
                              <div className="text-sm font-bold text-gray-800 mb-1">MSc Data Science and Artificial Intelligence</div>
                              <div className="text-[11px] text-gray-500 space-y-0.5">
                                <div>Faculty of Computing &amp; Engineering · Full-time · 12 months</div>
                                <div className="font-semibold text-gray-700 mt-1">Start date: September 2027</div>
                              </div>
                            </div>
                            <p className="text-[11px] font-semibold text-gray-700 mb-2">Conditions of Offer:</p>
                            <div className="space-y-2 mb-5">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm text-green-500 flex-shrink-0">check_circle</span>
                                <span className="text-[11px] text-gray-600">IELTS 8.0 — <strong className="text-green-600">Verified ✓</strong></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm flex-shrink-0" style={{ color: "#f59e0b" }}>pending</span>
                                <span className="text-[11px] text-gray-600">Provide final degree certificate (within 60 days)</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white" style={{ background: "#003b6f" }}>Accept Offer</button>
                              <button className="px-4 py-2.5 rounded-lg text-xs font-semibold text-gray-700 flex items-center gap-1" style={{ border: "1px solid #e5e7eb" }}>
                                <span className="material-symbols-outlined text-sm">download</span>Download PDF
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>}

                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Caption */}
              <div className="flex flex-col md:flex-row gap-4 mt-5 md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#3525cd" }} />
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>AI counsellor reads your full profile and guides every decision in plain language</span>
                </div>
                <div className="flex items-center gap-2 md:justify-end">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "rgba(255,255,255,0.2)" }} />
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Real portal opens, forms get filled, offer letter arrives — all in one session</span>
                </div>
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mt-12">
              <Link href="/signup" className="inline-flex items-center gap-2 bg-white text-[#3525cd] px-8 py-4 rounded-full font-bold hover:bg-white/90 transition-all shadow-lg">
                Start Your Counsellor Session
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ── TRUST BAR — scrolling logos ──────────────────── */}
        <section className="py-12 bg-white border-y border-black/[0.06] overflow-hidden">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#777587] text-center mb-8">Our students got admitted to</p>
          <div
            className="relative flex items-center"
            style={{
              maskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
              WebkitMaskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
            }}
          >
            {[0, 1].map((copy) => (
              <div
                key={copy}
                className="flex shrink-0 items-center gap-12 pr-12"
                style={{ animation: "scroll 38s linear infinite" }}
                aria-hidden={copy === 1}
              >
                {[
                  { name: "University of Toronto", domain: "utoronto.ca" },
                  { name: "TU Munich", domain: "tum.de" },
                  { name: "University of Melbourne", domain: "unimelb.edu.au" },
                  { name: "NUS Singapore", domain: "nus.edu.sg" },
                  { name: "Univ. of British Columbia", domain: "ubc.ca" },
                  { name: "ETH Zurich", domain: "ethz.ch" },
                  { name: "McGill University", domain: "mcgill.ca" },
                  { name: "Monash University", domain: "monash.edu" },
                  { name: "RWTH Aachen", domain: "rwth-aachen.de" },
                  { name: "TU Delft", domain: "tudelft.nl" },
                  { name: "Univ. of Waterloo", domain: "uwaterloo.ca" },
                  { name: "Univ. of Edinburgh", domain: "ed.ac.uk" },
                  { name: "University of Sydney", domain: "sydney.edu.au" },
                  { name: "NTU Singapore", domain: "ntu.edu.sg" },
                  { name: "KTH Royal Institute", domain: "kth.se" },
                  { name: "Univ. of Amsterdam", domain: "uva.nl" },
                ].map((u) => (
                  <div key={u.name} className="shrink-0 flex items-center gap-2.5 whitespace-nowrap" title={u.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${u.domain}&sz=64`}
                      alt={u.name}
                      className="w-6 h-6 object-contain rounded opacity-60"
                    />
                    <span className="text-sm font-semibold text-[#191c1e]/50">{u.name}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ── COMPARISON ──────────────────────────────────── */}
        <section id="compare" className="py-24 md:py-32 px-5 md:px-8 bg-white">
          <div className="max-w-5xl mx-auto">

            {/* Left-aligned editorial heading */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="mb-12 max-w-2xl">
              <motion.p variants={fadeUp} className="text-sm font-bold text-[#3525cd] uppercase tracking-widest mb-4">Agent vs RIBRIZ</motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-extrabold tracking-tighter font-headline text-[#191c1e] leading-[1.05] mb-5">
                The agent&apos;s incentive
                <br />is not your admission.
              </motion.h2>
              <motion.p variants={fadeUp} className="text-[#464555] text-lg leading-relaxed">
                Agents earn commissions from universities — so they push institutions that pay them, not the ones right for you.
                RIBRIZ earns nothing from universities. Our only incentive is your outcome.
              </motion.p>
            </motion.div>

            {/* Two-panel layout */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="grid md:grid-cols-2 gap-4 mb-10">

              {/* Agent panel — light, muted */}
              <motion.div variants={fadeUp} custom={0} className="rounded-2xl border border-black/[0.08] bg-[#fafafa] p-8">
                <div className="mb-7 pb-6 border-b border-black/[0.06]">
                  <div className="text-[10px] font-bold text-[#777587] uppercase tracking-widest mb-2">Traditional Agent</div>
                  <div className="text-3xl font-extrabold font-headline text-[#191c1e]">₹1–3 Lakh</div>
                  <div className="text-sm text-[#777587] mt-1">Commission-driven. Office hours only.</div>
                </div>
                <div className="space-y-4">
                  {[
                    "Recommends universities that pay them commissions",
                    "No data — just guesses dressed as expertise",
                    "Generic SOP templates with your name swapped in",
                    "Reachable 9–6, Mon–Fri. Miss a deadline, not their problem",
                    "Pushes you toward partner universities only",
                    "Fees hidden until you're already committed",
                    "Network of ~50–100 universities, not 2,000+",
                  ].map((f, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-red-400 text-[14px]">close</span>
                      </div>
                      <span className="text-sm text-[#464555] leading-snug">{f}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* RIBRIZ panel — dark, premium */}
              <motion.div variants={fadeUp} custom={1} className="rounded-2xl p-8 relative overflow-hidden" style={{ background: "#161b22" }}>
                {/* Glow */}
                <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(53,37,205,0.35) 0%, transparent 70%)" }} />
                <div className="relative z-10">
                  <div className="mb-7 pb-6 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#bfc1ff" }}>RIBRIZ</div>
                    <div className="text-3xl font-extrabold font-headline text-white">Free to start</div>
                    <div className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>Profile-driven. Available 24/7.</div>
                  </div>
                  <div className="space-y-4">
                    {[
                      "Matches only based on your profile — zero commissions",
                      "Real admission probability scores for every university",
                      "SOP built from your actual story, not a template",
                      "Apply, track, and manage everything at 3am if you want",
                      "2,000+ universities across 30+ countries",
                      "Fully transparent — no surprises, no lock-in",
                      "Human expert available for complex cases",
                    ].map((f, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(53,37,205,0.5)" }}>
                          <span className="material-symbols-outlined text-[14px]" style={{ color: "#bfc1ff", fontVariationSettings: "'FILL' 1" }}>check</span>
                        </div>
                        <span className="text-sm leading-snug" style={{ color: "rgba(255,255,255,0.7)" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center">
              <Link href="/signup" className="inline-flex items-center gap-2 bg-[#3525cd] text-white px-8 py-4 rounded-full font-bold hover:bg-[#2a1eb5] transition-all shadow-lg shadow-[#3525cd]/20">
                Try RIBRIZ Free
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </Link>
              <p className="text-xs text-[#777587] mt-3">No credit card. Takes 10 minutes.</p>
            </motion.div>
          </div>
        </section>

        {/* ── HOW IT WORKS ────────────────────────────────── */}
        <section id="how-it-works" className="py-24 md:py-32 px-5 md:px-8" style={{ background: "#0d1117" }}>
          <div className="max-w-6xl mx-auto">

            {/* Header — left aligned */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
              <div>
                <motion.p variants={fadeUp} className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#bfc1ff" }}>How it works</motion.p>
                <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold tracking-tighter font-headline text-white leading-[1.05]">
                  From profile to shortlist
                  <br />in under 10 minutes
                </motion.h2>
              </div>
              <motion.p variants={fadeUp} className="text-base max-w-xs md:text-right" style={{ color: "rgba(255,255,255,0.4)" }}>
                No intake call. No waiting for a consultant to get back to you.
              </motion.p>
            </motion.div>

            {/* 2×2 step cards */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="grid md:grid-cols-2 gap-4">
              {[
                {
                  num: "01",
                  title: "Build Your Profile",
                  desc: "GPA, scores, budget, preferred countries. Takes about 10 minutes. No questions designed to upsell you.",
                  icon: "person",
                },
                {
                  num: "02",
                  title: "See Your Real Odds",
                  desc: "Get admission probability scores — not vague \"good fit\" labels. 78% means 78%. Confidence intervals shown on every result.",
                  icon: "analytics",
                },
                {
                  num: "03",
                  title: "Draft Your SOP",
                  desc: "The AI assistant builds a first draft from your profile — one that's actually about you, not a copy-paste template.",
                  icon: "edit_note",
                },
                {
                  num: "04",
                  title: "Apply & Track",
                  desc: "Application tracker, document checklists, and deadline reminders keep you on schedule all the way through to visa.",
                  icon: "flight_takeoff",
                },
              ].map((step, i) => (
                <motion.div
                  key={step.num}
                  variants={fadeUp}
                  custom={i}
                  className="relative rounded-2xl p-8 overflow-hidden group hover:border-[#3525cd]/40 transition-colors duration-300"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  {/* Large ghost number — decorative */}
                  <div
                    className="absolute top-3 right-6 font-extrabold leading-none select-none pointer-events-none font-headline"
                    style={{ fontSize: "96px", color: "rgba(255,255,255,0.03)" }}
                  >
                    {step.num}
                  </div>

                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                    style={{ background: "rgba(53,37,205,0.35)", border: "1px solid rgba(53,37,205,0.5)" }}
                  >
                    <span className="material-symbols-outlined text-2xl" style={{ color: "#bfc1ff" }}>{step.icon}</span>
                  </div>

                  {/* Step label */}
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.22)" }}>
                    Step {step.num}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl md:text-2xl font-extrabold tracking-tight text-white font-headline mb-3">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {step.desc}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mt-12">
              <Link href="/signup" className="inline-flex items-center gap-2 bg-white text-[#3525cd] px-8 py-4 rounded-full font-bold hover:bg-white/90 transition-all shadow-lg">
                Start in 10 Minutes
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </Link>
            </motion.div>
          </div>
        </section>


        {/* ── DESTINATIONS ────────────────────────────────── */}
        <section className="py-24 md:py-32 px-5 md:px-8 bg-white">
          <div className="max-w-6xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="text-center mb-12">
              <motion.p variants={fadeUp} className="text-sm font-bold text-[#3525cd] uppercase tracking-widest mb-3">Study Destinations</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold tracking-tighter font-headline text-[#191c1e]">
                2,000+ universities across 30+ countries
              </motion.h2>
            </motion.div>

            {/* Bento-style grid */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-[180px]">

              {/* Canada — tall (spans 2 rows) */}
              <motion.div variants={fadeUp} custom={0} className="relative rounded-2xl overflow-hidden group cursor-pointer row-span-2">
                <Image src="https://images.pexels.com/photos/1519088/pexels-photo-1519088.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&fit=crop" alt="Canada" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="text-white font-extrabold text-2xl font-headline leading-tight">Canada</div>
                  <div className="text-white/65 text-xs font-semibold mt-0.5">68 universities</div>
                </div>
              </motion.div>

              {/* Germany */}
              <motion.div variants={fadeUp} custom={1} className="relative rounded-2xl overflow-hidden group cursor-pointer">
                <Image src="https://images.pexels.com/photos/109629/pexels-photo-109629.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop" alt="Germany" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="text-white font-extrabold text-lg font-headline">Germany</div>
                  <div className="text-white/65 text-xs font-semibold">52 universities</div>
                </div>
              </motion.div>

              {/* Australia */}
              <motion.div variants={fadeUp} custom={2} className="relative rounded-2xl overflow-hidden group cursor-pointer">
                <Image src="https://images.pexels.com/photos/995764/pexels-photo-995764.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop" alt="Australia" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="text-white font-extrabold text-lg font-headline">Australia</div>
                  <div className="text-white/65 text-xs font-semibold">41 universities</div>
                </div>
              </motion.div>

              {/* Singapore — wide (spans 2 cols) */}
              <motion.div variants={fadeUp} custom={3} className="relative rounded-2xl overflow-hidden group cursor-pointer col-span-2 md:col-span-1">
                <Image src="https://images.pexels.com/photos/2994829/pexels-photo-2994829.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop" alt="Singapore" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="text-white font-extrabold text-lg font-headline">Singapore</div>
                  <div className="text-white/65 text-xs font-semibold">18 universities</div>
                </div>
              </motion.div>

              {/* UK — wide (spans 2 cols) */}
              <motion.div variants={fadeUp} custom={4} className="relative rounded-2xl overflow-hidden group cursor-pointer col-span-2">
                <Image src="https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=900&h=400&fit=crop" alt="United Kingdom" fill sizes="(max-width: 768px) 50vw, 50vw" className="object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="text-white font-extrabold text-xl font-headline">United Kingdom</div>
                  <div className="text-white/65 text-xs font-semibold mt-0.5">120+ universities</div>
                </div>
              </motion.div>

              {/* Netherlands */}
              <motion.div variants={fadeUp} custom={5} className="relative rounded-2xl overflow-hidden group cursor-pointer">
                <Image src="https://images.pexels.com/photos/1414467/pexels-photo-1414467.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop" alt="Netherlands" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="text-white font-extrabold text-lg font-headline">Netherlands</div>
                  <div className="text-white/65 text-xs font-semibold">24 universities</div>
                </div>
              </motion.div>

              {/* USA */}
              <motion.div variants={fadeUp} custom={6} className="relative rounded-2xl overflow-hidden group cursor-pointer">
                <Image src="https://images.pexels.com/photos/378570/pexels-photo-378570.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop" alt="USA" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="text-white font-extrabold text-lg font-headline">USA</div>
                  <div className="text-white/65 text-xs font-semibold">400+ universities</div>
                </div>
              </motion.div>

              {/* Ireland */}
              <motion.div variants={fadeUp} custom={7} className="relative rounded-2xl overflow-hidden group cursor-pointer">
                <Image src="https://images.pexels.com/photos/2416600/pexels-photo-2416600.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop" alt="Ireland" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="text-white font-extrabold text-lg font-headline">Ireland</div>
                  <div className="text-white/65 text-xs font-semibold">22 universities</div>
                </div>
              </motion.div>

              {/* Sweden */}
              <motion.div variants={fadeUp} custom={8} className="relative rounded-2xl overflow-hidden group cursor-pointer">
                <Image src="https://images.pexels.com/photos/3787839/pexels-photo-3787839.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop" alt="Sweden" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="text-white font-extrabold text-lg font-headline">Sweden</div>
                  <div className="text-white/65 text-xs font-semibold">30 universities</div>
                </div>
              </motion.div>

              {/* New Zealand */}
              <motion.div variants={fadeUp} custom={9} className="relative rounded-2xl overflow-hidden group cursor-pointer">
                <Image src="https://images.pexels.com/photos/1538177/pexels-photo-1538177.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop" alt="New Zealand" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="text-white font-extrabold text-lg font-headline">New Zealand</div>
                  <div className="text-white/65 text-xs font-semibold">8 universities</div>
                </div>
              </motion.div>

            </motion.div>
          </div>
        </section>

        {/* ── REVIEWS MARQUEE ─────────────────────────────── */}
        <section className="py-24 md:py-28 bg-[#f7f9fb] overflow-hidden">
          {/* Header */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="text-center mb-14 px-5">
            <motion.p variants={fadeUp} className="text-sm font-bold text-[#3525cd] uppercase tracking-widest mb-3">Student reviews</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-3 font-headline text-[#191c1e]">
              Loved by students across India
            </motion.h2>
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-2">
              <div className="flex">
                {[1,2,3,4,5].map(s => <span key={s} className="text-amber-400 text-xl">★</span>)}
              </div>
              <span className="font-bold text-[#191c1e]">4.9</span>
            </motion.div>
          </motion.div>

          {/* Rows */}
          <div className="flex flex-col gap-4">
            {[
              {
                dir: "normal" as const,
                speed: "32s",
                reviews: [
                  { initials: "KR", color: "bg-violet-100 text-violet-700", name: "Kavya Reddy", tag: "MS CS · Toronto", stars: 5, text: "The admission scoring was unsettlingly accurate. 7.2 CGPA, UofT at 68%. Consultant was pushing LSE. Ignored him. 3 of 4 admits from RIBRIZ's list." },
                  { initials: "PM", color: "bg-blue-100 text-blue-700", name: "Prateek Malhotra", tag: "MS Data Science · TU Munich", stars: 5, text: "Saved ₹2.3L vs the agent quote. Got 4 admits including my first choice. The whole process took 6 weeks." },
                  { initials: "SI", color: "bg-emerald-100 text-emerald-700", name: "Shreya Iyer", tag: "MBA · Melbourne", stars: 5, text: "My agent gave me a list of 12 universities with no logic. RIBRIZ gave me 5 with percentage odds. Night and day." },
                  { initials: "AK", color: "bg-amber-100 text-amber-700", name: "Arjun Kapoor", tag: "MS Robotics · RWTH Aachen", stars: 5, text: "Agent said my 7.1 CGPA was too low for Germany. RIBRIZ said RWTH was 64%. Applied. Got in. Never looked back." },
                  { initials: "DR", color: "bg-rose-100 text-rose-700", name: "Divya Rao", tag: "MS Finance · NUS Singapore", stars: 5, text: "Document checklist and deadline tracker saved me from missing the NUS deadline by 3 days. Would've been a disaster." },
                  { initials: "VN", color: "bg-sky-100 text-sky-700", name: "Vikram Nambiar", tag: "MS ECE · University of Waterloo", stars: 5, text: "Used 3 different platforms. Only RIBRIZ gave me actual probability numbers. Everything else was just vibes." },
                  { initials: "TP", color: "bg-fuchsia-100 text-fuchsia-700", name: "Tanvi Patel", tag: "MS Bioinformatics · Edinburgh", stars: 4, text: "Wasn't sure if Scotland was realistic. Admission scoring said 71%. Applied, got in. The data genuinely doesn't lie." },
                  { initials: "RS", color: "bg-teal-100 text-teal-700", name: "Rishi Sharma", tag: "MS Finance · McGill", stars: 5, text: "₹0 spent on consulting. McGill was my top pick at 74% odds. Got in. I keep recommending this to everyone I know." },
                ],
              },
              {
                dir: "reverse" as const,
                speed: "38s",
                reviews: [
                  { initials: "AN", color: "bg-indigo-100 text-indigo-700", name: "Ananya Nair", tag: "MBA · INSEAD", stars: 5, text: "The SOP assistant turned my terrible first draft into something that actually sounded like me. I cried reading the final version." },
                  { initials: "KM", color: "bg-orange-100 text-orange-700", name: "Karthik Menon", tag: "BEng · TU Berlin", stars: 5, text: "₹1.8L cheaper than my agent quote. 2 admits already, 3 more pending. Best decision I made this entire year." },
                  { initials: "NC", color: "bg-lime-100 text-lime-700", name: "Nisha Chopra", tag: "MS Marketing · University of Sydney", stars: 4, text: "Application tracker made 8 simultaneous applications feel manageable. Submitted everything on time for the first time ever." },
                  { initials: "HK", color: "bg-cyan-100 text-cyan-700", name: "Harish Kumar", tag: "MS Physics · University of Amsterdam", stars: 5, text: "Found programs I'd genuinely never heard of that fit my profile perfectly. The database is enormous." },
                  { initials: "MG", color: "bg-pink-100 text-pink-700", name: "Meera Gupta", tag: "MS Architecture · TU Delft", stars: 5, text: "Very honest tool. Showed ETH Zurich at 19% for my profile. Didn't waste ₹80K applying. Used that money on my visa instead." },
                  { initials: "SB", color: "bg-yellow-100 text-yellow-700", name: "Sameer Bhat", tag: "MS Supply Chain · Monash", stars: 5, text: "RIBRIZ said the program I wanted had a 31% acceptance rate for my profile. Applied anyway. Got in. The 31% includes everyone — I beat the odds." },
                  { initials: "PJ", color: "bg-purple-100 text-purple-700", name: "Pooja Joshi", tag: "MS Env. Engineering · RWTH", stars: 5, text: "Compared this to 4 other study abroad tools. Only RIBRIZ gives real probability scores. The others just call everything 'Good Fit'." },
                  { initials: "LT", color: "bg-red-100 text-red-700", name: "Lakshmi Tiwari", tag: "MS Psychology · Edinburgh", stars: 4, text: "Honestly thought I needed an agent for my unconventional profile. RIBRIZ proved that wrong pretty fast." },
                ],
              },
              {
                dir: "normal" as const,
                speed: "28s",
                reviews: [
                  { initials: "RV", color: "bg-green-100 text-green-700", name: "Rahul Verma", tag: "MS AI · KTH Stockholm", stars: 5, text: "KTH came out as a realistic target at 69%. My friends thought I was reaching. I got in. They're all using RIBRIZ now." },
                  { initials: "AB", color: "bg-blue-100 text-blue-700", name: "Aditi Banerjee", tag: "MS Computer Eng · TU Munich", stars: 5, text: "The SOP iteration feature is incredible. Went through 6 drafts in one evening. Final version was miles better than anything I'd written." },
                  { initials: "SK", color: "bg-violet-100 text-violet-700", name: "Suresh Krishnan", tag: "MS Mechatronics · ETH Zurich", stars: 5, text: "ETH was a 23% shot. I knew it. Still applied for the experience. Got rejected as expected. The 3 realistic ones all came through though." },
                  { initials: "IP", color: "bg-rose-100 text-rose-700", name: "Isha Pillai", tag: "MBA · Queen's University", stars: 5, text: "No sales calls. No pressure. No 'let me check with my team' delays. Just data, tools, and results. This is how it should work." },
                  { initials: "AT", color: "bg-amber-100 text-amber-700", name: "Aditya Tiwari", tag: "MS Data Analytics · UBC", stars: 5, text: "First time applying abroad. Was terrified. RIBRIZ made the whole process feel structured and less scary. Applied to 5, got into 3." },
                  { initials: "NJ", color: "bg-emerald-100 text-emerald-700", name: "Neha Jain", tag: "MS Biotech · University of Melbourne", stars: 5, text: "My consultant wanted ₹2.5L. RIBRIZ gave me a better shortlist in 30 minutes for ₹0. The math wasn't hard." },
                  { initials: "RK", color: "bg-sky-100 text-sky-700", name: "Rohan Kulkarni", tag: "MS Finance · University of Toronto", stars: 4, text: "The probability scores stopped me from obsessing over Harvard and MIT. Focused on realistic targets. 4 of 5 admits." },
                  { initials: "CG", color: "bg-teal-100 text-teal-700", name: "Chirag Garg", tag: "MS Civil Eng · TU Delft", stars: 5, text: "Used RIBRIZ for the application tracker alone. Kept 11 applications organized across 4 countries. Zero missed deadlines." },
                ],
              },
            ].map((row, rowIdx) => (
              <div
                key={rowIdx}
                className="relative flex overflow-hidden"
                style={{
                  maskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
                  WebkitMaskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
                }}
              >
                {[0, 1].map((copy) => (
                  <div
                    key={copy}
                    className="flex shrink-0 gap-4 pr-4"
                    style={{
                      animation: `scroll ${row.speed} linear infinite`,
                      animationDirection: row.dir,
                    }}
                    aria-hidden={copy === 1}
                  >
                    {row.reviews.map((r, i) => (
                      <div
                        key={i}
                        className="w-72 shrink-0 bg-white rounded-2xl border border-black/[0.07] p-5 flex flex-col gap-3"
                      >
                        {/* Stars */}
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <span key={s} className={`text-sm ${s <= r.stars ? "text-amber-400" : "text-[#e0e3e5]"}`}>★</span>
                          ))}
                        </div>
                        {/* Text */}
                        <p className="text-[13px] text-[#464555] leading-relaxed flex-1">&ldquo;{r.text}&rdquo;</p>
                        {/* Author */}
                        <div className="flex items-center gap-2.5 pt-3 border-t border-black/[0.05]">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${r.color}`}>
                            {r.initials}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#191c1e]">{r.name}</div>
                            <div className="text-[10px] text-[#777587]">{r.tag}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────── */}
        <section id="faq" className="py-24 md:py-32 px-5 md:px-8" style={{ background: "#161b22" }}>
          <div className="max-w-5xl mx-auto">

            {/* Header row — left label + heading */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
              <div>
                <motion.p variants={fadeUp} className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#bfc1ff" }}>FAQ</motion.p>
                <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold tracking-tighter font-headline text-white leading-[1.05]">
                  Things people
                  <br />actually ask
                </motion.h2>
              </div>
              <motion.p variants={fadeUp} className="text-base md:text-lg max-w-xs md:text-right" style={{ color: "rgba(255,255,255,0.4)" }}>
                Still unsure? Everything you need to know before you start.
              </motion.p>
            </motion.div>

            {/* FAQ items — two column on desktop */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="divide-y" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              {[
                {
                  q: "How is RIBRIZ different from a study abroad agent?",
                  a: "Agents earn commissions from universities — so they push institutions that pay them, not the ones right for you. RIBRIZ earns zero from universities. Our recommendations are 100% based on your profile fit. Plus you get AI tools, real-time tracking, and 24/7 access — things no agent provides.",
                },
                {
                  q: "Can RIBRIZ actually replace an agent?",
                  a: "For the vast majority of students, yes. The platform handles university matching, admission scoring, SOP writing, document management, application tracking, and visa guidance. Expert sessions are available for complex cases like visa interviews.",
                },
                {
                  q: "Is the free plan really free?",
                  a: "No catch. Free gives you profile assessment and 3 university matches — enough to see if RIBRIZ works for you. We make money when students upgrade for unlimited matching and SOP tools, not from hidden fees or university commissions.",
                },
                {
                  q: "What if I've already started my applications?",
                  a: "You can join at any stage. Many students join mid-cycle to use the SOP assistant or tracker for remaining submissions. Your existing work doesn't go to waste.",
                },
                {
                  q: "Do you guarantee admission?",
                  a: "No — and run from anyone who does. Universities make independent decisions. What we guarantee: your applications will be stronger, better-targeted, and submitted on time. Our students average a 73% admit rate across their applications.",
                },
                {
                  q: "How accurate is the admission chance scoring?",
                  a: "Our model is trained on historical admission data across 2,000+ universities. It correctly predicts the outcome 82% of the time. You'll see confidence intervals on every score — not just a single number.",
                },
              ].map((faq, i) => (
                <motion.div key={i} variants={fadeUp}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-start justify-between gap-6 py-6 text-left group"
                  >
                    <span className={`text-base md:text-lg font-semibold leading-snug transition-colors duration-200 ${openFaq === i ? "text-white" : "text-white/60 group-hover:text-white/90"}`}>
                      {faq.q}
                    </span>
                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200 ${
                      openFaq === i
                        ? "bg-[#3525cd] border-[#3525cd]"
                        : "border-white/20 group-hover:border-white/40"
                    }`}>
                      <span className={`material-symbols-outlined text-[16px] transition-transform duration-300 ${openFaq === i ? "text-white rotate-45" : "text-white/50"}`}>
                        add
                      </span>
                    </div>
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{ maxHeight: openFaq === i ? "300px" : "0px", opacity: openFaq === i ? 1 : 0 }}
                  >
                    <p className="pb-6 text-sm md:text-base leading-relaxed max-w-3xl" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {faq.a}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── FINAL CTA ───────────────────────────────────── */}
        <section className="py-20 md:py-32 px-5 md:px-8 bg-white overflow-hidden">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-5xl mx-auto"
          >
            {/* Main card */}
            <div className="relative rounded-3xl overflow-hidden" style={{ background: "#0d1117" }}>

              {/* Background grid lines */}
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }} />

              {/* Indigo glow — left */}
              <div className="absolute -left-24 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(53,37,205,0.4) 0%, transparent 70%)" }} />
              {/* Soft purple glow — right */}
              <div className="absolute -right-24 bottom-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,74,255,0.25) 0%, transparent 70%)" }} />

              <div className="relative z-10 px-8 md:px-16 py-16 md:py-20">

                {/* Top row: deadline badge + mini stats */}
                <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-12">
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border" style={{ background: "rgba(255,193,7,0.08)", borderColor: "rgba(255,193,7,0.2)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs font-bold text-amber-300 tracking-wide">Fall 2026 deadlines open Sep – Nov 2026</span>
                  </div>
                  <div className="flex items-center gap-6">
                    {[
                      { val: "10 min", label: "to get your shortlist" },
                      { val: "Free", label: "to start" },
                    ].map((s) => (
                      <div key={s.label} className="text-left">
                        <div className="text-lg font-extrabold text-white font-headline leading-none">{s.val}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Divider */}
                <div className="h-px mb-12" style={{ background: "rgba(255,255,255,0.06)" }} />

                {/* Main content — left headline + right action */}
                <div className="flex flex-col md:flex-row md:items-end gap-10 md:gap-16">

                  {/* Left — headline */}
                  <motion.div variants={fadeUp} className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: "#bfc1ff" }}>Start for free</p>
                    <h2 className="text-3xl md:text-[2.8rem] font-extrabold tracking-tighter font-headline text-white leading-[1.08] mb-6">
                      Find out where you
                      <br />actually stand —
                      <br /><span style={{ color: "#bfc1ff" }}>before you commit.</span>
                    </h2>
                    <p className="text-base leading-relaxed max-w-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                      No consultant call. No intake form. See your matched universities and real admission odds in 10 minutes — then decide.
                    </p>
                  </motion.div>

                  {/* Right — CTA block */}
                  <motion.div variants={fadeUp} className="md:w-72 shrink-0 flex flex-col gap-4">
                    <Link
                      href="/signup"
                      className="flex items-center justify-center gap-2.5 bg-[#3525cd] hover:bg-[#2a1eb5] text-white px-8 py-4 rounded-2xl font-bold text-base transition-all shadow-lg shadow-[#3525cd]/30 group"
                    >
                      Check My Admission Chances
                      <span className="material-symbols-outlined text-xl group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                    </Link>
                    <a
                      href="#compare"
                      className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-semibold text-sm transition-all"
                      style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                    >
                      See how we compare to agents
                    </a>
                    <p className="text-center text-[11px]" style={{ color: "rgba(255,255,255,0.22)" }}>
                      Free to start &nbsp;·&nbsp; No credit card &nbsp;·&nbsp; No one will call you
                    </p>
                  </motion.div>

                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer style={{ background: "#0b0e14" }}>
        {/* Accent top line */}
        <div style={{ height: "1px", background: "linear-gradient(90deg, transparent 0%, rgba(91,73,255,0.5) 35%, rgba(91,73,255,0.5) 65%, transparent 100%)" }} />

        <div className="max-w-6xl mx-auto px-5 md:px-10 pt-16 pb-10">

          {/* Upper section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-12">

            {/* Brand column */}
            <div className="lg:col-span-4">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-lg font-extrabold tracking-tighter font-headline text-white">RIBRIZ</span>
                <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5" style={{ background: "rgba(91,73,255,0.25)", color: "#a5a0ff", border: "1px solid rgba(91,73,255,0.35)" }}>AI</span>
              </div>
              <p className="text-[13px] leading-[1.7] mb-7" style={{ color: "rgba(255,255,255,0.32)", maxWidth: "270px" }}>
                University matching, admission prediction, and SOP generation — built for Indian students going abroad.
              </p>

              {/* Contact rows */}
              <div className="space-y-3 mb-7">
                <a href="mailto:sgupta@ribriz.com" className="flex items-center gap-3 group w-fit">
                  <span className="material-symbols-outlined text-[14px] shrink-0" style={{ color: "rgba(140,130,255,0.65)" }}>mail</span>
                  <span className="text-[13px] transition-colors" style={{ color: "rgba(255,255,255,0.38)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.38)")}
                  >sgupta@ribriz.com</span>
                </a>
                <a href="tel:+918076823071" className="flex items-center gap-3 group w-fit">
                  <span className="material-symbols-outlined text-[14px] shrink-0" style={{ color: "rgba(140,130,255,0.65)" }}>phone</span>
                  <span className="text-[13px] transition-colors" style={{ color: "rgba(255,255,255,0.38)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.38)")}
                  >+91 80768 23071</span>
                </a>
              </div>

              {/* Social icons */}
              <div className="flex items-center gap-2">
                {([
                  {
                    href: "https://www.instagram.com/ribrizventures/",
                    label: "Instagram",
                    d: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
                  },
                  {
                    href: "https://www.facebook.com/people/Ribriz-Overseas/61573363714278/",
                    label: "Facebook",
                    d: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
                  },
                  {
                    href: "https://www.linkedin.com/company/ribriz",
                    label: "LinkedIn",
                    d: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
                  },
                ] as { href: string; label: string; d: string }[]).map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex items-center justify-center w-8 h-8 transition-all"
                    style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d={s.d} /></svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Nav columns */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
              {[
                {
                  heading: "Platform",
                  links: [
                    { label: "How It Works", href: "#how-it-works" },
                    { label: "Compare to Agents", href: "#compare" },
                    { label: "Universities", href: "/universities" },
                    { label: "Destinations", href: "#" },
                  ],
                },
                {
                  heading: "Account",
                  links: [
                    { label: "Sign Up Free", href: "/signup" },
                    { label: "Log In", href: "/login" },
                    { label: "FAQ", href: "#faq" },
                  ],
                },
                {
                  heading: "Destinations",
                  links: ["Canada", "Germany", "Australia", "UK", "Singapore", "USA"].map((c) => ({ label: c, href: "#" })),
                },
                {
                  heading: "Legal",
                  links: [
                    { label: "Privacy Policy", href: "/privacy" },
                    { label: "Terms of Service", href: "/terms" },
                    { label: "Refund Policy", href: "/refund" },
                    { label: "Cookie Policy", href: "/cookies" },
                  ],
                },
              ].map((col) => (
                <div key={col.heading}>
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-5" style={{ color: "rgba(255,255,255,0.2)" }}>{col.heading}</h4>
                  <ul className="space-y-3">
                    {col.links.map((l) => (
                      <li key={l.label}>
                        <a
                          href={l.href}
                          className="text-[13px] transition-colors"
                          style={{ color: "rgba(255,255,255,0.42)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.88)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.42)")}
                        >{l.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "rgba(255,255,255,0.055)" }} />

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6">
            <div className="text-center sm:text-left">
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.18)" }}>
                &copy; {new Date().getFullYear()} RIBRIZ Overseas Ventures Private Limited. All rights reserved.
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.12)" }}>
                CIN: U85499KA2024PTC187740 &middot; Bangalore, Karnataka, India
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.18)" }}>All systems operational</span>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
