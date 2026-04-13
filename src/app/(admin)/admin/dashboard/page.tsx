"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface Stats {
  totalUsers: number;
  newUsersToday: number;
  onboardedUsers: number;
  activeSubscriptions: number;
  totalRevenueINR: number;
  totalOrders: number;
  totalCreditsRecharged: number;
  signupsByDay: { date: string; count: number }[];
  revenueByDay: { date: string; amount: number }[];
  tierBreakdown: { tier: string; count: number }[];
  topCountries: { country: string | null; count: number }[];
}

function KpiCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
}) {
  return (
    <div className="bg-[var(--color-surface-container)] rounded-2xl p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-on-surface-variant)] font-medium uppercase tracking-wide">
          {label}
        </span>
        <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">
          {icon}
        </span>
      </div>
      <p className="text-2xl font-semibold text-[var(--color-on-surface)]">{value}</p>
      {sub && (
        <p className="text-xs text-[var(--color-on-surface-variant)]">{sub}</p>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Stats fetch failed:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-[var(--color-on-surface-variant)]">
        <span className="material-symbols-outlined animate-spin text-[20px]">
          progress_activity
        </span>
        Loading stats…
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-[var(--color-error)]">Failed to load stats.</div>
    );
  }

  const signupsChartData = stats.signupsByDay.map((d) => ({
    date: d.date.slice(5), // "MM-DD"
    Signups: d.count,
  }));

  const revenueChartData = stats.revenueByDay.map((d) => ({
    date: d.date.slice(5),
    Revenue: Math.round(d.amount / 100),
  }));

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-on-surface)]">
          Overview
        </h1>
        <p className="text-sm text-[var(--color-on-surface-variant)] mt-0.5">
          Platform-wide stats
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Users"
          value={stats.totalUsers.toLocaleString()}
          sub={`${stats.newUsersToday} joined today`}
          icon="group"
        />
        <KpiCard
          label="Onboarded"
          value={stats.onboardedUsers.toLocaleString()}
          sub={`${Math.round((stats.onboardedUsers / (stats.totalUsers || 1)) * 100)}% of users`}
          icon="how_to_reg"
        />
        <KpiCard
          label="Active Plans"
          value={stats.activeSubscriptions.toLocaleString()}
          sub="non-free, not expired"
          icon="workspace_premium"
        />
        <KpiCard
          label="Total Revenue"
          value={`₹${stats.totalRevenueINR.toLocaleString()}`}
          sub={`${stats.totalOrders} paid orders`}
          icon="payments"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signups chart */}
        <div className="bg-[var(--color-surface-container)] rounded-2xl p-5">
          <h2 className="text-sm font-medium text-[var(--color-on-surface)] mb-4">
            Signups — last 30 days
          </h2>
          {signupsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={signupsChartData}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface-container-high)",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Signups"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              No signup data yet.
            </p>
          )}
        </div>

        {/* Revenue chart */}
        <div className="bg-[var(--color-surface-container)] rounded-2xl p-5">
          <h2 className="text-sm font-medium text-[var(--color-on-surface)] mb-4">
            Revenue (₹) — last 30 days
          </h2>
          {revenueChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueChartData}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface-container-high)",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v) => [`₹${Number(v).toLocaleString()}`, "Revenue"]}
                />
                <Bar
                  dataKey="Revenue"
                  fill="var(--color-tertiary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              No revenue data yet.
            </p>
          )}
        </div>
      </div>

      {/* Bottom Row: Tier breakdown + Top countries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier breakdown */}
        <div className="bg-[var(--color-surface-container)] rounded-2xl p-5">
          <h2 className="text-sm font-medium text-[var(--color-on-surface)] mb-4">
            Users by Plan
          </h2>
          <div className="space-y-2">
            {stats.tierBreakdown
              .sort((a, b) => b.count - a.count)
              .map((t) => (
                <div
                  key={t.tier}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="capitalize text-[var(--color-on-surface-variant)]">
                    {t.tier}
                  </span>
                  <span className="font-medium text-[var(--color-on-surface)]">
                    {t.count.toLocaleString()}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Top countries */}
        <div className="bg-[var(--color-surface-container)] rounded-2xl p-5">
          <h2 className="text-sm font-medium text-[var(--color-on-surface)] mb-4">
            Top Countries
          </h2>
          <div className="space-y-2">
            {stats.topCountries.map((c) => (
              <div
                key={c.country}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-[var(--color-on-surface-variant)]">
                  {c.country ?? "Unknown"}
                </span>
                <span className="font-medium text-[var(--color-on-surface)]">
                  {c.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
