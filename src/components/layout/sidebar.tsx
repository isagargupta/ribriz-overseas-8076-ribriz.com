"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  AvatarDisplay,
  AvatarPicker,
  getStoredAvatar,
  type AvatarData,
} from "./avatar-picker";

const navGroups = [
  [
    { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
    { label: "Riz AI", href: "/riz-ai", icon: "psychology" },
    { label: "Counselor", href: "/counselor", icon: "support_agent" },
    { label: "Applications", href: "/applications", icon: "description" },
  ],
  [
    { label: "Workspaces", href: "/workspaces", icon: "workspaces" },
    { label: "University Match", href: "/universities", icon: "school" },
    { label: "Documents", href: "/documents", icon: "folder_open" },
  ],
  [
    { label: "SOP Writer", href: "/sop-writer", icon: "edit_note" },
    { label: "Scholarships", href: "/scholarships", icon: "workspace_premium" },
    { label: "Visa", href: "/visa", icon: "receipt_long" },
  ],
];

const bottomNav = [
  { label: "Support", href: "mailto:sgupta@ribriz.com", icon: "help" },
  { label: "Settings", href: "/settings", icon: "settings" },
];

export function Sidebar({
  userName,
  userInitials,
  userEmail,
  userPlan: _userPlan,
}: {
  userName: string;
  userInitials: string;
  userEmail: string;
  userPlan?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatar, setAvatar] = useState<AvatarData | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Always tell the main content area to use the collapsed (68px) offset
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("sidebar-toggle", { detail: { collapsed: true } })
    );
    setAvatar(getStoredAvatar());
    // Clean up any stale localStorage value
    localStorage.removeItem("sidebar-collapsed");
  }, []);

  // Listen for avatar changes from other components
  useEffect(() => {
    const handler = (e: Event) => {
      setAvatar((e as CustomEvent).detail as AvatarData);
    };
    window.addEventListener("avatar-change", handler);
    return () => window.removeEventListener("avatar-change", handler);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      )
        setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const checkActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  const handleSignOut = async () => {
    setProfileOpen(false);
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setProfileOpen(false);
  };

  return (
    <>
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        className={`sb hidden md:flex flex-col h-screen fixed left-0 top-0 z-50
          transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden
          ${isHovered ? "w-[256px] shadow-2xl shadow-black/50" : "w-[68px]"}`}
      >
        {/* ═══ TOP: User Profile ═══ */}
        <div
          ref={profileRef}
          className="shrink-0 relative px-3 pt-5 pb-3"
        >
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="relative shrink-0 group"
            >
              <AvatarDisplay
                avatar={avatar}
                initials={userInitials}
                size={38}
                className="ring-2 ring-white/10 group-hover:ring-white/25 transition-all duration-200"
              />
              <span className="absolute bottom-0 right-0 w-[10px] h-[10px] rounded-full bg-emerald-400 ring-[2px] ring-[#161b22]" />
            </button>

            {/* Name + email — slide in on hover */}
            <div
              className={`flex-1 min-w-0 flex items-center gap-1 transition-all duration-250 overflow-hidden
                ${isHovered ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0"}`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-white/90 truncate leading-tight whitespace-nowrap">
                  {userName}
                </p>
                <p className="text-[11px] text-white/35 truncate leading-tight mt-[2px] whitespace-nowrap">
                  {userEmail}
                </p>
              </div>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center justify-center w-7 h-7 rounded-md shrink-0
                  text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all duration-150"
              >
                <span className="material-symbols-outlined text-[18px]">
                  more_vert
                </span>
              </button>
            </div>
          </div>

          {/* ── Profile dropdown ── */}
          {profileOpen && isHovered && (
            <div className="absolute left-3 right-3 top-[72px] z-[70] sb-dropdown rounded-xl py-1.5 shadow-2xl">
              <button
                onClick={() => {
                  setProfileOpen(false);
                  setAvatarPickerOpen(true);
                }}
                className="sb-dropdown-item flex items-center gap-2.5 px-3.5 py-2.5 w-full text-left"
              >
                <span className="material-symbols-outlined text-[18px]">account_circle</span>
                <span className="text-[13px]">Change avatar</span>
              </button>
              <Link
                href="/settings"
                onClick={() => setProfileOpen(false)}
                className="sb-dropdown-item flex items-center gap-2.5 px-3.5 py-2.5"
              >
                <span className="material-symbols-outlined text-[18px]">person</span>
                <span className="text-[13px]">Edit profile</span>
              </Link>
              <Link
                href="/settings"
                onClick={() => setProfileOpen(false)}
                className="sb-dropdown-item flex items-center gap-2.5 px-3.5 py-2.5"
              >
                <span className="material-symbols-outlined text-[18px]">settings</span>
                <span className="text-[13px]">Account settings</span>
              </Link>
              <div className="my-1.5 mx-3 h-px bg-white/[0.06]" />
              <button
                onClick={handleSignOut}
                className="sb-dropdown-item flex items-center gap-2.5 px-3.5 py-2.5 w-full text-left"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span className="text-[13px]">Sign out</span>
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="sb-line mx-4 mb-4 mt-1" />

        {/* ═══ NAVIGATION ═══ */}
        <nav className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden sb-scroll px-2">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && <div className="sb-line my-[10px] mx-1" />}
              <div className="space-y-[2px]">
                {group.map((item) => {
                  const active = checkActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center gap-3 rounded-lg transition-all duration-150
                        px-[11px] h-[42px]
                        ${
                          active
                            ? "sb-nav-active text-white font-medium"
                            : "text-white/45 hover:text-white/80 hover:bg-white/[0.05]"
                        }`}
                    >
                      <span
                        className="material-symbols-outlined shrink-0 text-[21px] transition-all duration-150"
                        style={{
                          fontVariationSettings: active
                            ? "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24"
                            : "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
                        }}
                      >
                        {item.icon}
                      </span>
                      <span
                        className={`text-[13.5px] leading-none whitespace-nowrap font-body tracking-[-0.01em]
                          transition-all duration-250 overflow-hidden
                          ${isHovered ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0"}`}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ═══ BOTTOM: Support/Settings + Branding ═══ */}
        <div className="mt-auto shrink-0">
          <div className="sb-line mx-4" />

          <div className="py-[6px] px-2">
            {bottomNav.map((item) => {
              const isExternal =
                item.href.startsWith("mailto:") ||
                item.href.startsWith("http");
              const active = !isExternal && checkActive(item.href);

              const cls = `group flex items-center gap-3 rounded-lg transition-all duration-150
                px-[11px] h-[42px]
                ${active ? "sb-nav-active text-white font-medium" : "text-white/40 hover:text-white/75 hover:bg-white/[0.05]"}`;

              const inner = (
                <>
                  <span
                    className="material-symbols-outlined text-[21px] shrink-0 transition-all duration-150"
                    style={{
                      fontVariationSettings: active
                        ? "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24"
                        : "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
                    }}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={`text-[13.5px] leading-none whitespace-nowrap font-body tracking-[-0.01em]
                      transition-all duration-250 overflow-hidden
                      ${isHovered ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0"}`}
                  >
                    {item.label}
                  </span>
                </>
              );

              return isExternal ? (
                <a key={item.label} href={item.href} className={cls}>
                  {inner}
                </a>
              ) : (
                <Link key={item.label} href={item.href} className={cls}>
                  {inner}
                </Link>
              );
            })}
          </div>

          {/* ── RIBRIZ Branding ── */}
          <div className="sb-line mx-4" />
          <div className="py-4 flex items-center px-[13px] gap-2.5">
            <div className="flex items-center justify-center w-[28px] h-[28px] rounded-lg bg-gradient-to-br from-[#252f3e] to-[#2e3a4d] shrink-0 border border-white/10">
              <span className="text-[10px] font-extrabold text-white font-headline leading-none">
                R
              </span>
            </div>
            <div
              className={`transition-all duration-250 overflow-hidden
                ${isHovered ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0"}`}
            >
              <p className="text-[13px] font-bold text-white/70 tracking-tight font-headline leading-none whitespace-nowrap">
                RIBRIZ
              </p>
              <p className="text-[9px] text-white/20 tracking-[0.12em] uppercase mt-[3px] leading-none font-medium whitespace-nowrap">
                Academic Consultancy
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Avatar Picker Modal */}
      {avatarPickerOpen && (
        <AvatarPicker
          initials={userInitials}
          currentAvatar={avatar}
          onSelect={(a) => setAvatar(a)}
          onClose={() => setAvatarPickerOpen(false)}
        />
      )}
    </>
  );
}
