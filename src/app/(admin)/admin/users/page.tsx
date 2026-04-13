"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  nationality: string | null;
  city: string | null;
  credits: number;
  subscriptionTier: string;
  subscriptionExpiresAt: string | null;
  onboardingComplete: boolean;
  role: string;
  createdAt: string;
  _count: {
    applications: number;
    threads: number;
    paymentOrders: number;
  };
}

const TIERS = ["free", "basic", "premium", "elite"];

const tierColors: Record<string, string> = {
  free: "text-[var(--color-on-surface-variant)]",
  basic: "text-blue-600",
  premium: "text-purple-600",
  elite: "text-amber-600",
};

function UsersTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const search = searchParams.get("search") ?? "";
  const tier = searchParams.get("tier") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (tier) params.set("tier", tier);
    params.set("page", String(page));
    params.set("limit", "50");

    const res = await fetch(`/api/admin/users?${params}`);
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setUsers(data.users ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setLoading(false);
  }, [search, tier, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/admin/users?${params}`);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-on-surface)]">
            Users
          </h1>
          <p className="text-sm text-[var(--color-on-surface-variant)] mt-0.5">
            {total.toLocaleString()} total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[var(--color-on-surface-variant)]">
            search
          </span>
          <input
            type="text"
            placeholder="Search name, email, phone…"
            defaultValue={search}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                setParam("search", (e.target as HTMLInputElement).value);
            }}
            onBlur={(e) => setParam("search", e.target.value)}
            className="pl-9 pr-4 py-2 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-64"
          />
        </div>

        <select
          value={tier}
          onChange={(e) => setParam("tier", e.target.value)}
          className="px-3 py-2 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          <option value="">All plans</option>
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("onboarded") ?? ""}
          onChange={(e) => setParam("onboarded", e.target.value)}
          className="px-3 py-2 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          <option value="">All onboarding</option>
          <option value="true">Onboarded</option>
          <option value="false">Not onboarded</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[var(--color-surface-container)] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-[var(--color-on-surface-variant)] text-sm">
            <span className="material-symbols-outlined animate-spin text-[18px]">
              progress_activity
            </span>
            Loading…
          </div>
        ) : users.length === 0 ? (
          <div className="p-6 text-sm text-[var(--color-on-surface-variant)]">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-outline-variant)]">
                  {[
                    "Name",
                    "Email",
                    "Plan",
                    "Credits",
                    "Applications",
                    "Joined",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-[var(--color-outline-variant)] last:border-0 hover:bg-[var(--color-surface-container-high)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--color-on-surface)]">
                        {u.name}
                      </div>
                      {u.nationality && (
                        <div className="text-xs text-[var(--color-on-surface-variant)]">
                          {u.nationality}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-on-surface-variant)]">
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`capitalize font-medium ${
                          tierColors[u.subscriptionTier] ??
                          "text-[var(--color-on-surface)]"
                        }`}
                      >
                        {u.subscriptionTier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-on-surface)]">
                      {u.credits.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-on-surface-variant)]">
                      {u._count.applications}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-on-surface-variant)]">
                      {new Date(u.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-[var(--color-primary)] text-xs font-medium hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setParam("page", String(page - 1))}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-outline-variant)] text-sm disabled:opacity-40 hover:bg-[var(--color-surface-container)]"
          >
            ← Prev
          </button>
          <span className="text-sm text-[var(--color-on-surface-variant)]">
            Page {page} of {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setParam("page", String(page + 1))}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-outline-variant)] text-sm disabled:opacity-40 hover:bg-[var(--color-surface-container)]"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense>
      <UsersTable />
    </Suspense>
  );
}
