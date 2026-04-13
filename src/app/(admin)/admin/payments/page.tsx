"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface PaymentOrder {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  orderType: string;
  tier: string;
  creditsAmount: number;
  amountPaise: number;
  currency: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  user: { id: string; name: string; email: string };
}

const STATUS_OPTIONS = ["created", "paid", "failed", "refunded"];

function PaymentsTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [totalPaidINR, setTotalPaidINR] = useState(0);
  const [totalPaidCount, setTotalPaidCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const status = searchParams.get("status") ?? "";
  const orderType = searchParams.get("orderType") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (orderType) params.set("orderType", orderType);
    params.set("page", String(page));
    params.set("limit", "50");

    const res = await fetch(`/api/admin/payments?${params}`);
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setOrders(data.orders ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setTotalPaidINR(data.totalPaidINR ?? 0);
    setTotalPaidCount(data.totalPaidCount ?? 0);
    setLoading(false);
  }, [status, orderType, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/admin/payments?${params}`);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-on-surface)]">
            Payments
          </h1>
          <p className="text-sm text-[var(--color-on-surface-variant)] mt-0.5">
            {total.toLocaleString()} orders
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-[var(--color-on-surface)]">
            ₹{totalPaidINR.toLocaleString()}
          </p>
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            from {totalPaidCount} paid orders
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => setParam("status", e.target.value)}
          className="px-3 py-2 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={orderType}
          onChange={(e) => setParam("orderType", e.target.value)}
          className="px-3 py-2 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          <option value="">All types</option>
          <option value="plan">Plan</option>
          <option value="credits">Credits</option>
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
        ) : orders.length === 0 ? (
          <div className="p-6 text-sm text-[var(--color-on-surface-variant)]">
            No orders found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-outline-variant)]">
                  {["User", "Amount", "Type", "Status", "Razorpay ID", "Date", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-[var(--color-outline-variant)] last:border-0 hover:bg-[var(--color-surface-container-high)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${o.user.id}`}
                        className="font-medium text-[var(--color-on-surface)] hover:text-[var(--color-primary)] transition-colors"
                      >
                        {o.user.name}
                      </Link>
                      <div className="text-xs text-[var(--color-on-surface-variant)]">
                        {o.user.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--color-on-surface)]">
                      ₹{Math.round(o.amountPaise / 100).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-on-surface-variant)] capitalize">
                      {o.orderType === "plan"
                        ? `Plan · ${o.tier}`
                        : `${o.creditsAmount} credits`}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs capitalize font-medium ${
                          o.status === "paid"
                            ? "text-[var(--color-tertiary)]"
                            : o.status === "failed"
                            ? "text-[var(--color-error)]"
                            : o.status === "refunded"
                            ? "text-amber-600"
                            : "text-[var(--color-on-surface-variant)]"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-on-surface-variant)] font-mono">
                      {o.razorpayOrderId.slice(0, 18)}…
                    </td>
                    <td className="px-4 py-3 text-[var(--color-on-surface-variant)]">
                      {new Date(o.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${o.user.id}`}
                        className="text-[var(--color-primary)] text-xs font-medium hover:underline"
                      >
                        User
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

export default function AdminPaymentsPage() {
  return (
    <Suspense>
      <PaymentsTable />
    </Suspense>
  );
}
