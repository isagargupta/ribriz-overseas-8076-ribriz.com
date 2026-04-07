"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

const searchableItems = [
  { label: "Dashboard", href: "/dashboard", keywords: "home overview stats" },
  { label: "University Matching", href: "/universities", keywords: "university match find programs" },
  { label: "SOP Writer", href: "/sop-writer", keywords: "sop statement purpose letter motivation" },
  { label: "Application Tracker", href: "/applications", keywords: "applications track status kanban" },
  { label: "Document Checklist", href: "/documents", keywords: "documents upload files checklist" },
  { label: "Visa Support", href: "/visa", keywords: "visa checklist germany australia canada uk usa ireland" },
  { label: "Settings", href: "/settings", keywords: "settings account subscription notifications privacy" },
  { label: "Onboarding", href: "/onboarding", keywords: "profile setup onboarding academic" },
];

export function AISearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  if (!open) return null;

  const filtered = query
    ? searchableItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.keywords.includes(query.toLowerCase())
      )
    : searchableItems;

  const navigate = (href: string) => {
    router.push(href);
    onClose();
    setQuery("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-outline-variant/15 overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-outline-variant/10">
          <Search size={16} className="text-on-surface-variant shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages..."
            className="flex-1 py-4 text-sm text-on-surface border-none focus:ring-0 bg-transparent placeholder:text-outline-variant"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && filtered.length > 0) navigate(filtered[0].href);
            }}
          />
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary p-1 rounded">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {filtered.map((item) => (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-on-surface hover:bg-secondary/5 hover:text-secondary transition-colors"
            >
              {item.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-sm text-on-surface-variant text-center">
              No results for &quot;{query}&quot;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
