"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.09, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};
const stagger = { visible: { transition: { staggerChildren: 0.07 } } };

const formSchema = z.object({
  orgName: z.string().min(2, "Organization name is required"),
  contactName: z.string().min(2, "Your name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  orgType: z.string().min(1, "Please select your organization type"),
  city: z.string().optional(),
  studentsPerYear: z.string().optional(),
  message: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function PartnersPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  async function onSubmit(data: FormValues) {
    setSubmitting(true);
    setServerError("");
    try {
      const res = await fetch("/api/partners/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
    } catch {
      setServerError("Something went wrong. Please email us at sgupta@ribriz.com");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#191c1e] overflow-x-hidden">

      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-xl border-b border-black/[0.06]">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-5 md:px-10 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-xl font-extrabold tracking-tighter font-headline text-[#191c1e]">RIBRIZ</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#3525cd] bg-[#3525cd]/8 px-1.5 py-0.5 rounded">AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden md:inline-block text-sm font-semibold text-[#464555] hover:text-[#3525cd] transition-colors">
              Log in
            </Link>
            <a href="#apply" className="bg-[#3525cd] text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-[#2a1eb5] transition-all shadow-sm">
              Become a Partner
            </a>
          </div>
        </div>
      </header>

      <main>

        {/* HERO */}
        <section className="pt-28 pb-20 bg-[#eeeeff] overflow-hidden">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-5xl mx-auto px-5 md:px-8 text-center"
          >
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3525cd]" />
              <span className="text-sm font-semibold text-[#3525cd] tracking-wide">RIBRIZ Partner Program</span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-[2.4rem] sm:text-[3.2rem] md:text-[4rem] font-extrabold tracking-tighter leading-[1.06] mb-6 font-headline text-[#191c1e]"
            >
              Help your students get
              <br />
              <span className="text-[#3525cd]">into their dream universities.</span>
              <br />
              Earn while you do it.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg md:text-xl text-[#464555] leading-relaxed mb-8 max-w-2xl mx-auto"
            >
              Give your students access to AI-powered university matching, real admission odds, and SOP tools —
              without building any tech yourself. We handle the platform. You grow your business.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <a
                href="#apply"
                className="bg-[#3525cd] text-white px-9 py-4 rounded-full font-bold text-base hover:bg-[#2a1eb5] transition-all shadow-lg shadow-[#3525cd]/25 flex items-center justify-center gap-2"
              >
                Apply for Partnership
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </a>
              <a
                href="#how-it-works"
                className="px-7 py-4 rounded-full font-bold text-base text-[#3525cd] border-2 border-[#3525cd]/25 hover:border-[#3525cd]/60 hover:bg-[#3525cd]/5 transition-all flex items-center justify-center"
              >
                See how it works
              </a>
            </motion.div>

            {/* Trust chips */}
            <motion.div variants={fadeUp} custom={4} className="flex flex-wrap gap-3 justify-center">
              {[
                { icon: "groups", label: "120+ Active Partners" },
                { icon: "payments", label: "Up to 30% Revenue Share" },
                { icon: "bolt", label: "Live in 48 Hours" },
                { icon: "lock", label: "No Tech Investment" },
              ].map((chip) => (
                <div key={chip.label} className="inline-flex items-center gap-2 bg-white/70 border border-black/[0.08] px-3.5 py-2 rounded-full text-sm font-semibold text-[#191c1e]">
                  <span className="material-symbols-outlined text-[#3525cd] text-[16px]">{chip.icon}</span>
                  {chip.label}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* WHO IS THIS FOR */}
        <section className="py-20 px-5 md:px-8 bg-white">
          <div className="max-w-5xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="text-center mb-12">
              <motion.p variants={fadeUp} className="text-sm font-bold text-[#3525cd] uppercase tracking-widest mb-3">Who it&apos;s for</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold tracking-tighter font-headline text-[#191c1e]">
                Built for organizations
                <br />that send students abroad
              </motion.h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={stagger}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
            >
              {[
                {
                  icon: "business",
                  title: "Study Abroad Agencies",
                  desc: "Offer data-driven university matching to compete with big players. No tech team needed.",
                },
                {
                  icon: "school",
                  title: "Coaching Centers",
                  desc: "Add overseas counseling as a premium service alongside IELTS, TOEFL, and GRE prep.",
                },
                {
                  icon: "account_balance",
                  title: "Schools & Colleges",
                  desc: "Give your placement cell a professional AI tool to guide students to the right global programs.",
                },
                {
                  icon: "devices",
                  title: "EdTech Platforms",
                  desc: "Embed RIBRIZ university matching into your platform via API and create a full-stack product.",
                },
              ].map((card, i) => (
                <motion.div
                  key={card.title}
                  variants={fadeUp}
                  custom={i}
                  className="bg-[#f7f9fb] border border-black/[0.07] p-6"
                >
                  <div className="w-10 h-10 bg-[#3525cd]/10 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-[#3525cd] text-xl">{card.icon}</span>
                  </div>
                  <h3 className="text-base font-bold text-[#191c1e] mb-2 font-headline">{card.title}</h3>
                  <p className="text-sm text-[#464555] leading-relaxed">{card.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* WHAT YOU GET */}
        <section className="py-20 px-5 md:px-8" style={{ background: "#0d1117" }}>
          <div className="max-w-5xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="mb-14">
              <motion.p variants={fadeUp} className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#bfc1ff" }}>Partner benefits</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold tracking-tighter font-headline text-white leading-[1.05]">
                Everything you need to
                <br />offer a world-class service
              </motion.h2>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger} className="grid md:grid-cols-3 gap-4">
              {[
                {
                  icon: "hub",
                  title: "Partner Dashboard",
                  desc: "Manage all your student accounts in one place. Track applications, see progress, get alerts.",
                  highlight: false,
                },
                {
                  icon: "payments",
                  title: "Revenue Share",
                  desc: "Earn up to 30% on every student subscription that comes through your referral. Paid monthly.",
                  highlight: true,
                },
                {
                  icon: "auto_awesome",
                  title: "Full AI Suite Access",
                  desc: "Your students get AI university matching, SOP generation, admission scoring, and document tools.",
                  highlight: false,
                },
                {
                  icon: "brand_awareness",
                  title: "Co-Branded Experience",
                  desc: "Optional white-label mode. Show your logo alongside ours so students trust your brand.",
                  highlight: false,
                },
                {
                  icon: "support_agent",
                  title: "Dedicated Partner Support",
                  desc: "Priority support line, onboarding call, and a dedicated account manager for scale partners.",
                  highlight: false,
                },
                {
                  icon: "analytics",
                  title: "Conversion Analytics",
                  desc: "See which students converted, which programs they chose, and how much you earned in real time.",
                  highlight: false,
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  variants={fadeUp}
                  custom={i}
                  className="relative p-7 overflow-hidden"
                  style={{
                    background: item.highlight ? "rgba(53,37,205,0.25)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${item.highlight ? "rgba(53,37,205,0.6)" : "rgba(255,255,255,0.07)"}`,
                  }}
                >
                  {item.highlight && (
                    <div className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded" style={{ background: "rgba(53,37,205,0.5)", color: "#bfc1ff" }}>
                      Most Popular
                    </div>
                  )}
                  <div
                    className="w-10 h-10 flex items-center justify-center mb-5"
                    style={{ background: "rgba(53,37,205,0.35)", border: "1px solid rgba(53,37,205,0.5)" }}
                  >
                    <span className="material-symbols-outlined text-xl" style={{ color: "#bfc1ff" }}>{item.icon}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white font-headline mb-2">{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-20 md:py-28 px-5 md:px-8 bg-white">
          <div className="max-w-5xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="text-center mb-14">
              <motion.p variants={fadeUp} className="text-sm font-bold text-[#3525cd] uppercase tracking-widest mb-3">How it works</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold tracking-tighter font-headline text-[#191c1e]">
                Go live in 48 hours
              </motion.h2>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger} className="grid md:grid-cols-4 gap-6 relative">
              {/* Connector line — desktop only */}
              <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-[#3525cd]/15 pointer-events-none" />

              {[
                { num: "01", icon: "assignment_turned_in", title: "Apply", desc: "Fill the partnership form. We review and approve within 24 hours." },
                { num: "02", icon: "key", title: "Get Access", desc: "Receive your partner dashboard credentials and referral link." },
                { num: "03", icon: "person_add", title: "Onboard Students", desc: "Share your link or add students directly from your dashboard." },
                { num: "04", icon: "account_balance_wallet", title: "Earn Monthly", desc: "Get paid every month as your students convert and upgrade." },
              ].map((step, i) => (
                <motion.div key={step.num} variants={fadeUp} custom={i} className="flex flex-col items-center text-center">
                  <div className="relative w-20 h-20 rounded-full bg-[#eeeeff] border-4 border-white flex items-center justify-center mb-5 shadow-sm">
                    <span className="material-symbols-outlined text-[#3525cd] text-3xl">{step.icon}</span>
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#3525cd] flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">{step.num}</span>
                    </div>
                  </div>
                  <h3 className="text-base font-bold font-headline text-[#191c1e] mb-2">{step.title}</h3>
                  <p className="text-sm text-[#464555] leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* NUMBERS */}
        <section className="py-16 px-5 md:px-8 bg-[#3525cd]">
          <div className="max-w-5xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { val: "120+", label: "Active Partners" },
                { val: "18,000+", label: "Students Placed" },
                { val: "30%", label: "Max Revenue Share" },
                { val: "48 hrs", label: "Time to Go Live" },
              ].map((stat, i) => (
                <motion.div key={stat.label} variants={fadeUp} custom={i}>
                  <div className="text-3xl md:text-4xl font-extrabold text-white font-headline leading-none mb-2">{stat.val}</div>
                  <div className="text-sm font-semibold text-white/60">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* PARTNER TESTIMONIALS */}
        <section className="py-20 md:py-28 px-5 md:px-8 bg-[#f7f9fb]">
          <div className="max-w-5xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="text-center mb-12">
              <motion.p variants={fadeUp} className="text-sm font-bold text-[#3525cd] uppercase tracking-widest mb-3">Partner stories</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold tracking-tighter font-headline text-[#191c1e]">
                What our partners say
              </motion.h2>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger} className="grid md:grid-cols-3 gap-5">
              {[
                {
                  initials: "AR",
                  color: "bg-violet-100 text-violet-700",
                  name: "Anil Rao",
                  role: "Founder, Abroad Pathways — Hyderabad",
                  text: "We were a 3-person agency competing with well-funded counselors. RIBRIZ gave us a platform that made our advice data-driven. Our conversion rate went from 40% to 72% in one cycle.",
                },
                {
                  initials: "SM",
                  color: "bg-blue-100 text-blue-700",
                  name: "Sunita Mehta",
                  role: "Director, The Coaching Hub — Mumbai",
                  text: "We added overseas counseling as a service to our IELTS batches. Within 3 months it became our highest-margin offering. The RIBRIZ dashboard is genuinely easy to manage.",
                },
                {
                  initials: "DK",
                  color: "bg-emerald-100 text-emerald-700",
                  name: "Dr. Dhruv Kumar",
                  role: "Head of International Relations, Delhi College",
                  text: "Our placement cell now uses RIBRIZ for all study abroad guidance. Students get real admission data, not guesswork. The white-label option keeps it under our brand.",
                },
              ].map((t, i) => (
                <motion.div key={t.name} variants={fadeUp} custom={i} className="bg-white border border-black/[0.07] p-6 flex flex-col gap-4">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className="text-amber-400 text-sm">★</span>
                    ))}
                  </div>
                  <p className="text-sm text-[#464555] leading-relaxed flex-1">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-3 border-t border-black/[0.06]">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${t.color}`}>{t.initials}</div>
                    <div>
                      <div className="text-xs font-bold text-[#191c1e]">{t.name}</div>
                      <div className="text-[10px] text-[#777587]">{t.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* PARTNERSHIP TIERS */}
        <section className="py-20 md:py-28 px-5 md:px-8 bg-white">
          <div className="max-w-5xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="text-center mb-12">
              <motion.p variants={fadeUp} className="text-sm font-bold text-[#3525cd] uppercase tracking-widest mb-3">Partnership tiers</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold tracking-tighter font-headline text-[#191c1e]">
                The more you grow, the more you earn
              </motion.h2>
              <motion.p variants={fadeUp} className="text-[#464555] mt-3 max-w-xl mx-auto">
                All tiers get full platform access. Revenue share scales as your student volume grows.
              </motion.p>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger} className="grid md:grid-cols-3 gap-5">
              {[
                {
                  tier: "Starter",
                  students: "1 – 50 students/year",
                  share: "15%",
                  features: [
                    "Partner dashboard",
                    "Unique referral link",
                    "Email support",
                    "Monthly payout",
                    "RIBRIZ co-branding",
                  ],
                  dark: false,
                  badge: null,
                },
                {
                  tier: "Growth",
                  students: "51 – 200 students/year",
                  share: "22%",
                  features: [
                    "Everything in Starter",
                    "Priority support",
                    "Bulk student imports",
                    "Conversion analytics",
                    "Optional white-label",
                  ],
                  dark: true,
                  badge: "Most Popular",
                },
                {
                  tier: "Scale",
                  students: "200+ students/year",
                  share: "30%",
                  features: [
                    "Everything in Growth",
                    "Dedicated account manager",
                    "Full white-label + custom domain",
                    "API access",
                    "Custom integrations",
                  ],
                  dark: false,
                  badge: null,
                },
              ].map((tier, i) => (
                <motion.div
                  key={tier.tier}
                  variants={fadeUp}
                  custom={i}
                  className="relative border p-8"
                  style={{
                    background: tier.dark ? "#161b22" : "#fafafa",
                    borderColor: tier.dark ? "transparent" : "rgba(0,0,0,0.08)",
                  }}
                >
                  {tier.badge && (
                    <div className="absolute top-4 right-4 text-[9px] font-bold uppercase tracking-widest px-2 py-1" style={{ background: "rgba(53,37,205,0.4)", color: "#bfc1ff" }}>
                      {tier.badge}
                    </div>
                  )}
                  <div className="mb-6 pb-5" style={{ borderBottom: `1px solid ${tier.dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}` }}>
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: tier.dark ? "#bfc1ff" : "#777587" }}>{tier.tier}</div>
                    <div className="text-4xl font-extrabold font-headline mb-1" style={{ color: tier.dark ? "#fff" : "#191c1e" }}>{tier.share}</div>
                    <div className="text-sm" style={{ color: tier.dark ? "rgba(255,255,255,0.4)" : "#777587" }}>revenue share · {tier.students}</div>
                  </div>
                  <ul className="space-y-3.5">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5" style={{ background: tier.dark ? "rgba(53,37,205,0.4)" : "rgba(53,37,205,0.1)" }}>
                          <span className="material-symbols-outlined text-[#3525cd] text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                        </div>
                        <span className="text-sm" style={{ color: tier.dark ? "rgba(255,255,255,0.65)" : "#464555" }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* PARTNERSHIP FORM */}
        <section id="apply" className="py-20 md:py-28 px-5 md:px-8" style={{ background: "#0d1117" }}>
          <div className="max-w-3xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="mb-12">
              <motion.p variants={fadeUp} className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#bfc1ff" }}>Apply now</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold tracking-tighter font-headline text-white leading-[1.05] mb-4">
                Start your partnership today
              </motion.h2>
              <motion.p variants={fadeUp} className="text-base" style={{ color: "rgba(255,255,255,0.4)" }}>
                Fill the form and we&apos;ll reach out within 24 hours to set up your account and onboarding call.
              </motion.p>
            </motion.div>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="border p-10 text-center"
                style={{ background: "rgba(53,37,205,0.15)", borderColor: "rgba(53,37,205,0.4)" }}
              >
                <div className="w-14 h-14 flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(53,37,205,0.4)" }}>
                  <span className="material-symbols-outlined text-3xl" style={{ color: "#bfc1ff", fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <h3 className="text-2xl font-extrabold text-white font-headline mb-3">Application received!</h3>
                <p className="text-base" style={{ color: "rgba(255,255,255,0.5)" }}>
                  We&apos;ll review your application and contact you at the email you provided within 24 hours.
                </p>
              </motion.div>
            ) : (
              <motion.form
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={stagger}
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
              >
                <motion.div variants={fadeUp} className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Organization Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      {...register("orgName")}
                      placeholder="Abroad Pathways Pvt. Ltd."
                      className="w-full px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#3525cd] transition-colors"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                    {errors.orgName && <p className="text-red-400 text-xs mt-1">{errors.orgName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Your Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      {...register("contactName")}
                      placeholder="Anil Rao"
                      className="w-full px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#3525cd] transition-colors"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                    {errors.contactName && <p className="text-red-400 text-xs mt-1">{errors.contactName.message}</p>}
                  </div>
                </motion.div>

                <motion.div variants={fadeUp} className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Business Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      {...register("email")}
                      type="email"
                      placeholder="anil@abroadpathways.in"
                      className="w-full px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#3525cd] transition-colors"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                    {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Phone (WhatsApp preferred)
                    </label>
                    <input
                      {...register("phone")}
                      type="tel"
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#3525cd] transition-colors"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                  </div>
                </motion.div>

                <motion.div variants={fadeUp} className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Organization Type <span className="text-red-400">*</span>
                    </label>
                    <select
                      {...register("orgType")}
                      className="w-full px-4 py-3 text-sm text-white outline-none focus:border-[#3525cd] transition-colors appearance-none"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      <option value="" className="bg-[#161b22]">Select type…</option>
                      <option value="Study Abroad Agency" className="bg-[#161b22]">Study Abroad Agency</option>
                      <option value="Coaching Center" className="bg-[#161b22]">Coaching Center (IELTS/GRE/TOEFL)</option>
                      <option value="School / College" className="bg-[#161b22]">School / College</option>
                      <option value="EdTech Platform" className="bg-[#161b22]">EdTech Platform</option>
                      <option value="Financial Services" className="bg-[#161b22]">Financial Services / Forex</option>
                      <option value="Other" className="bg-[#161b22]">Other</option>
                    </select>
                    {errors.orgType && <p className="text-red-400 text-xs mt-1">{errors.orgType.message}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                      City / Location
                    </label>
                    <input
                      {...register("city")}
                      placeholder="Hyderabad, Telangana"
                      className="w-full px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#3525cd] transition-colors"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                  </div>
                </motion.div>

                <motion.div variants={fadeUp}>
                  <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                    How many students do you work with per year?
                  </label>
                  <select
                    {...register("studentsPerYear")}
                    className="w-full px-4 py-3 text-sm text-white outline-none focus:border-[#3525cd] transition-colors appearance-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <option value="" className="bg-[#161b22]">Select range…</option>
                    <option value="1–25" className="bg-[#161b22]">1 – 25 students</option>
                    <option value="26–100" className="bg-[#161b22]">26 – 100 students</option>
                    <option value="101–500" className="bg-[#161b22]">101 – 500 students</option>
                    <option value="500+" className="bg-[#161b22]">500+ students</option>
                  </select>
                </motion.div>

                <motion.div variants={fadeUp}>
                  <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Anything else you&apos;d like us to know?
                  </label>
                  <textarea
                    {...register("message")}
                    rows={4}
                    placeholder="Tell us about your current services, goals, or any specific questions about the partnership…"
                    className="w-full px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#3525cd] transition-colors resize-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </motion.div>

                {serverError && (
                  <p className="text-red-400 text-sm">{serverError}</p>
                )}

                <motion.div variants={fadeUp}>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2.5 bg-[#3525cd] hover:bg-[#2a1eb5] disabled:opacity-60 text-white px-8 py-4 font-bold text-base transition-all shadow-lg shadow-[#3525cd]/30"
                  >
                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        Submit Partnership Application
                        <span className="material-symbols-outlined text-xl">arrow_forward</span>
                      </>
                    )}
                  </button>
                  <p className="text-center text-[11px] mt-3" style={{ color: "rgba(255,255,255,0.22)" }}>
                    We review every application personally. Expect a reply within 24 hours.
                  </p>
                </motion.div>
              </motion.form>
            )}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-16 px-5 md:px-8 bg-white">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-extrabold tracking-tighter font-headline text-[#191c1e] mb-4">
                Still have questions?
              </motion.h2>
              <motion.p variants={fadeUp} className="text-[#464555] mb-6">
                Email us directly and we&apos;ll get back to you within a few hours.
              </motion.p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <motion.a
                  variants={fadeUp}
                  href="mailto:sgupta@ribriz.com"
                  className="inline-flex items-center gap-2 bg-[#191c1e] text-white px-7 py-3.5 font-bold text-sm hover:bg-[#2a1eb5] transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">mail</span>
                  sgupta@ribriz.com
                </motion.a>
                <motion.a
                  variants={fadeUp}
                  href="tel:+918076823071"
                  className="inline-flex items-center gap-2 border border-[#191c1e] text-[#191c1e] px-7 py-3.5 font-bold text-sm hover:bg-[#191c1e] hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">phone</span>
                  +91 80768 23071
                </motion.a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{ background: "#0d1117" }}>
        <div className="max-w-6xl mx-auto px-5 md:px-10 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tighter font-headline text-white">RIBRIZ</span>
              <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ background: "rgba(53,37,205,0.4)", color: "#bfc1ff" }}>AI</span>
            </Link>
            <div className="flex gap-6 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <Link href="/login" className="hover:text-white transition-colors">Log in</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            </div>
            <div className="flex items-center gap-2">
              {[
                { href: "https://www.instagram.com/ribrizventures/", label: "Instagram", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" },
                { href: "https://www.facebook.com/people/Ribriz-Overseas/61573363714278/", label: "Facebook", path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
                { href: "https://www.linkedin.com/company/ribriz", label: "LinkedIn", path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "white"; e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d={s.path} /></svg>
                </a>
              ))}
            </div>
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.22)" }}>
              &copy; {new Date().getFullYear()} RIBRIZ. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
