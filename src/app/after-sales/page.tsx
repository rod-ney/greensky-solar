"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Ticket,
  Clock,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { getTodayInManila } from "@/lib/date-utils";
import { toast } from "@/lib/toast";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import WarrantyStatusBadge, { getWarrantyStatus } from "@/components/ui/WarrantyStatusBadge";
import type { Project, SupportTicket, TicketStatus } from "@/types";

function getWarrantyEndDate(completionDate: string): string {
  const [y, m, d] = completionDate.slice(0, 10).split("-").map(Number);
  const year = (y ?? 2024) + 1;
  const month = (m ?? 1);
  const day = (d ?? 1);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDaysRemaining(warrantyEnd: string): number {
  const today = getTodayInManila();
  const todayMs = new Date(today).getTime();
  const endMs = new Date(warrantyEnd).getTime();
  return Math.ceil((endMs - todayMs) / (24 * 60 * 60 * 1000));
}

const ticketStatusConfig: Record<
  TicketStatus,
  { icon: React.ReactNode; bg: string; text: string; label: string }
> = {
  open: {
    icon: <Clock className="h-3.5 w-3.5" />,
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    label: "Open",
  },
  in_progress: {
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
    label: "In Progress",
  },
  resolved: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    bg: "bg-green-50 border-green-200",
    text: "text-green-700",
    label: "Resolved",
  },
};

function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const config = ticketStatusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

