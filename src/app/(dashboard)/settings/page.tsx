"use client";

import { useState, useEffect } from "react";
import { User, CreditCard, Bell, Shield, Check, Sparkles, Loader2, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "account" | "subscription" | "notifications" | "privacy";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "INR 0",
    period: "forever",
    features: [
      "5 university matches",
      "Basic chance calculator",
      "1 AI SOP draft",
      "Document checklist",
    ],
    cta: "Current Plan",
    popular: false,
  },
  {
    id: "explorer",
    name: "Explorer",
    price: "INR 2,999",
    period: "/year",
    features: [
      "All university matches",
      "Detailed chance breakdown",
      "5 AI SOP drafts/month",
      "Document upload & storage",
      "Email deadline reminders",
    ],
    cta: "Upgrade",
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "INR 9,999",
    period: "/year",
    features: [
      "Everything in Explorer",
      "Unlimited AI SOP drafts",
      "Priority SOP generation",
      "Application status tracking",
      "Visa checklist + tips",
      "Export application roadmap",
    ],
    cta: "Upgrade",
    popular: false,
  },
];

interface UserProfile {
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  subscriptionTier: string;
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("account");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setProfile({
            name: data.user.name,
            email: data.user.email,
            phone: data.user.phone,
            city: data.user.city,
            subscriptionTier: data.user.subscriptionTier,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (planId: string) => {
    if (planId === "free" || planId === profile?.subscriptionTier) return;
    setUpgrading(planId);
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.error);

      const win = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : null;
      if (win?.Razorpay && orderData.keyId !== "rzp_test_placeholder") {
        const RazorpayConstructor = win.Razorpay as new (opts: Record<string, unknown>) => { open: () => void };
        const rzp = new RazorpayConstructor({
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "RIBRIZ",
          description: `${orderData.planName} Plan`,
          order_id: orderData.orderId,
          handler: async () => {
            const confirmRes = await fetch("/api/subscription", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tier: planId }),
            });
            const confirmData = await confirmRes.json();
            if (confirmData.success && profile) {
              setProfile({ ...profile, subscriptionTier: planId });
            }
          },
        });
        rzp.open();
      } else {
        const confirmRes = await fetch("/api/subscription", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier: planId }),
        });
        const confirmData = await confirmRes.json();
        if (confirmData.success && profile) {
          setProfile({ ...profile, subscriptionTier: planId });
        }
      }
    } catch (err) {
      console.error("Upgrade error:", err);
    } finally {
      setUpgrading(null);
    }
  };

  const tabs: { id: Tab; icon: typeof User; label: string }[] = [
    { id: "account", icon: User, label: "Account" },
    { id: "subscription", icon: CreditCard, label: "Subscription" },
    { id: "notifications", icon: Bell, label: "Notifications" },
    { id: "privacy", icon: Shield, label: "Privacy" },
  ];

  return (
    <div className="p-8 md:p-10 max-w-5xl mx-auto w-full space-y-8">
      <h2 className="text-3xl font-black tracking-tight text-on-surface">
        Settings
      </h2>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1.5 bg-surface-container-low/50 p-1 rounded-xl border border-outline-variant/20 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              tab === t.id
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            <t.icon size={15} strokeWidth={1.8} /> {t.label}
          </button>
        ))}
      </div>

      {/* Account Tab */}
      {tab === "account" && (
        <div className="surface-elevated p-7 rounded-2xl space-y-6">
          <h3 className="text-base font-black text-on-surface">Account Details</h3>
          {loading ? (
            <Loader2 size={24} className="animate-spin text-primary" />
          ) : profile ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { label: "Full Name", value: profile.name },
                { label: "Email", value: profile.email },
                { label: "Phone", value: profile.phone || "Not set" },
                { label: "City", value: profile.city || "Not set" },
              ].map((field) => (
                <div key={field.label}>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-on-surface-variant">{field.label}</label>
                  <p className="text-sm font-semibold text-on-surface mt-1">{field.value}</p>
                </div>
              ))}
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-on-surface-variant">Current Plan</label>
                <p className="text-sm font-semibold text-on-surface mt-1 capitalize flex items-center gap-2">
                  {profile.subscriptionTier === "free" ? "Free" : profile.subscriptionTier}
                  {profile.subscriptionTier !== "free" && <Crown size={14} className="text-amber-500" />}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant font-medium">Complete onboarding to see your account details.</p>
          )}
          <a href="/onboarding" className="inline-block text-sm font-semibold text-primary hover:underline">
            Edit Profile
          </a>
        </div>
      )}

      {/* Subscription Tab */}
      {tab === "subscription" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const isCurrent = profile?.subscriptionTier === plan.id;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "surface-elevated p-6 rounded-2xl relative transition-all",
                    plan.popular && "ring-2 ring-primary/20 shadow-lg shadow-primary/[0.06]",
                    isCurrent && "ring-2 ring-primary/30"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 badge-primary">
                      MOST POPULAR
                    </div>
                  )}
                  <div className="mb-5">
                    <h4 className="text-base font-black text-on-surface">{plan.name}</h4>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-primary">{plan.price}</span>
                      <span className="text-xs text-on-surface-variant font-medium">{plan.period}</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-on-surface-variant font-medium">
                        <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isCurrent || plan.id === "free" || !!upgrading}
                    className={cn(
                      "w-full py-2.5 rounded-xl text-sm font-bold transition-all",
                      isCurrent
                        ? "bg-surface-container-low text-on-surface-variant"
                        : plan.popular
                        ? "btn-primary"
                        : "bg-surface-container-low text-primary hover:bg-surface"
                    )}
                  >
                    {upgrading === plan.id ? (
                      <Loader2 size={16} className="animate-spin mx-auto" />
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : (
                      plan.cta
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-on-surface-variant/50 text-center font-medium">
            Payments powered by Razorpay. Cancel anytime from this page.
          </p>
        </div>
      )}

      {/* Notifications Tab */}
      {tab === "notifications" && <NotificationPreferences />}

      {/* Privacy Tab */}
      {tab === "privacy" && (
        <div className="surface-elevated p-7 rounded-2xl space-y-5">
          <h3 className="text-base font-black text-on-surface">Privacy & Data</h3>
          <div className="space-y-3">
            <div className="p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant/10">
              <p className="text-sm font-bold text-on-surface">Export your data</p>
              <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">Download a copy of all your profile data, applications, and documents.</p>
              <button className="mt-3 text-xs font-semibold text-primary hover:underline">
                Request Data Export
              </button>
            </div>
            <div className="p-4 bg-error/[0.03] rounded-xl border border-error/10">
              <p className="text-sm font-bold text-error">Delete account</p>
              <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">Permanently delete your account and all associated data. This action cannot be undone.</p>
              <button className="mt-3 text-xs font-semibold text-error hover:underline">
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const notifItems = [
  { key: "deadlineReminders", label: "Deadline reminders", desc: "Get email reminders 30, 14, and 3 days before application deadlines" },
  { key: "statusUpdates", label: "Application status updates", desc: "Email notifications when application statuses change" },
  { key: "newMatches", label: "New university matches", desc: "Notify when new programs matching your profile are added" },
  { key: "productUpdates", label: "Product updates", desc: "Occasional updates about new RIBRIZ features" },
];

function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    deadlineReminders: true,
    statusUpdates: true,
    newMatches: false,
    productUpdates: false,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/user/notifications")
      .then((r) => r.json())
      .then((data) => { if (data.preferences) setPrefs(data.preferences); })
      .finally(() => setLoaded(true));
  }, []);

  const toggle = async (key: string) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    await fetch("/api/user/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  };

  return (
    <div className="surface-elevated p-7 rounded-2xl space-y-4">
      <h3 className="text-base font-black text-on-surface">Notification Preferences</h3>
      {!loaded ? (
        <Loader2 size={24} className="animate-spin text-primary" />
      ) : (
        notifItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 bg-surface-container-low/40 rounded-xl border border-outline-variant/[0.06]">
            <div>
              <p className="text-sm font-bold text-on-surface">{item.label}</p>
              <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">{item.desc}</p>
            </div>
            <button
              onClick={() => toggle(item.key)}
              className={cn(
                "toggle-track",
                prefs[item.key] ? "toggle-track-active" : "toggle-track-inactive"
              )}
            >
              <div
                className={cn(
                  "toggle-thumb",
                  prefs[item.key] ? "left-[calc(100%-1.375rem)]" : "left-[0.1875rem]"
                )}
              />
            </button>
          </div>
        ))
      )}
    </div>
  );
}
