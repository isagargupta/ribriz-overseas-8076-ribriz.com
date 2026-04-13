"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: "bar_chart" },
  { label: "Users", href: "/admin/users", icon: "group" },
  { label: "Payments", href: "/admin/payments", icon: "payments" },
];

export function AdminSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col border-r border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] z-50">
      {/* Header */}
      <div className="px-5 py-5 border-b border-[var(--color-outline-variant)]">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-widest text-[var(--color-primary)] uppercase">
            Ribriz
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] font-medium">
            Admin
          </span>
        </Link>
        <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-1 truncate">
          {userEmail}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] font-medium"
                  : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-[var(--color-outline-variant)] space-y-0.5">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to App
        </Link>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--color-error)] hover:bg-[var(--color-error-container)] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
