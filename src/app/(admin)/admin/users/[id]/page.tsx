"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface UserDetail {
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
  academicProfile: {
    degreeName: string;
    gpa: number;
    gpaScale: string;
    collegeName: string;
    graduationYear: number;
    workExperienceMonths: number;
  } | null;
  preferences: {
    targetCountries: string[];
    targetDegreeLevel: string | null;
    fieldOfStudy: string | null;
  } | null;
  applications: {
    id: string;
    status: string;
    createdAt: string;
    program: {
      name: string;
      university: { name: string; country: string };
    };
  }[];
  paymentOrders: {
    id: string;
    amountPaise: number;
    status: string;
    orderType: string;
    tier: string;
    creditsAmount: number;
    createdAt: string;
    paidAt: string | null;
  }[];
  creditTransactions: {
    id: string;
    amount: number;
    reason: string;
    createdAt: string;
  }[];
  threads: {
    id: string;
    createdAt: string;
    updatedAt: string;
    _count: { messages: number };
  }[];
}

const TIERS = ["free", "basic", "premium", "elite"];

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creditAdj, setCreditAdj] = useState("");
  const [creditReason, setCreditReason] = useState("admin_adjustment");
  const [newTier, setNewTier] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user);
        setNewTier(d.user?.subscriptionTier ?? "free");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    const adj = parseInt(creditAdj);
    if (!newTier && (isNaN(adj) || adj === 0)) return;

    setSaving(true);
    const body: Record<string, unknown> = {};
    if (newTier && user && newTier !== user.subscriptionTier) {
      body.subscriptionTier = newTier;
    }
    if (!isNaN(adj) && adj !== 0) {
      body.creditAdjustment = adj;
      body.creditReason = creditReason;
    }

    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      setUser((prev) =>
        prev
          ? {
              ...prev,
              credits: data.user.credits,
              subscriptionTier: data.user.subscriptionTier,
              subscriptionExpiresAt: data.user.subscriptionExpiresAt,
            }
          : prev
      );
      setCreditAdj("");
      setFeedback("Saved successfully.");
      setTimeout(() => setFeedback(""), 3000);
    } else {
      setFeedback(`Error: ${data.error}`);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-[var(--color-on-surface-variant)] text-sm">
        <span className="material-symbols-outlined animate-spin text-[18px]">
          progress_activity
        </span>
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-[var(--color-error)] text-sm">User not found.</div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-5xl">
      {/* Back */}
      <Link
        href="/admin/users"
        className="flex items-center gap-1.5 text-sm text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors w-fit"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        All Users
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-on-surface)]">
            {user.name}
          </h1>
          <p className="text-sm text-[var(--color-on-surface-variant)] mt-0.5">
            {user.email} · {user.phone ?? "no phone"} ·{" "}
            {user.nationality ?? "unknown"} · joined{" "}
            {new Date(user.createdAt).toLocaleDateString("en-IN")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user.onboardingComplete ? (
            <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)]">
              Onboarded
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]">
              Not onboarded
            </span>
          )}
          <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] capitalize">
            {user.subscriptionTier}
          </span>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="bg-[var(--color-surface-container)] rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-[var(--color-on-surface)]">
          Admin Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Credits */}
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--color-on-surface-variant)]">
              Adjust Credits (+ or -)
            </label>
            <input
              type="number"
              value={creditAdj}
              onChange={(e) => setCreditAdj(e.target.value)}
              placeholder="e.g. 50 or -10"
              className="w-full px-3 py-2 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              Current: {user.credits.toLocaleString()} credits
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--color-on-surface-variant)]">
              Credit Reason
            </label>
            <input
              type="text"
              value={creditReason}
              onChange={(e) => setCreditReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Tier */}
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--color-on-surface-variant)]">
              Subscription Tier
            </label>
            <select
              value={newTier}
              onChange={(e) => setNewTier(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] text-sm font-medium disabled:opacity-60 hover:opacity-90 transition-opacity"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {feedback && (
            <p
              className={`text-sm ${
                feedback.startsWith("Error")
                  ? "text-[var(--color-error)]"
                  : "text-[var(--color-tertiary)]"
              }`}
            >
              {feedback}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Academic Profile */}
        {user.academicProfile && (
          <div className="bg-[var(--color-surface-container)] rounded-2xl p-5">
            <h2 className="text-sm font-medium text-[var(--color-on-surface)] mb-3">
              Academic Profile
            </h2>
            <div className="space-y-1.5 text-sm">
              {[
                ["Degree", user.academicProfile.degreeName],
                ["College", user.academicProfile.collegeName],
                [
                  "GPA",
                  `${user.academicProfile.gpa} / ${user.academicProfile.gpaScale.replace("scale_", "")}`,
                ],
                ["Grad Year", user.academicProfile.graduationYear],
                [
                  "Work Exp",
                  `${user.academicProfile.workExperienceMonths} months`,
                ],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between">
                  <span className="text-[var(--color-on-surface-variant)]">{k}</span>
                  <span className="text-[var(--color-on-surface)]">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preferences */}
        {user.preferences && (
          <div className="bg-[var(--color-surface-container)] rounded-2xl p-5">
            <h2 className="text-sm font-medium text-[var(--color-on-surface)] mb-3">
              Preferences
            </h2>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-on-surface-variant)]">
                  Countries
                </span>
                <span className="text-[var(--color-on-surface)] text-right">
                  {user.preferences.targetCountries.join(", ") || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-on-surface-variant)]">
                  Degree
                </span>
                <span className="text-[var(--color-on-surface)]">
                  {user.preferences.targetDegreeLevel ?? "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-on-surface-variant)]">
                  Field
                </span>
                <span className="text-[var(--color-on-surface)]">
                  {user.preferences.fieldOfStudy ?? "—"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Applications */}
      {user.applications.length > 0 && (
        <div className="bg-[var(--color-surface-container)] rounded-2xl p-5">
          <h2 className="text-sm font-medium text-[var(--color-on-surface)] mb-3">
            Applications ({user.applications.length})
          </h2>
          <div className="space-y-2">
            {user.applications.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--color-outline-variant)] last:border-0"
              >
                <div>
                  <span className="text-[var(--color-on-surface)] font-medium">
                    {app.program.university.name}
                  </span>
                  <span className="text-[var(--color-on-surface-variant)]">
                    {" "}
                    · {app.program.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs capitalize text-[var(--color-on-surface-variant)]">
                    {app.status.replace("_", " ")}
                  </span>
                  <span className="text-xs text-[var(--color-on-surface-variant)]">
                    {new Date(app.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Credit Ledger */}
      {user.creditTransactions.length > 0 && (
        <div className="bg-[var(--color-surface-container)] rounded-2xl p-5">
          <h2 className="text-sm font-medium text-[var(--color-on-surface)] mb-3">
            Credit Ledger (last 20)
          </h2>
          <div className="space-y-1.5">
            {user.creditTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--color-outline-variant)] last:border-0"
              >
                <div>
                  <span className="text-[var(--color-on-surface-variant)]">
                    {tx.reason}
                  </span>
                  <span className="ml-2 text-xs text-[var(--color-on-surface-variant)]">
                    {new Date(tx.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <span
                  className={`font-medium ${
                    tx.amount > 0
                      ? "text-[var(--color-tertiary)]"
                      : "text-[var(--color-error)]"
                  }`}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment History */}
      {user.paymentOrders.length > 0 && (
        <div className="bg-[var(--color-surface-container)] rounded-2xl p-5">
          <h2 className="text-sm font-medium text-[var(--color-on-surface)] mb-3">
            Payment History
          </h2>
          <div className="space-y-1.5">
            {user.paymentOrders.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--color-outline-variant)] last:border-0"
              >
                <div>
                  <span className="text-[var(--color-on-surface)]">
                    ₹{Math.round(o.amountPaise / 100).toLocaleString()}
                  </span>
                  <span className="text-[var(--color-on-surface-variant)] ml-2 capitalize">
                    {o.orderType === "plan" ? o.tier : `${o.creditsAmount} credits`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs capitalize ${
                      o.status === "paid"
                        ? "text-[var(--color-tertiary)]"
                        : o.status === "failed"
                        ? "text-[var(--color-error)]"
                        : "text-[var(--color-on-surface-variant)]"
                    }`}
                  >
                    {o.status}
                  </span>
                  <span className="text-xs text-[var(--color-on-surface-variant)]">
                    {new Date(o.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
