"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";

/* ─── Animation helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-surface text-on-surface selection:bg-primary/20 overflow-x-hidden">
      {/* ═══ HEADER ═══ */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-5 md:px-8 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tighter font-headline">RIBRIZ</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/8 px-1.5 py-0.5 rounded">AI</span>
          </div>
          <nav className="hidden md:flex gap-8 text-[13px] font-semibold">
            {[
              ["How it Works", "#how-it-works"],
              ["Compare", "#compare"],
              ["Pricing", "#pricing"],
              ["FAQ", "#faq"],
            ].map(([label, href]) => (
              <a key={href} className="text-on-surface-variant hover:text-primary transition-colors" href={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden md:inline-block text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="bg-primary text-white px-5 py-2 rounded-md text-sm font-bold hover:brightness-110 transition-all">
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      <main className="pb-20 md:pb-0">
        {/* ═══ HERO ═══ */}
        <section className="pt-24 md:pt-32 pb-0 px-5 md:px-8">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 live-dot" />
                <span className="text-xs font-bold text-emerald-700">
                  AI-powered — 1,847 students signed up this month
                </span>
              </motion.div>

              <motion.h1 variants={fadeUp} custom={1} className="text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] font-extrabold tracking-tighter leading-[1.05] mb-5 font-headline">
                AI that gets you into
                <br />
                <span className="text-primary">the right university.</span>
              </motion.h1>

              <motion.p variants={fadeUp} custom={2} className="text-lg text-on-surface-variant leading-relaxed mb-8 max-w-lg">
                Our AI matches you with universities, predicts your admission chances,
                and writes your SOP — in 10 minutes, not 10 meetings. No agent needed.
              </motion.p>

              <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 mb-6">
                <Link
                  href="/signup"
                  className="editorial-gradient text-white px-8 py-4 rounded-md font-bold text-center text-base hover:brightness-110 transition-all shadow-xl shadow-primary/25 flex items-center justify-center gap-2"
                >
                  Check Your Admission Chances
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </Link>
                <a href="#compare" className="px-6 py-4 rounded-md font-bold text-center text-on-surface-variant border border-outline-variant/30 hover:border-primary/30 hover:text-primary transition-all">
                  See Agent vs RIBRIZ
                </a>
              </motion.div>

              <motion.div variants={fadeUp} custom={4} className="flex items-center gap-4 text-sm text-on-surface-variant">
                <span className="flex -space-x-2">
                  {["A", "R", "S", "P", "N"].map((l) => (
                    <span key={l} className="w-7 h-7 rounded-full bg-primary/10 border-2 border-surface flex items-center justify-center text-[10px] font-bold text-primary">
                      {l}
                    </span>
                  ))}
                </span>
                <span>
                  <strong className="text-on-surface">12,000+</strong> students placed in 15+ countries
                </span>
              </motion.div>
            </motion.div>

            {/* Right: Product Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const }}
              className="relative"
            >
              <div className="bg-surface-container-lowest rounded-xl shadow-2xl shadow-primary/10 border border-outline-variant/15 overflow-hidden">
                {/* Fake browser bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-surface-container-low border-b border-outline-variant/10">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/60" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/60" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400/60" />
                  </div>
                  <div className="flex-1 bg-surface-container rounded-md px-3 py-1 text-xs text-on-surface-variant ml-2">
                    app.ribriz.com/dashboard
                  </div>
                </div>
                {/* Fake dashboard content */}
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">University Matches</div>
                      <div className="text-2xl font-extrabold font-headline mt-1">12 Found</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Profile Strength</div>
                      <div className="text-2xl font-extrabold font-headline text-emerald-600 mt-1">87%</div>
                    </div>
                  </div>

                  {/* Fake university cards */}
                  {[
                    { name: "University of Toronto", prog: "MS Computer Science", chance: 78, tag: "Target" },
                    { name: "TU Munich", prog: "MS Data Science", chance: 85, tag: "Safe" },
                    { name: "ETH Zurich", prog: "MS Informatics", chance: 42, tag: "Reach" },
                  ].map((u) => (
                    <div key={u.name} className="flex items-center gap-4 p-3.5 bg-surface-container rounded-lg">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-xl">school</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{u.name}</div>
                        <div className="text-xs text-on-surface-variant">{u.prog}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-lg font-extrabold font-headline ${
                          u.chance >= 70 ? "text-emerald-600" : u.chance >= 50 ? "text-amber-600" : "text-red-500"
                        }`}>
                          {u.chance}%
                        </div>
                        <div className={`text-[10px] font-bold uppercase tracking-widest ${
                          u.tag === "Safe" ? "text-emerald-600" : u.tag === "Target" ? "text-amber-600" : "text-red-500"
                        }`}>
                          {u.tag}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="text-center pt-1">
                    <span className="text-xs font-bold text-primary">+ 9 more matches →</span>
                  </div>
                </div>
              </div>

              {/* Floating notification */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="absolute -bottom-4 -left-4 md:-left-8 bg-surface-container-lowest rounded-lg shadow-xl border border-outline-variant/15 px-4 py-3 flex items-center gap-3 z-10"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-600 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <div>
                  <div className="text-sm font-bold">SOP Draft Ready</div>
                  <div className="text-xs text-on-surface-variant">AI generated in 2 min</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ═══ TRUST BAR ═══ */}
        <section className="mt-16 md:mt-24 py-8 bg-surface-container-low/50 border-y border-outline-variant/10">
          <div className="max-w-7xl mx-auto px-5 md:px-8">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest text-center mb-5">Students accepted at</p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-on-surface-variant/50 font-headline font-bold text-sm md:text-base tracking-tight">
              {["University of Toronto", "TU Munich", "University of Melbourne", "NUS Singapore", "University of British Columbia", "TU Delft", "RWTH Aachen", "Monash University"].map((u) => (
                <span key={u} className="whitespace-nowrap">{u}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ COMPARISON TABLE — THE MONEY SECTION ═══ */}
        <section id="compare" className="py-20 md:py-28 px-5 md:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="text-center mb-14">
              <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold tracking-tighter mb-4 font-headline">
                Why pay an agent <span className="text-error line-through decoration-2">₹2,00,000</span>
                <br />
                when you can do it better for <span className="text-primary">₹0?</span>
              </motion.h2>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-4 px-5 text-sm font-bold text-on-surface-variant w-[40%]" />
                    <th className="py-4 px-5 text-center">
                      <div className="text-sm font-bold text-on-surface-variant mb-1">Traditional Agent</div>
                      <div className="text-xs text-error font-semibold">₹1–3 Lakh</div>
                    </th>
                    <th className="py-4 px-5 text-center bg-primary/5 rounded-t-lg">
                      <div className="text-sm font-bold text-primary mb-1">RIBRIZ</div>
                      <div className="text-xs text-primary font-semibold">Free to start</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Recommends based on your profile (not commissions)", false, true],
                    ["Admission chance scoring with real data", false, true],
                    ["AI-powered SOP assistant", false, true],
                    ["Real-time application tracker", false, true],
                    ["300+ verified universities", false, true],
                    ["Available 24/7, not just office hours", false, true],
                    ["Transparent pricing, no hidden fees", false, true],
                    ["You own your data and documents", false, true],
                    ["Human expert available for complex cases", "Sometimes", "Pro plan"],
                  ].map(([feature, agent, ribriz], i) => (
                    <tr key={i} className="border-t border-outline-variant/10">
                      <td className="py-4 px-5 text-sm font-medium">{feature}</td>
                      <td className="py-4 px-5 text-center">
                        {agent === false ? (
                          <span className="material-symbols-outlined text-error/50 text-xl">close</span>
                        ) : (
                          <span className="text-xs font-semibold text-on-surface-variant">{agent as string}</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-center bg-primary/5">
                        {ribriz === true ? (
                          <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        ) : (
                          <span className="text-xs font-semibold text-primary">{ribriz as string}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="mt-10 text-center">
              <Link href="/signup" className="inline-flex items-center gap-2 editorial-gradient text-white px-8 py-4 rounded-md font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20">
                Try RIBRIZ Free
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </Link>
              <p className="text-xs text-on-surface-variant mt-3">No credit card. Takes 10 minutes.</p>
            </motion.div>
          </div>
        </section>

        {/* ═══ HOW IT WORKS ═══ */}
        <section id="how-it-works" className="py-20 md:py-28 px-5 md:px-8 bg-surface-container-low">
          <div className="max-w-5xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="text-center mb-16">
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-3 font-headline">
                10 minutes to your first university match
              </motion.h2>
              <motion.p variants={fadeUp} className="text-on-surface-variant text-lg">Not 10 meetings. Not 10 weeks.</motion.p>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="grid md:grid-cols-4 gap-6">
              {[
                { num: "1", title: "Fill Your Profile", desc: "Academics, scores, and preferences. 10 minutes.", icon: "person", color: "bg-blue-500" },
                { num: "2", title: "AI Matches You", desc: "Our AI analyzes 300+ universities and predicts your admission chances.", icon: "auto_awesome", color: "bg-purple-500" },
                { num: "3", title: "AI Writes Your SOP", desc: "AI SOP writer, document checklist, and application tracker — all automated.", icon: "rocket_launch", color: "bg-emerald-500" },
                { num: "4", title: "Visa & Go", desc: "AI-assisted visa guidance and pre-departure support.", icon: "flight_takeoff", color: "bg-amber-500" },
              ].map((step, i) => (
                <motion.div key={step.num} variants={fadeUp} custom={i} className="relative">
                  <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <div className={`w-10 h-10 rounded-xl ${step.color} text-white flex items-center justify-center mb-4`}>
                      <span className="material-symbols-outlined text-xl">{step.icon}</span>
                    </div>
                    <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Step {step.num}</div>
                    <h3 className="text-base font-bold mb-2 font-headline">{step.title}</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{step.desc}</p>
                  </div>
                  {i < 3 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 text-outline-variant/40 z-10">
                      <span className="material-symbols-outlined">chevron_right</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══ RESULTS / TESTIMONIALS ═══ */}
        <section className="py-20 md:py-28 px-5 md:px-8">
          <div className="max-w-6xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="text-center mb-14">
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-3 font-headline">
                They saved lakhs. Got better results.
              </motion.h2>
              <motion.p variants={fadeUp} className="text-on-surface-variant text-lg">Real students. Real admits. Zero agent fees.</motion.p>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="grid md:grid-cols-3 gap-6">
              {[
                {
                  name: "Priya S.",
                  result: "Admitted to University of Toronto",
                  program: "MS Computer Science",
                  saved: "₹2.1L saved vs agent quote",
                  quote: "My agent wanted ₹2.5L and kept pushing UK universities I didn't want. RIBRIZ matched me to UofT in my first session. I applied to 4 universities and got into 3.",
                  avatar: "PS",
                  metric: "3/4 admits",
                },
                {
                  name: "Arjun M.",
                  result: "Admitted to TU Munich",
                  program: "MS Mechanical Engineering",
                  saved: "₹1.8L saved",
                  quote: "The SOP assistant completely changed my application. My statement went from sounding like everyone else's to actually telling my story. 3 admits out of 5 applications — all in Germany.",
                  avatar: "AM",
                  metric: "3/5 admits",
                },
                {
                  name: "Sneha R.",
                  result: "Admitted to University of Melbourne",
                  program: "MBA",
                  saved: "₹2.5L saved",
                  quote: "Admission chance scoring stopped me from wasting ₹80K on applications I had 12% chance at. Focused on 3 realistic schools instead. All 3 accepted.",
                  avatar: "SR",
                  metric: "3/3 admits",
                },
              ].map((t, i) => (
                <motion.div key={t.name} variants={fadeUp} custom={i} className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Result banner */}
                  <div className="bg-emerald-500/10 px-6 py-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700">{t.result}</span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full">{t.metric}</span>
                  </div>
                  <div className="p-6">
                    <p className="text-on-surface leading-relaxed text-[15px] mb-5">&ldquo;{t.quote}&rdquo;</p>
                    <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">{t.avatar}</div>
                        <div>
                          <div className="font-bold text-sm">{t.name}</div>
                          <div className="text-xs text-on-surface-variant">{t.program}</div>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-primary bg-primary/8 px-2.5 py-1 rounded-full">{t.saved}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══ PRICING ═══ */}
        <section id="pricing" className="py-20 md:py-28 px-5 md:px-8 bg-surface-container-low">
          <div className="max-w-5xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="text-center mb-14">
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-3 font-headline">
                Agents charge <span className="text-error line-through">₹1-3 Lakh</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-on-surface-variant text-lg">You can start for free. Our max plan is ₹9,999/year.</motion.p>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="grid md:grid-cols-3 gap-5">
              {[
                {
                  name: "Free",
                  price: "₹0",
                  period: "forever",
                  desc: "See if RIBRIZ works for you",
                  features: ["Profile assessment", "Basic university search", "3 university matches"],
                  cta: "Start Free",
                  highlighted: false,
                },
                {
                  name: "Explorer",
                  price: "₹2,999",
                  period: "/year",
                  desc: "Everything to apply independently",
                  badge: "Best Value",
                  features: [
                    "Unlimited university matching",
                    "Admission chance scoring",
                    "Document checklists",
                    "Application tracker",
                    "Email support",
                  ],
                  cta: "Start 7-Day Free Trial",
                  highlighted: true,
                },
                {
                  name: "Pro",
                  price: "₹9,999",
                  period: "/year",
                  desc: "Full support, match to visa",
                  features: [
                    "Everything in Explorer",
                    "AI SOP assistant (unlimited)",
                    "Priority support",
                    "Visa counseling",
                    "1-on-1 expert session",
                  ],
                  cta: "Go Pro",
                  highlighted: false,
                },
              ].map((plan, i) => (
                <motion.div
                  key={plan.name}
                  variants={fadeUp}
                  custom={i}
                  className={`rounded-xl overflow-hidden flex flex-col ${
                    plan.highlighted
                      ? "bg-primary text-white ring-2 ring-primary shadow-2xl shadow-primary/20 md:-mt-4 md:mb-auto"
                      : "bg-surface-container-lowest border border-outline-variant/10"
                  }`}
                >
                  <div className="p-6 md:p-7 flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-base font-bold font-headline">{plan.name}</h3>
                      {"badge" in plan && plan.badge && (
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">{plan.badge}</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-4xl font-extrabold tracking-tighter font-headline">{plan.price}</span>
                      <span className={`text-sm ${plan.highlighted ? "text-white/50" : "text-on-surface-variant"}`}>{plan.period}</span>
                    </div>
                    <p className={`text-sm mb-5 ${plan.highlighted ? "text-white/60" : "text-on-surface-variant"}`}>{plan.desc}</p>
                    <ul className="space-y-2.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <span className={`material-symbols-outlined text-base mt-0.5 ${plan.highlighted ? "text-white/80" : "text-primary"}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                            check_circle
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="px-6 md:px-7 pb-6 md:pb-7">
                    <Link
                      href="/signup"
                      className={`block w-full py-3.5 rounded-md font-bold text-center text-sm transition-all ${
                        plan.highlighted
                          ? "bg-white text-primary hover:bg-white/90 shadow-lg"
                          : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <p className="text-center text-xs text-on-surface-variant mt-6">
              7-day money-back guarantee on all paid plans. Cancel anytime. No questions asked.
            </p>
          </div>
        </section>

        {/* ═══ FAQ ═══ */}
        <section id="faq" className="py-20 md:py-28 px-5 md:px-8">
          <div className="max-w-3xl mx-auto">
            <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-10 font-headline text-center">
              Still have questions?
            </motion.h2>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="space-y-3">
              {[
                {
                  q: "How is RIBRIZ different from a study abroad agent?",
                  a: "Agents earn commissions from universities — so they push institutions that pay them, not the ones right for you. RIBRIZ earns zero from universities. Our recommendations are 100% based on your profile fit. Plus you get AI tools, real-time tracking, and 24/7 access — things no agent provides.",
                },
                {
                  q: "Can RIBRIZ actually replace an agent?",
                  a: "For the vast majority of students, yes. The platform handles university matching, admission scoring, SOP writing, document management, application tracking, and visa guidance. Our Pro plan includes 1-on-1 expert sessions for complex cases like visa interviews or scholarship applications.",
                },
                {
                  q: "Is the free plan really free? What's the catch?",
                  a: "No catch. Free gives you profile assessment and 3 university matches. It's enough to see if RIBRIZ works for you. We make money when students upgrade for unlimited matching and the SOP tools — not from hidden fees or university commissions.",
                },
                {
                  q: "What if I've already started my applications?",
                  a: "You can join at any stage. Many students join mid-cycle to use the SOP assistant or application tracker for remaining submissions. Your existing work doesn't go to waste.",
                },
                {
                  q: "Do you guarantee admission?",
                  a: "No — and you should run from anyone who does. Universities make independent decisions. What we guarantee: your applications will be stronger, better-targeted, and submitted on time. Our students average a 73% admit rate across their applications.",
                },
                {
                  q: "How accurate is the admission chance scoring?",
                  a: "Our model is trained on historical admission data across 300+ universities. It correctly predicts the outcome (admit/reject) 82% of the time. We're transparent about this — you'll see confidence intervals on every score, not just a single number.",
                },
              ].map((faq, i) => (
                <motion.div key={i} variants={fadeUp} className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left font-bold text-sm md:text-base text-on-surface hover:text-primary transition-colors"
                  >
                    {faq.q}
                    <span className={`material-symbols-outlined text-xl shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}>
                      expand_more
                    </span>
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{ maxHeight: openFaq === i ? "200px" : "0px", opacity: openFaq === i ? 1 : 0 }}
                  >
                    <div className="px-5 pb-5 text-sm text-on-surface-variant leading-relaxed">
                      {faq.a}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══ FINAL CTA — URGENCY ═══ */}
        <section className="py-16 md:py-24 px-5 md:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="max-w-4xl mx-auto relative overflow-hidden rounded-2xl"
          >
            <div className="absolute inset-0 editorial-gradient" />
            <div className="relative z-10 text-center px-8 py-14 md:py-20 text-white">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full mb-6">
                <span className="material-symbols-outlined text-base text-amber-300">schedule</span>
                <span className="text-xs font-bold uppercase tracking-wider">
                  Fall 2026 early deadlines: Sep–Nov 2026
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-4 font-headline">
                Students who start early get into better universities.
              </h2>
              <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
                Your profile takes 10 minutes. Your first university matches appear instantly.
                The only thing you lose by waiting is time.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-white text-primary px-10 py-4 rounded-md font-bold text-lg hover:bg-white/90 transition-colors shadow-xl"
              >
                Check My Admission Chances
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <p className="text-sm text-white/40 mt-4">Free. No credit card. No spam. No agent.</p>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-10 md:py-12 bg-surface-container-low border-t border-outline-variant/10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="font-headline font-bold text-lg mb-2">RIBRIZ</div>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-2">
              AI-powered study abroad platform. University matching, admission prediction, and SOP generation — all without an agent.
            </p>
            <p className="text-xs text-on-surface-variant">&copy; {new Date().getFullYear()} RIBRIZ</p>
          </div>
          <div>
            <h4 className="font-bold text-xs mb-3 font-headline uppercase tracking-widest text-on-surface-variant">Product</h4>
            <ul className="space-y-2">
              <li><a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#how-it-works">How It Works</a></li>
              <li><a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#pricing">Pricing</a></li>
              <li><Link className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="/universities">Universities</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-xs mb-3 font-headline uppercase tracking-widest text-on-surface-variant">Resources</h4>
            <ul className="space-y-2">
              <li><Link className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="/onboarding">Application Guide</Link></li>
              <li><a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#faq">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-xs mb-3 font-headline uppercase tracking-widest text-on-surface-variant">Legal</h4>
            <ul className="space-y-2">
              <li><Link className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="/settings">Privacy Policy</Link></li>
              <li><Link className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="/settings">Terms</Link></li>
            </ul>
          </div>
        </div>
      </footer>

      {/* ═══ MOBILE STICKY CTA ═══ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-container-lowest/95 backdrop-blur-xl border-t border-outline-variant/10 px-4 py-3 safe-area-bottom">
        <Link href="/signup" className="flex items-center justify-center gap-2 w-full editorial-gradient text-white py-3.5 rounded-lg font-bold text-sm shadow-lg shadow-primary/20">
          Check Your Admission Chances — Free
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}
