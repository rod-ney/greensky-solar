"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Send,
  FileText,
  CheckCircle2,
  Clock,
  Eye,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { formatDate } from "@/lib/format";
import { getTodayInManila } from "@/lib/date-utils";
import { useSessionUser } from "@/lib/client-session";
import { toast } from "@/lib/toast";
import type { Project, Report, Technician } from "@/types";

type TechReport = {
  id: string;
  title: string;
  type: "service" | "quotation" | "revenue";
  projectName: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  description: string;
  attachment?: string;
};

const typeLabels: Record<TechReport["type"], string> = {
  service: "Service Report",
  quotation: "Quotation",
  revenue: "Revenue Report",
};

const statusColors: Record<TechReport["status"], string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

export default function TechnicianReportsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [allReports, setAllReports] = useState<Report[]>([]);
  const sessionUser = useSessionUser();

  useEffect(() => {
    const load = async () => {
      try {
        const [projectsRes, techRes, reportsRes] = await Promise.all([
          fetch("/api/projects", { cache: "no-store" }),
          fetch("/api/profile/technician", { cache: "no-store" }),
          fetch("/api/reports", { cache: "no-store" }),
        ]);
        setProjects(projectsRes.ok ? (((await projectsRes.json()) as { items: Project[] }).items ?? []) : []);
        const techData = techRes.ok ? ((await techRes.json()) as Technician | null) : null;
        setTechnicians(techData ? [techData] : []);
        setAllReports(reportsRes.ok ? ((await reportsRes.json()) as Report[]) : []);
      } catch {
        setProjects([]);
        setTechnicians([]);
        setAllReports([]);
      }
    };
    void load();
  }, []);

  const tech = technicians[0] ?? null;

  const myProjects = useMemo(
    () => projects.filter((p) => (tech ? p.assignedTechnicians.includes(tech.id) : false)),
    [projects, tech]
  );

  const reports = useMemo<TechReport[]>(() => {
    const submittedByNames = new Set(
      [sessionUser.name, tech?.name].filter(Boolean) as string[]
    );

    return allReports
      .filter(
        (report) =>
          (report.type === "service" ||
            report.type === "quotation" ||
            report.type === "revenue") &&
          (submittedByNames.has(report.submittedBy) ||
            report.submittedBy === sessionUser.email)
      )
      .map((report) => ({
        id: report.id,
        title: report.title,
        type: report.type,
        projectName: report.projectName ?? "General",
        status: report.status,
        submittedAt: report.submittedAt,
        description: report.description ?? "",
      }));
  }, [allReports, sessionUser.email, sessionUser.name, tech?.name]);

  const [showCreate, setShowCreate] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [sendTarget, setSendTarget] = useState<"admin" | "client">("admin");
  const [selectedReport, setSelectedReport] = useState<TechReport | null>(null);
  const [viewTarget, setViewTarget] = useState<TechReport | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TechReport | null>(null);

  // Create form
  const [createTitle, setCreateTitle] = useState("");
  const [createType, setCreateType] = useState<TechReport["type"]>("service");
  const [createProject, setCreateProject] = useState("");
  const [createAttachment, setCreateAttachment] = useState<File | null>(null);
  const [createDescription, setCreateDescription] = useState("");

  const canCreate =
    createTitle.trim() && createProject && createType;

  const resetForm = () => {
    setCreateTitle("");
    setCreateType("service");
    setCreateProject("");
    setCreateAttachment(null);
    setCreateDescription("");
  };

  const handleCreate = () => {
    const proj = myProjects.find((p) => p.id === createProject);
    const run = async () => {
      try {
        const response = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: createTitle.trim(),
            type: createType,
            status: "pending",
            submittedBy: tech?.name ?? sessionUser.name,
            submittedAt: getTodayInManila(),
            projectName: proj?.name ?? "",
            description: `${createDescription.trim()}${createAttachment ? ` [attachment:${createAttachment.name}]` : ""}`.trim(),
          }),
        });
        const payload = (await response.json()) as Report | { error?: string };
        if (!response.ok) {
          toast.error(
            "error" in payload && payload.error
              ? payload.error
              : "Failed to submit report."
          );
          return;
        }
        const created = payload as Report;
        setAllReports((prev) => [created, ...prev]);
        setShowCreate(false);
        setShowConfirm(false);
        resetForm();
        toast.success("Report submitted to admin for review.");
      } catch {
        toast.error("Failed to submit report.");
      }
    };
    void run();
  };

  const handleSend = () => {
    if (!selectedReport) return;
    setShowSendConfirm(false);
    setSelectedReport(null);
    toast.success(
      sendTarget === "admin"
        ? "Report sent to admin."
        : "Report sent to client."
    );
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/reports/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Failed to delete report.");
        return;
      }
      setAllReports((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Report deleted.");
    } catch {
      toast.error("Failed to delete report.");
    }
  };

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const approvedCount = reports.filter((r) => r.status === "approved").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {reports.length} report{reports.length !== 1 ? "s" : ""} —{" "}
            {pendingCount} pending, {approvedCount} approved
          </p>
        </div>
        <Button
          icon={Plus}
          onClick={() => {
            resetForm();
            setShowCreate(true);
          }}
        >
          Create Report
        </Button>
      </div>

      {/* Reports List */}
      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {reports.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No reports submitted yet.
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex-shrink-0">
                {report.status === "approved" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {report.title}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[report.status]}`}
                  >
                    {report.status.charAt(0).toUpperCase() +
                      report.status.slice(1)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {typeLabels[report.type]} · {report.projectName}
                </p>
              </div>
              <span className="text-xs text-slate-400 hidden sm:block">
                {formatDate(report.submittedAt)}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setViewTarget(report)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  title="View"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(report)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedReport(report);
                    setSendTarget("admin");
                    setShowSendConfirm(true);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <Send className="h-3 w-3" />
                  Send
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Report Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Submit Report"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Report Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              placeholder="e.g. Site Inspection - Phase 1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={createType}
                onChange={(e) =>
                  setCreateType(e.target.value as TechReport["type"])
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="service">Service Report</option>
                <option value="quotation">Quotation</option>
                <option value="revenue">Revenue Report</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={createProject}
                onChange={(e) => setCreateProject(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="">— Select project —</option>
                {myProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
              placeholder="Details about the report..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Attachment
            </label>
            <input
              type="file"
              onChange={(e) =>
                setCreateAttachment(e.target.files?.[0] ?? null)
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand hover:file:bg-brand-100"
              accept=".pdf,.jpg,.jpeg,.png"
            />
            {createAttachment && (
              <p className="mt-1.5 text-xs text-slate-500">
                {createAttachment.name}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button
              icon={FileText}
              onClick={() => setShowConfirm(true)}
              disabled={!canCreate}
            >
              Submit Report
            </Button>
          </div>
        </div>
      </Modal>

      {/* Submit Confirmation */}
      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirm Submission"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to submit this report? It will be sent to
            admin for review.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate}>Confirm</Button>
          </div>
        </div>
      </Modal>

      {/* View Report Details Modal */}
      <Modal
        isOpen={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title={viewTarget?.title ?? "Report Details"}
        size="md"
      >
        {viewTarget && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[viewTarget.status]}`}
              >
                {viewTarget.status.charAt(0).toUpperCase() +
                  viewTarget.status.slice(1)}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {typeLabels[viewTarget.type]}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Project</span>
                <span className="font-medium text-slate-900">
                  {viewTarget.projectName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Submitted</span>
                <span className="font-medium text-slate-900">
                  {formatDate(viewTarget.submittedAt)}
                </span>
              </div>
            </div>
            {viewTarget.description && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">
                  Description
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap rounded-lg bg-slate-50 p-3">
                  {viewTarget.description}
                </p>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setViewTarget(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Report"
        size="sm"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">
                &ldquo;{deleteTarget.title}&rdquo;
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                icon={Trash2}
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Send Confirmation */}
      <Modal
        isOpen={showSendConfirm}
        onClose={() => setShowSendConfirm(false)}
        title="Send Report"
        size="sm"
      >
        {selectedReport && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Send{" "}
              <span className="font-semibold text-slate-900">
                &ldquo;{selectedReport.title}&rdquo;
              </span>{" "}
              to:
            </p>
            <div className="flex gap-3">
              <label
                className={`flex-1 cursor-pointer rounded-lg border p-3 text-center text-sm font-medium transition-colors ${
                  sendTarget === "admin"
                    ? "border-brand bg-brand/5 text-brand"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="sendTarget"
                  value="admin"
                  checked={sendTarget === "admin"}
                  onChange={() => setSendTarget("admin")}
                  className="sr-only"
                />
                Admin
              </label>
              <label
                className={`flex-1 cursor-pointer rounded-lg border p-3 text-center text-sm font-medium transition-colors ${
                  sendTarget === "client"
                    ? "border-brand bg-brand/5 text-brand"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="sendTarget"
                  value="client"
                  checked={sendTarget === "client"}
                  onChange={() => setSendTarget("client")}
                  className="sr-only"
                />
                Client
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowSendConfirm(false)}
              >
                Cancel
              </Button>
              <Button icon={Send} onClick={handleSend}>
                Send
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
