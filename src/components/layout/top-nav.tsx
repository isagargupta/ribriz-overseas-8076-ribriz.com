"use client";

import { useTheme } from "@/components/theme-provider";
import { useCreditContext } from "@/contexts/credits";

export function TopNav({
  userName: _userName,
  userInitials: _userInitials,
  userRole: _userRole,
}: {
  userName: string;
  userInitials: string;
  userRole?: string;
}) {
  const { theme, toggleTheme } = useTheme();
  const { credits, showCreditGate } = useCreditContext();

  return (
    <header className="w-full h-14 md:h-16 sticky top-0 z-40 bg-surface border-b border-outline-variant/20 flex justify-between items-center px-4 md:px-8 transition-colors duration-300">
      {/* Search */}
      <div className="flex items-center bg-surface-container-low px-3 md:px-4 py-2 rounded-lg flex-1 max-w-xs md:max-w-none md:min-w-[320px] md:flex-none transition-colors">
        <span className="material-symbols-outlined text-outline text-sm">search</span>
        <input
          className="bg-transparent border-none focus:ring-0 text-sm w-full font-body placeholder:text-outline-variant text-on-surface focus:outline-none ml-2"
          placeholder="Search..."
          type="text"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 md:gap-6 ml-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="relative p-2 rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-all"
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          <span className="material-symbols-outlined text-xl">
            {theme === "light" ? "dark_mode" : "light_mode"}
          </span>
        </button>

        {/* Notification bell */}
        <button className="relative p-1 text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full border-2 border-surface" />
        </button>

        {/* Credit pill */}
        <button
          onClick={() => credits === 0 ? showCreditGate() : undefined}
          title={`${credits} credits remaining`}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold tabular-nums border transition-colors select-none
            ${credits === 0
              ? "border-error/60 text-error bg-error/10 hover:bg-error/20 cursor-pointer"
              : credits < 10
              ? "border-amber-400/60 text-amber-600 dark:text-amber-400 bg-amber-400/10 cursor-default"
              : "border-primary/30 text-primary bg-primary/8 cursor-default"
            }`}
        >
          <span
            className="material-symbols-outlined leading-none"
            style={{ fontSize: 13, fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 20" }}
          >bolt</span>
          <span>{credits}</span>
        </button>

        {/* RIBRIZ Branding */}
        <div className="flex items-center gap-2 pl-3 md:pl-6 border-l border-outline-variant/20">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#3525cd] to-[#4f46e5]">
            <span className="text-[11px] font-extrabold text-white font-headline leading-none">R</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-[13px] font-bold tracking-tight text-on-surface font-headline leading-none">
              RIBRIZ
            </p>
            <p className="text-[9px] text-outline tracking-[0.1em] uppercase mt-[2px] leading-none font-medium">
              Overseas
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
