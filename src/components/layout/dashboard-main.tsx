"use client";

import { useState, useEffect } from "react";

export function DashboardMain({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setCollapsed(detail.collapsed);
    };
    window.addEventListener("sidebar-toggle", handler);
    return () => window.removeEventListener("sidebar-toggle", handler);
  }, []);

  return (
    <main
      className={`min-h-screen bg-surface transition-all duration-300
        ${collapsed ? "md:ml-[68px]" : "md:ml-[256px]"}`}
    >
      {children}
    </main>
  );
}
