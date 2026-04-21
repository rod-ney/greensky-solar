"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Download,
  X,
} from "lucide-react";
import { formatCurrencyDecimal, formatDate } from "@/lib/format";
import type { Payment, PaymentStatus } from "@/types/client";

const statusConfig: Record<PaymentStatus, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  paid: { bg: "bg-green-50 border-green-200", text: "text-green-700", icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Paid" },
  pending: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: <Clock className="h-3.5 w-3.5" />, label: "Pending" },
  overdue: { bg: "bg-red-50 border-red-200", text: "text-red-700", icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "Overdue" },
  refunded: { bg: "bg-slate-50 border-slate-200", text: "text-slate-600", icon: <RotateCcw className="h-3.5 w-3.5" />, label: "Refunded" },
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const loadPayments = async () => {
      try {
        const response = await fetch("/api/client/payments", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as Payment[];
        setPayments(data);
      } catch {
        setPayments([]);
      }
    };
    void loadPayments();
  }, []);

  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const matchSearch =
        p.referenceNo.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        p.bookingRef.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [payments, search, statusFilter]);

  const totalPaid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const totalOverdue = payments.filter((p) => p.status === "overdue").reduce((s, p) => s + p.amount, 0);

  const detail = selectedPayment ? payments.find((p) => p.id === selectedPayment) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Payments</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Track invoices, payments, and billing history
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Paid</p>
              <p className="text-lg font-bold text-slate-900">
                {formatCurrencyDecimal(totalPaid)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Pending</p>
              <p className="text-lg font-bold text-amber-600">
                {formatCurrencyDecimal(totalPending)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Overdue</p>
              <p className="text-lg font-bold text-red-600">
                {formatCurrencyDecimal(totalOverdue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["all", "paid", "pending", "overdue", "refunded"] as const).map((s) => {
            const count = s === "all" ? payments.length : payments.filter((p) => p.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all ${
                  statusFilter === s
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {s === "all" ? "All" : statusConfig[s as PaymentStatus].label}{" "}
                <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search payments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      {/* Payments List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
            <DollarSign className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">No payments found</p>
          </div>
        ) : (
          filtered.map((pay) => {
            const sc = statusConfig[pay.status];
            return (
              <button
                key={pay.id}
                onClick={() => setSelectedPayment(pay.id)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-left transition-all hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${sc.bg.split(" ")[0]}`}
                  >
                    <DollarSign className={`h-5 w-5 ${sc.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {pay.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">{pay.referenceNo}</span>
                          <span className="text-slate-200">·</span>
                          <span className="text-xs text-slate-400">
                            Booking: {pay.bookingRef}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p
                          className={`text-base font-bold ${
                            pay.status === "refunded" ? "text-slate-400 line-through" : "text-slate-900"
                          }`}
                        >
                          {formatCurrencyDecimal(pay.amount)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${sc.bg} ${sc.text}`}
                      >
                        {sc.icon}
                        {sc.label}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDate(pay.date)}
                      </span>
                      {pay.dueDate && pay.status !== "paid" && (
                        <span className={`text-xs ${pay.status === "overdue" ? "text-red-500 font-medium" : "text-slate-400"}`}>
                          Due: {formatDate(pay.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Invoice / payment detail (centered) */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setSelectedPayment(null)}
          />
          <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
              <h3 className="text-base font-semibold text-slate-900">Invoice</h3>
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[min(72dvh,72vh)] overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 space-y-3 [scrollbar-gutter:stable]">
                {/* Amount */}
                <div className="rounded-xl bg-slate-50 p-4 text-center">
                  <p className="text-xs text-slate-500">Amount</p>
                  <p className={`mt-0.5 text-2xl font-bold tabular-nums sm:text-[1.65rem] ${detail.status === "refunded" ? "text-slate-400 line-through" : "text-slate-900"}`}>
                    {formatCurrencyDecimal(detail.amount)}
                  </p>
                  <div className="mt-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusConfig[detail.status].bg} ${statusConfig[detail.status].text}`}>
                      {statusConfig[detail.status].icon}
                      {statusConfig[detail.status].label}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2">
                  {[
                    ["Reference", detail.referenceNo],
                    ["Service", detail.serviceType ?? detail.bookingRef],
                    ["Date", formatDate(detail.date)],
                    ...(detail.dueDate ? [["Due Date", formatDate(detail.dueDate)]] : []),
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
                      <span className="text-xs text-slate-500">{label}</span>
                      <span className="text-right text-sm font-medium text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-1">Description</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
                    {detail.description}
                  </p>
                </div>

                {detail.paymentInstructions && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Payment Instructions</p>
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2 whitespace-pre-wrap">
                      {detail.paymentInstructions}
                    </p>
                  </div>
                )}

                {(detail.status === "pending" || detail.status === "overdue") && (
                  <button
                    type="button"
                    className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
                  >
                    Pay Now
                  </button>
                )}

                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download Receipt
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
