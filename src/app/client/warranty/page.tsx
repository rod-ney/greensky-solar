"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, MapPin, Calendar, Ticket, Clock, MessageSquare, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import { getTodayInManila } from "@/lib/date-utils";
import { toast } from "@/lib/toast";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useSessionUser } from "@/lib/client-session";
import WarrantyStatusBadge, { getWarrantyStatus } from "@/components/ui/WarrantyStatusBadge";
import type { SupportTicket, TicketStatus } from "@/types";

type ClientProject = {
  id: string;
  name: string;
  location: string;
  status: string;
  endDate: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
};

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

export default function ClientWarrantyPage() {
  const sessionUser = useSessionUser();
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ClientProject | null>(null);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const idempotencyKeyRef = useRef<string | null>(null);

  const loadTickets = async () => {
    try {
      const res = await fetch("/api/client/tickets", { cache: "no-store" });
      const data = res.ok ? ((await res.json()) as SupportTicket[]) : [];
      setTickets(data);
    } catch {
      setTickets([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [projectsRes, ticketsRes] = await Promise.all([
          fetch("/api/client/projects", { cache: "no-store" }),
          fetch("/api/client/tickets", { cache: "no-store" }),
        ]);
        setProjects(projectsRes.ok ? ((await projectsRes.json()) as ClientProject[]) : []);
        setTickets(ticketsRes.ok ? ((await ticketsRes.json()) as SupportTicket[]) : []);
      } catch {
        setProjects([]);
        setTickets([]);
      }
    };
    void load();
  }, []);

  const openTicketModal = (project: ClientProject) => {
    setSelectedProject(project);
    setTicketSubject("");
    setTicketDescription("");
    idempotencyKeyRef.current = crypto.randomUUID();
    setShowTicketModal(true);
  };

  const handleSubmitTicket = async () => {
    if (!selectedProject || !ticketSubject.trim()) {
      toast.error("Please describe the problem.");
      return;
    }
    setIsSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (idempotencyKeyRef.current) {
        headers["Idempotency-Key"] = idempotencyKeyRef.current;
      }
      const response = await fetch("/api/after-sales/tickets", {
        method: "POST",
        headers,
        body: JSON.stringify({
          projectId: selectedProject.id,
          clientName: sessionUser.name,
          clientEmail: sessionUser.email,
          subject: ticketSubject.trim(),
          description: ticketDescription.trim(),
        }),
      });
      const payload = (await response.json()) as { id?: string } | { error?: string };
      if (!response.ok) {
        toast.error(
          "error" in payload && payload.error
            ? payload.error
            : "Failed to submit. Please try again."
        );
        return;
      }
      setShowTicketModal(false);
      setSelectedProject(null);
      setTicketSubject("");
      setTicketDescription("");
      toast.success("Your support request has been submitted. We will get back to you soon.");
      void loadTickets();
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Warranty & Support</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Your completed projects with 1-year workmanship warranty. Report any issues and we&apos;ll assist you.
        </p>
      </div>

      {/* Your Support Tickets */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
              <Ticket className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Your Support Tickets</h2>
              <p className="text-xs text-slate-500">
                {tickets.length === 0
                  ? "No tickets yet"
                  : `${tickets.filter((t) => t.status !== "resolved").length} open · ${tickets.filter((t) => t.status === "resolved").length} resolved`}
              </p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {tickets.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              You haven&apos;t submitted any support requests yet. Use &quot;Report Problem&quot; on a project to create one.
            </div>
          ) : (
            tickets.map((ticket) => (
              <div key={ticket.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{ticket.subject}</p>
                    {ticket.projectName && (
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {ticket.projectName}
                      </p>
                    )}
                    {ticket.description && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{ticket.description}</p>
                    )}
                  </div>
                  <TicketStatusBadge status={ticket.status} />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Submitted {formatDate(ticket.createdAt.slice(0, 10))}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-base font-semibold text-slate-900">No projects yet</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            Projects assigned to you by admin will appear here. Contact support if you expect to see a project.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const isCompleted = project.status === "completed";
            const hasExplicitWarranty = !!project.warrantyEndDate;
            const warrantyEnd = project.warrantyEndDate ?? (isCompleted ? getWarrantyEndDate(project.endDate) : "");
            const cutoffDate = (() => {
              const d = new Date();
              d.setMonth(d.getMonth() - 12);
              return d.toISOString().slice(0, 10);
            })();
            const inWarrantyWindow =
              hasExplicitWarranty || (isCompleted && project.endDate >= cutoffDate);
            const daysRemaining = inWarrantyWindow && warrantyEnd ? getDaysRemaining(warrantyEnd) : 0;
            const warrantyStatus = inWarrantyWindow && warrantyEnd ? getWarrantyStatus(daysRemaining) : null;

            return (
              <div
                key={project.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {project.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {project.location?.split(",")[0] ?? project.location}
                    </p>
                  </div>
                  {warrantyStatus ? (
                    <WarrantyStatusBadge status={warrantyStatus} />
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {project.status === "ongoing" ? "In progress" : project.status === "pending" ? "Scheduled" : "Completed"}
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {isCompleted ? "Completed" : "Target"}: {formatDate(project.endDate)}
                    </span>
                  </div>
                  {inWarrantyWindow && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        Warranty ends: {formatDate(warrantyEnd)}
                        {warrantyStatus !== "expired" && (
                          <span className="ml-1 text-slate-500">
                            ({daysRemaining} days left)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {inWarrantyWindow && warrantyStatus !== "expired" && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => openTicketModal(project)}
                    >
                      Report Problem
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showTicketModal}
        onClose={() => {
          setShowTicketModal(false);
          setSelectedProject(null);
        }}
        title="Report a Problem"
        size="md"
      >
        {selectedProject && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Reporting an issue for <span className="font-semibold text-slate-900">{selectedProject.name}</span>.
              We&apos;ll review your request and get in touch.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                What seems to be the problem? <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                placeholder="e.g. Inverter not powering on"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Additional details
              </label>
              <textarea
                rows={3}
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
                placeholder="Describe the issue in more detail..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTicketModal(false);
                  setSelectedProject(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitTicket} disabled={isSubmitting || !ticketSubject.trim()}>
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
