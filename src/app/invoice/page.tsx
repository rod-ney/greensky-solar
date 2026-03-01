"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Receipt, Plus, Search, Clock, CheckCircle2, AlertTriangle, RotateCcw, Edit2, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { getTodayInManila } from "@/lib/date-utils";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "@/lib/toast";
import type { Payment } from "@/types/client";

type InvoiceRow = Payment & { clientName?: string; userId?: string };

const SERVICE_OPTIONS = [
  "Site Inspection",
  "Solar Panel Installation",
  "Inverter & Battery Setup",
  "Maintenance & Repair",
  "Commissioning",
  "Cleaning",
];

const DEFAULT_PAYMENT_INSTRUCTIONS = `You may pay through any of the following methods:
• Cash – Pay at our office
• GCash – Send to [GCash number]
• Bank Transfer – [Bank details]
• Credit Card – Accepted at office`;

const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  paid: { bg: "bg-green-50 border-green-200", text: "text-green-700", icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Paid" },
  pending: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: <Clock className="h-3.5 w-3.5" />, label: "Pending" },
  overdue: { bg: "bg-red-50 border-red-200", text: "text-red-700", icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "Overdue" },
  refunded: { bg: "bg-slate-50 border-slate-200", text: "text-slate-600", icon: <RotateCcw className="h-3.5 w-3.5" />, label: "Refunded" },
};

