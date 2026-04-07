"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

/* ── Animated counter ─────────────────────────────────── */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) {
      setDisplay(value);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 600;
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(eased * value));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return <span ref={ref} className={className}>{display}</span>;
}

/* ── Live pulse dot ───────────────────────────────────── */
export function LivePulse({ className }: { className?: string }) {
  return (
    <span className={`relative flex h-2 w-2 ${className || ""}`}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
    </span>
  );
}

/* ── Relative time that updates live ──────────────────── */
export function RelativeTime({ date, className }: { date: string; className?: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const update = () => {
      const d = new Date(date);
      const now = Date.now();
      const diff = now - d.getTime();
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (mins < 1) setText("Just now");
      else if (mins < 60) setText(`${mins}m ago`);
      else if (hours < 24) setText(`${hours}h ago`);
      else if (days < 7) setText(`${days}d ago`);
      else setText(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [date]);

  return <span className={className}>{text}</span>;
}

/* ── Auto-refresh wrapper ─────────────────────────────── */
export function AutoRefresh({ intervalMs = 120000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [router, intervalMs]);

  return null;
}

/* ── Countdown timer for deadlines ────────────────────── */
export function DeadlineCountdown({ days, className }: { days: number; className?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className={className}>{days}d left</span>;

  if (days <= 0) return <span className={`${className} text-error font-bold`}>Expired</span>;
  if (days <= 7) {
    const hours = days * 24;
    return (
      <span className={`${className} text-error`}>
        {days}d {hours % 24}h left
      </span>
    );
  }
  if (days <= 30) {
    const weeks = Math.floor(days / 7);
    const remaining = days % 7;
    return (
      <span className={className}>
        {weeks}w {remaining}d left
      </span>
    );
  }
  return <span className={className}>{days}d left</span>;
}

/* ── Animated profile ring (client-side for animation) ── */
export function ProfileRing({
  percentage,
  grade,
  gradeLabel,
}: {
  percentage: number;
  grade: string;
  gradeLabel: string;
}) {
  const [animated, setAnimated] = useState(0);
  const circumference = 2 * Math.PI * 54;

  useEffect(() => {
    const timeout = setTimeout(() => setAnimated(percentage), 100);
    return () => clearTimeout(timeout);
  }, [percentage]);

  const dashoffset = circumference * (1 - animated / 100);
  const color =
    percentage >= 80
      ? "text-primary"
      : percentage >= 60
      ? "text-secondary"
      : "text-error";

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
        {/* Background track */}
        <circle
          cx="60" cy="60" r="54"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="6"
          className="text-surface-container-low"
        />
        {/* Animated progress */}
        <circle
          cx="60" cy="60" r="54"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          className={`${color} transition-all duration-1000 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold font-headline text-on-surface">{grade}</span>
        <span className="text-[9px] font-bold text-outline uppercase tracking-wider mt-0.5">{gradeLabel}</span>
      </div>
    </div>
  );
}

/* ── University logo with fallback ────────────────────── */
export function UniversityLogo({
  logoUrl,
  name,
  size = 40,
  className,
}: {
  logoUrl: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const [error, setError] = useState(false);
  const abbrev = name
    .split(" ")
    .filter((w) => w.length > 1)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);

  if (!logoUrl || error) {
    return (
      <div
        className={`bg-surface-container rounded-lg flex items-center justify-center text-primary font-bold shrink-0 ${className || ""}`}
        style={{ width: size, height: size, fontSize: size * 0.25 }}
      >
        {abbrev || name.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={`${name} logo`}
      width={size}
      height={size}
      className={`rounded-lg object-contain bg-white shrink-0 ${className || ""}`}
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  );
}