export default function AfterSalesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [addClientName, setAddClientName] = useState("");
  const [addClientEmail, setAddClientEmail] = useState("");
  const [addSubject, setAddSubject] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addProjectId, setAddProjectId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SupportTicket | null>(null);
  const [isDeletingTicket, setIsDeletingTicket] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [projectsRes, ticketsRes] = await Promise.all([
          fetch("/api/projects", { cache: "no-store" }),
          fetch("/api/after-sales/tickets", { cache: "no-store" }),
        ]);
        setProjects(projectsRes.ok ? (((await projectsRes.json()) as { items: Project[] }).items ?? []) : []);
        setTickets(ticketsRes.ok ? (((await ticketsRes.json()) as { items: SupportTicket[] }).items ?? []) : []);
      } catch {
        setProjects([]);
        setTickets([]);
      }
    };
    void load();
  }, []);

  const today = getTodayInManila();
  const cutoffDate = (() => {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const warrantyProjects = useMemo(() => {
    return projects
      .filter(
        (p) =>
          (p.warrantyEndDate != null) ||
          (p.status === "completed" && p.endDate >= cutoffDate)
      )
      .map((project) => {
        const warrantyEnd = project.warrantyEndDate ?? getWarrantyEndDate(project.endDate);
        const daysRemaining = getDaysRemaining(warrantyEnd);
        const status = getWarrantyStatus(daysRemaining);
        return {
          ...project,
          warrantyEnd,
          daysRemaining,
          status,
        };
      })
      .sort((a, b) => a.warrantyEnd.localeCompare(b.warrantyEnd));
  }, [projects, cutoffDate]);

  const counts = useMemo(
    () => ({
      inWarranty: warrantyProjects.filter((p) => p.status === "in_warranty").length,
      expiringSoon: warrantyProjects.filter((p) => p.status === "expiring_soon").length,
      expired: warrantyProjects.filter((p) => p.status === "expired").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
    }),
    [warrantyProjects, tickets]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">After Sales</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          1-year workmanship warranty monitoring — {warrantyProjects.length} completed project
          {warrantyProjects.length !== 1 ? "s" : ""} in warranty window
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">In Warranty</p>
              <p className="text-lg font-bold text-slate-900">{counts.inWarranty}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Expiring Soon (30 days)</p>
              <p className="text-lg font-bold text-slate-900">{counts.expiringSoon}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <ShieldCheck className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Recently Expired</p>
              <p className="text-lg font-bold text-slate-900">{counts.expired}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <ClipboardCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Resolved</p>
              <p className="text-lg font-bold text-slate-900">{counts.resolved}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Client Tickets Card */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
              <Ticket className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Client Tickets</h2>
              <p className="text-xs text-slate-500">
                {tickets.filter((t) => t.status !== "resolved").length} open / in progress
                {tickets.length > 0 && ` · ${tickets.length} total`}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            icon={Plus}
            onClick={() => {
              setAddClientName("");
              setAddClientEmail("");
              setAddSubject("");
              setAddDescription("");
              setAddProjectId("");
              setShowAddTicket(true);
            }}
          >
            Add Ticket
          </Button>
        </div>
        <div className="divide-y divide-slate-100">
          {tickets.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              No client tickets yet. When clients report problems, tickets will appear here.
            </div>
          ) : (
            tickets.slice(0, 10).map((ticket) => (
              <div
                key={ticket.id}
                className="px-5 py-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {ticket.subject}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {ticket.clientName} · {ticket.clientEmail}
                    </p>
                    {ticket.projectName && (
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {ticket.projectName}
                      </p>
                    )}
                    {ticket.description && (
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                        {ticket.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <TicketStatusBadge status={ticket.status} />
                    {ticket.status !== "resolved" && (
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/after-sales/tickets/${ticket.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "resolved" }),
                            });
                            const updated = res.ok ? ((await res.json()) as SupportTicket) : null;
                            if (updated) {
                              setTickets((prev) =>
                                prev.map((t) => (t.id === updated.id ? updated : t))
                              );
                              toast.success("Ticket marked as resolved.");
                            }
                          } catch {
                            toast.error("Failed to update ticket.");
                          }
                        }}
                        className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                        title="Mark resolved"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Resolved
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(ticket)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete ticket"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {ticket.projectId && (
                      <Link
                        href={`/projects/${ticket.projectId}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand transition-colors"
                        title="View project"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  {formatDate(ticket.createdAt.slice(0, 10))}
                </p>
              </div>
            ))
          )}
        </div>
        {tickets.length > 10 && (
          <div className="border-t border-slate-100 px-5 py-2 text-xs text-slate-500 text-center">
            Showing 10 of {tickets.length} tickets
          </div>
        )}
      </div>

      {/* Projects Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">
                Project
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 hidden md:table-cell">
                Client
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 hidden lg:table-cell">
                Location
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">
                Completion
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">
                Warranty Ends
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">
                Status
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {warrantyProjects.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-slate-500">
                  No completed projects in the warranty window yet. Projects completed within the
                  last 12 months will appear here.
                </td>
              </tr>
            ) : (
              warrantyProjects.map((project) => (
                <tr
                  key={project.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-sm font-medium text-slate-900 hover:text-brand"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600 hidden md:table-cell">
                    {project.client}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500 hidden lg:table-cell truncate max-w-[180px]">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {project.location.split(",")[0]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {formatDate(project.endDate)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">
                    {formatDate(project.warrantyEnd)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <WarrantyStatusBadge status={project.status} />
                      {project.status !== "expired" && (
                        <span className="text-xs text-slate-500">
                          {project.daysRemaining} days left
                        </span>
                      )}
                      {project.status === "expired" && (
                        <span className="text-xs text-slate-500">
                          {Math.abs(project.daysRemaining)} days ago
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end">
                      <Link
                        href={`/projects/${project.id}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand transition-colors"
                        title="View project"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete ticket confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!isDeletingTicket) setDeleteTarget(null);
        }}
        title="Delete ticket"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Delete this ticket permanently?{" "}
            {deleteTarget && (
              <span className="font-semibold text-slate-900">{deleteTarget.subject}</span>
            )}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeletingTicket}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="button"
              disabled={isDeletingTicket}
              onClick={async () => {
                if (!deleteTarget) return;
                setIsDeletingTicket(true);
                try {
                  const res = await fetch(`/api/after-sales/tickets/${deleteTarget.id}`, {
                    method: "DELETE",
                  });
                  if (!res.ok) {
                    const data = (await res.json()) as { error?: string };
                    toast.error(data.error ?? "Failed to delete ticket.");
                    return;
                  }
                  setTickets((prev) => prev.filter((t) => t.id !== deleteTarget.id));
                  setDeleteTarget(null);
                  toast.success("Ticket deleted.");
                } catch {
                  toast.error("Failed to delete ticket.");
                } finally {
                  setIsDeletingTicket(false);
                }
              }}
            >
              {isDeletingTicket ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Ticket Modal */}
      <Modal
        isOpen={showAddTicket}
        onClose={() => setShowAddTicket(false)}
        title="Add Client Ticket"
        size="md"
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!addClientName.trim() || !addClientEmail.trim() || !addSubject.trim()) {
              toast.error("Client name, email, and subject are required.");
              return;
            }
            setIsSubmitting(true);
            try {
              const response = await fetch("/api/after-sales/tickets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  clientName: addClientName.trim(),
                  clientEmail: addClientEmail.trim(),
                  subject: addSubject.trim(),
                  description: addDescription.trim(),
                  projectId: addProjectId || undefined,
                }),
              });
              const payload = (await response.json()) as SupportTicket | { error?: string };
              if (!response.ok) {
                toast.error(
                  "error" in payload && payload.error
                    ? payload.error
                    : "Failed to add ticket."
                );
                return;
              }
              const created = payload as SupportTicket;
              setTickets((prev) => [created, ...prev]);
              setShowAddTicket(false);
              toast.success("Ticket added.");
            } catch {
              toast.error("Failed to add ticket.");
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Client Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={addClientName}
              onChange={(e) => setAddClientName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              placeholder="Client name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Client Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={addClientEmail}
              onChange={(e) => setAddClientEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              placeholder="client@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={addSubject}
              onChange={(e) => setAddSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              placeholder="Brief description of the problem"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Project (optional)
            </label>
            <select
              value={addProjectId}
              onChange={(e) => setAddProjectId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="">— No project —</option>
              {warrantyProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.client})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Details
            </label>
            <textarea
              rows={3}
              value={addDescription}
              onChange={(e) => setAddDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
              placeholder="Additional details about the issue..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowAddTicket(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Ticket"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