export default function InvoicePage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [search, setSearch] = useState("");
  const [clientUsers, setClientUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [serviceType, setServiceType] = useState(SERVICE_OPTIONS[1]);
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(getTodayInManila());
  const [paymentInstructions, setPaymentInstructions] = useState(DEFAULT_PAYMENT_INSTRUCTIONS);
  const [clientUserId, setClientUserId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editServiceType, setEditServiceType] = useState(SERVICE_OPTIONS[1]);
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPaymentInstructions, setEditPaymentInstructions] = useState("");
  const [editClientUserId, setEditClientUserId] = useState("");
  const [editStatus, setEditStatus] = useState<"paid" | "pending" | "overdue" | "refunded">("pending");
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  const loadInvoices = useCallback(async () => {
    try {
      const res = await fetch("/api/invoice", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as InvoiceRow[];
      setInvoices(data);
    } catch {
      setInvoices([]);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [usersRes] = await Promise.all([
          fetch("/api/users", { cache: "no-store" }),
          loadInvoices(),
        ]);
        if (usersRes.ok) {
          const users = (await usersRes.json()) as { id: string; name: string; email: string; role: string }[];
          setClientUsers(users.filter((u) => u.role === "client").map((u) => ({ id: u.id, name: u.name, email: u.email })));
        }
      } catch {
        setClientUsers([]);
      }
    };
    void load();
  }, [loadInvoices]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (!clientUserId) {
      toast.error("Please select a client to send the invoice to.");
      return;
    }
    setIsSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (idempotencyKeyRef.current) {
        headers["Idempotency-Key"] = idempotencyKeyRef.current;
      }
      const res = await fetch("/api/invoice", {
        method: "POST",
        headers,
        body: JSON.stringify({
          serviceType,
          amount: amt,
          dueDate,
          paymentInstructions: paymentInstructions.trim(),
          clientUserId,
        }),
      });
      const payload = (await res.json()) as { referenceNo?: string } | { error?: string };
      if (!res.ok) {
        toast.error("error" in payload && payload.error ? payload.error : "Failed to create invoice.");
        return;
      }
      const invoiceNo = "referenceNo" in payload && payload.referenceNo ? payload.referenceNo : "";
      setShowCreateModal(false);
      setAmount("");
      setDueDate(getTodayInManila());
      setPaymentInstructions(DEFAULT_PAYMENT_INSTRUCTIONS);
      setClientUserId("");
      await loadInvoices();
      toast.success(`Invoice ${invoiceNo} created. It will appear in the client's Documents and Payments.`);
    } catch {
      toast.error("Failed to create invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (inv: InvoiceRow) => {
    setEditingInvoice(inv);
    const svc = inv.serviceType ?? "";
    setEditServiceType(SERVICE_OPTIONS.includes(svc) ? svc : SERVICE_OPTIONS[1]);
    setEditAmount(String(inv.amount));
    setEditDueDate(inv.dueDate ?? getTodayInManila());
    setEditPaymentInstructions(inv.paymentInstructions ?? DEFAULT_PAYMENT_INSTRUCTIONS);
    setEditClientUserId(inv.userId ?? "");
    setEditStatus(inv.status);
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    setIsEditing(true);
    try {
      const res = await fetch(`/api/invoice/${editingInvoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: editServiceType,
          amount: amt,
          dueDate: editDueDate,
          paymentInstructions: editPaymentInstructions.trim(),
          clientUserId: editClientUserId || null,
          status: editStatus,
        }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(payload.error ?? "Failed to update invoice.");
        return;
      }
      setShowEditModal(false);
      setEditingInvoice(null);
      await loadInvoices();
      toast.success("Invoice updated.");
    } catch {
      toast.error("Failed to update invoice.");
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/invoice/${deleteTarget.id}`, { method: "DELETE" });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(payload.error ?? "Failed to delete invoice.");
        return;
      }
      setShowDeleteModal(false);
      setDeleteTarget(null);
      await loadInvoices();
      toast.success("Invoice deleted.");
    } catch {
      toast.error("Failed to delete invoice.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Invoice</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Create and send invoices to clients
          </p>
        </div>
        <Button
          icon={Plus}
          onClick={() => {
            setShowCreateModal(true);
            setDueDate(getTodayInManila());
          }}
        >
          Create Invoice
        </Button>
      </div>

      {/* Invoice Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">All Invoices</h2>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice #, client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>
        {invoices.filter((inv) => {
          const q = search.toLowerCase();
          return (
            inv.referenceNo.toLowerCase().includes(q) ||
            (inv.clientName ?? "").toLowerCase().includes(q) ||
            (inv.serviceType ?? "").toLowerCase().includes(q) ||
            inv.description.toLowerCase().includes(q)
          );
        }).length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              {invoices.length === 0 ? "No invoices yet. Create your first invoice above." : "No invoices match your search."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-slate-500">Invoice #</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-slate-500">Client</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-slate-500">Service</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-slate-500">Amount</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-slate-500">Due Date</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-slate-500">Status</th>
                  <th className="px-5 py-3.5 text-right text-xs font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices
                  .filter((inv) => {
                    const q = search.toLowerCase();
                    return (
                      inv.referenceNo.toLowerCase().includes(q) ||
                      (inv.clientName ?? "").toLowerCase().includes(q) ||
                      (inv.serviceType ?? "").toLowerCase().includes(q) ||
                      inv.description.toLowerCase().includes(q)
                    );
                  })
                  .map((inv) => {
                    const sc = statusConfig[inv.status] ?? statusConfig.pending;
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 text-sm font-medium text-slate-900">
                          {inv.referenceNo}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-600">
                          {inv.clientName ?? "—"}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-600">
                          {inv.serviceType ?? inv.description}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-medium text-slate-900">
                          {formatCurrency(inv.amount)}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-500">
                          {inv.dueDate ? formatDate(inv.dueDate) : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${sc.bg} ${sc.text}`}
                          >
                            {sc.icon}
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(inv)}
                              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
                              title="Edit invoice"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteTarget(inv);
                                setShowDeleteModal(true);
                              }}
                              className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                              title="Delete invoice"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Invoice"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Client <span className="text-red-500">*</span>
            </label>
            <select
              value={clientUserId}
              onChange={(e) => setClientUserId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              required
            >
              <option value="">— Select client —</option>
              {clientUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <p className="mt-0.5 text-xs text-slate-500">
              Invoice will appear in this client&apos;s Documents and Payments
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Service Type <span className="text-red-500">*</span>
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              {SERVICE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Amount to Pay (PHP) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Due Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Payment Instructions
            </label>
            <textarea
              rows={5}
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              placeholder="Cash, GCash, Bank Transfer, etc."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
            />
            <p className="mt-0.5 text-xs text-slate-500">
              Tell the client how they can pay (e.g. Cash, GCash, Bank Transfer, Credit Card)
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
            <p className="text-xs text-slate-600">
              <strong>Invoice number:</strong> Auto-generated (e.g. INV-0001) when you create
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowCreateModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Invoice Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingInvoice(null);
        }}
        title={`Edit Invoice ${editingInvoice?.referenceNo ?? ""}`}
        size="lg"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Client
            </label>
            <select
              value={editClientUserId}
              onChange={(e) => setEditClientUserId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="">— No client —</option>
              {clientUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Service Type
            </label>
            <select
              value={editServiceType}
              onChange={(e) => setEditServiceType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              {SERVICE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Amount (PHP) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Status
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as typeof editStatus)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Payment Instructions
            </label>
            <textarea
              rows={5}
              value={editPaymentInstructions}
              onChange={(e) => setEditPaymentInstructions(e.target.value)}
              placeholder="Cash, GCash, Bank Transfer, etc."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setEditingInvoice(null);
              }}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isEditing}>
              {isEditing ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        title="Delete Invoice"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete invoice{" "}
              <strong className="text-slate-900">{deleteTarget.referenceNo}</strong>? This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
