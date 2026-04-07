"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mobileNavItems = [
  { label: "Dash", href: "/dashboard", icon: "dashboard" },
  { label: "Riz AI", href: "/riz-ai", icon: "psychology" },
  { label: "Workspaces", href: "/workspaces", icon: "workspaces" },
  { label: "Match", href: "/universities", icon: "school" },
  { label: "Account", href: "/settings", icon: "person" },
];

export function MobileNav({
  userName: _userName,
  userInitials: _userInitials,
  userEmail: _userEmail,
}: {
  userName: string;
  userInitials: string;
  userEmail: string;
}) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 glass-panel z-50 flex justify-around items-center px-4 border-t border-outline-variant/10 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] transition-colors duration-300">
      {mobileNavItems.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "flex flex-col items-center gap-1 text-primary"
                : "flex flex-col items-center gap-1 text-outline hover:text-primary transition-colors"
            }
          >
            <span
              className="material-symbols-outlined"
              style={
                isActive
                  ? { fontVariationSettings: "'FILL' 1" }
                  : undefined
              }
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-tighter">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
