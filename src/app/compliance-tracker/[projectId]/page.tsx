"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  ExternalLink,
  FolderKanban,
  LayoutGrid,
  List,
  ListChecks,
  Loader2,
  Mail,
  MapPin,
  Plus,
  Upload,
  User,
  X,
  FileCheck,
  AlertCircle,
  Clock,
  Download,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { toast } from "@/lib/toast";
import type { AdminComplianceTrackerItem } from "@/types/compliance-admin";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import WorkspaceEmpty from "@/components/projects/WorkspaceEmpty";
import { COMPLIANCE_ATTACHMENT_ALLOWED_TYPES, validateUploadFileSize } from "@/lib/upload-constraints";
import { filterComplianceItems, getComplianceStatusSummary } from "../compliance-status";

type CategoryKey =
  | "pending_review"
  | "awaiting_client"
  | "approved"
  | "rejected"
  | "waived"
  | "admin_queue";

const CATEGORY_META: Record<
  CategoryKey,
  { title: string; hint: string; borderClass: string }
> = {
  pending_review: {
    title: "Pending review",
    hint: "Client uploaded a file — review in Documents or update approval on the linked permit.",
    borderClass: "border-amber-200 bg-amber-50/40",
  },
  awaiting_client: {
    title: "Awaiting client",
    hint: "Waiting for the client to upload this requirement.",
    borderClass: "border-slate-200 bg-slate-50/60",
  },
  approved: {
    title: "Approved",
    hint: "Completed and approved.",
    borderClass: "border-brand-200 bg-brand-50/50",
  },
  rejected: {
    title: "Rejected",
    hint: "Client should re-upload after corrections.",
    borderClass: "border-red-200 bg-red-50/40",
  },
  waived: {
    title: "Waived / N/A",
    hint: "Marked not applicable by the client.",
    borderClass: "border-orange-200 bg-orange-50/40",
  },
  admin_queue: {
    title: "GreenSky to provide",
    hint: "Internal or admin-uploaded document (e.g. diagram).",
    borderClass: "border-slate-200 bg-slate-100/80",
  },
};

const CATEGORY_ORDER: CategoryKey[] = [
  "pending_review",
  "awaiting_client",
  "admin_queue",
  "approved",
  "rejected",
  "waived",
];

const OPTIONAL_KEYS = new Set(["homeowners_cert", "net_metering"]);

type ViewMode = "kanban" | "list" | "timeline";

type ProjectGroup = {
  projectId: string;
  projectName: string;
  location?: string;
  clientName: string;
  clientEmail: string;
  items: AdminComplianceTrackerItem[];
};

function manilaToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }).slice(0, 10);
}

function bucketItem(item: AdminComplianceTrackerItem): CategoryKey {
  if (item.status === "waived") return "waived";
  if (item.status === "approved") return "approved";
  if (item.status === "rejected") return "rejected";
  if (item.status === "submitted") return "pending_review";
  if (item.suppliedBy === "admin") return "admin_queue";
  return "awaiting_client";
}

function isResolvedItem(item: AdminComplianceTrackerItem): boolean {
  if (item.status === "approved" || item.status === "waived") return true;
  if (item.suppliedBy === "admin" && item.status === "pending") return true;
  return false;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0][0] ?? "?").toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function isOptionalItem(item: AdminComplianceTrackerItem): boolean {
  return OPTIONAL_KEYS.has(item.requirementKey);
}

function exportGroupCsv(group: ProjectGroup) {
  const header = ["Project", "Title", "Due date", "Status", "Supplied by", "Client"];
  const lines = [
    header.join(","),
    ...group.items.map((i) =>
      [
        csvEscape(group.projectName),
        csvEscape(i.title),
        i.dueDate,
        i.status,
        i.suppliedBy,
        csvEscape(group.clientName),
      ].join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `compliance-${group.projectId.slice(0, 8)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Exported CSV.");
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function AdminProjectCompliancePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AdminComplianceTrackerItem[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [currentFilter, setCurrentFilter] = useState<"all" | "overdue" | "pending" | "resolved">("all");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadModalId, setUploadModalId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/compliance-tracker", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        toast.error("You don’t have access to this page.");
        return;
      }
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        toast.error(j.error ?? "Could not load compliance tracker.");
        return;
      }
      const data = (await res.json()) as { items: AdminComplianceTrackerItem[] };
      setItems(data.items ?? []);
    } catch {
      toast.error("Could not load compliance tracker.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const reviewItem = async (itemId: string, decision: "approved" | "rejected") => {
    if (decision === "rejected") {
      const ok = window.confirm(
        "Reject this upload? The client can submit a revised file on their compliance page."
      );
      if (!ok) return;
    }
    setReviewingId(itemId);
    try {
      const res = await fetch(`/api/compliance-tracker/${itemId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Update failed.");
        return;
      }
      toast.success(decision === "approved" ? "Document approved." : "Document rejected.");
      await load();
    } catch {
      toast.error("Update failed.");
    } finally {
      setReviewingId(null);
    }
  };

  const uploadSolarDiagram = async (itemId: string, file: File) => {
    const uploadError = validateUploadFileSize(
      file,
      COMPLIANCE_ATTACHMENT_ALLOWED_TYPES,
      "Invalid file type. Use PDF, JPEG, PNG, or WebP."
    );
    if (uploadError) {
      toast.error(uploadError);
      return;
    }

    setUploadingId(itemId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/compliance-tracker/${itemId}/upload`, {
        method: "POST",
        body: fd,
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(payload.error ?? "Upload failed.");
        return;
      }
      toast.success("Solar diagram uploaded successfully.");
      setUploadModalId(null);
      await load();
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploadingId(null);
    }
  };

  const removeUploadedDiagram = async (itemId: string) => {
    setUploadingId(itemId);
    try {
      const res = await fetch(`/api/compliance-tracker/${itemId}/upload`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        toast.error(j.error ?? "Could not remove diagram.");
        return;
      }
      toast.success("Solar diagram removed.");
      await load();
    } catch {
      toast.error("Could not remove diagram.");
    } finally {
      setUploadingId(null);
    }
  };

  const group = useMemo(() => {
    const projectItems = items.filter((i) => i.projectId === projectId);
    if (projectItems.length === 0) return null;
    const first = projectItems[0];
    return {
      projectId: first.projectId,
      projectName: first.projectName,
      location: first.location,
      clientName: first.clientName,
      clientEmail: first.clientEmail,
      items: projectItems,
    } as ProjectGroup;
  }, [items, projectId]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-6 max-w-[1400px]">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => router.push("/compliance-tracker")}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Compliance Tracker
          </button>
        </div>
        <WorkspaceEmpty
          icon={ListChecks}
          title="Project compliance not found"
          description="This project may not exist or does not have any active compliance requirements."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => router.push("/compliance-tracker")}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Compliance Tracker
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-bold truncate max-w-[250px]">{group.projectName}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportGroupCsv(group)}
          className="text-xs"
        >
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Main Project Compliance Section */}
      <ProjectSection
        group={group}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        currentFilter={currentFilter}
        onFilterChange={setCurrentFilter}
        reviewingId={reviewingId}
        onReview={reviewItem}
        uploadingId={uploadingId}
        uploadModalId={uploadModalId}
        onUploadModalChange={setUploadModalId}
        onUploadSolarDiagram={uploadSolarDiagram}
        onRemoveUploadedDiagram={removeUploadedDiagram}
      />
    </div>
  );
}

function ProjectSection(props: {
  group: ProjectGroup;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  currentFilter: "all" | "overdue" | "pending" | "resolved";
  onFilterChange: (f: "all" | "overdue" | "pending" | "resolved") => void;
  reviewingId: string | null;
  onReview: (id: string, d: "approved" | "rejected") => void;
  uploadingId: string | null;
  uploadModalId: string | null;
  onUploadModalChange: (id: string | null) => void;
  onUploadSolarDiagram: (itemId: string, file: File) => void;
  onRemoveUploadedDiagram: (itemId: string) => void;
}) {
  const {
    group,
    viewMode,
    onViewModeChange,
    currentFilter,
    onFilterChange,
    reviewingId,
    onReview,
    uploadingId,
    uploadModalId,
    onUploadModalChange,
    onUploadSolarDiagram,
    onRemoveUploadedDiagram,
  } = props;
  const today = manilaToday();

  const filteredItems = useMemo(
    () => filterComplianceItems(group.items, currentFilter, today),
    [group.items, currentFilter, today]
  );

  const { stats } = useMemo(() => {
    const sorted = [...filteredItems].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const resolved = sorted.filter(isResolvedItem);
    const unresolved = sorted.filter((i) => !isResolvedItem(i));
    const overdue = unresolved.filter((i) => i.dueDate < today);
    const active = unresolved.filter((i) => i.dueDate >= today);
    const nOverdue = overdue.length;
    const nActive = active.length;
    const nResolved = resolved.length;
    const total = filteredItems.length;
    const pct = total ? Math.round((nResolved / total) * 100) : 0;
    return {
      stats: { total, nOverdue, nActive, nResolved, pct },
    };
  }, [filteredItems, today]);

  const byCat = useMemo(
    () =>
      CATEGORY_ORDER.reduce(
        (acc, key) => {
          acc[key] = group.items.filter((i) => bucketItem(i) === key);
          return acc;
        },
        {} as Record<CategoryKey, AdminComplianceTrackerItem[]>
      ),
    [group.items]
  );

  const timelineSorted = useMemo(
    () => [...group.items].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [group.items]
  );

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden space-y-0">
      {/* Stats Header */}
      <div className="grid grid-cols-2 gap-3 border-b border-slate-100 bg-slate-50/50 p-4 sm:grid-cols-4">
        <StatCard label="Total requirements" value={stats.total} pill="Active site" pillTone="up" />
        <StatCard
          label="Overdue"
          value={stats.nOverdue}
          valueClass={stats.nOverdue ? "text-red-600" : undefined}
          pill={stats.nOverdue ? "Action needed" : "Clear"}
          pillTone={stats.nOverdue ? "dn" : "up"}
        />
        <StatCard
          label="Awaiting client"
          value={stats.nActive}
          valueClass="text-amber-600"
          pill="In progress"
          pillTone="up"
        />
        <StatCard
          label="Resolved"
          value={stats.nResolved}
          valueClass="text-brand"
          pill={`${stats.pct}% complete`}
          pillTone="up"
        />
      </div>

      {/* Client Profile Banner */}
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between bg-white">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand border border-brand-100 shadow-sm">
            {initials(group.clientName)}
          </div>
          <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">
                <span className="text-slate-400 font-mono mr-2">{group.projectId.slice(0, 8).toUpperCase()}</span>
                {group.projectName}
              </h2>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
              {group.location && (
                <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {group.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                <User className="h-3.5 w-3.5 text-slate-400" />
                {group.clientName}
              </span>
              <span className="inline-flex items-center gap-1 text-slate-400">
                <Mail className="h-3.5 w-3.5" />
                {group.clientEmail}
              </span>
            </div>
          </div>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-1">
            <button
              type="button"
              onClick={() => onViewModeChange("kanban")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === "kanban"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="h-3.5 w-3.5" /> Table List
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("timeline")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === "timeline"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" /> Timeline
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/30 px-5 py-2.5">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span>Filter:</span>
          {(["all", "overdue", "pending", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`capitalize px-2.5 py-1 rounded-md transition-colors ${
                currentFilter === f
                  ? "bg-white text-brand font-bold border border-slate-200 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 font-medium">
          Showing {filteredItems.length} requirement(s)
        </span>
      </div>

      {/* Views Body */}
      <div className="p-5">
        {viewMode === "kanban" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
            {CATEGORY_ORDER.map((catKey) => {
              const meta = CATEGORY_META[catKey];
              const list = byCat[catKey];
              return (
                <div
                  key={catKey}
                  className={`rounded-xl border p-3 flex flex-col min-h-[300px] ${meta.borderClass}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-slate-800">{meta.title}</h3>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                      {list.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mb-3 leading-tight">{meta.hint}</p>

                  <div className="space-y-2.5 flex-1">
                    {list.map((item) => (
                      <KanbanCard
                        key={item.id}
                        item={item}
                        reviewingId={reviewingId}
                        onReview={onReview}
                        uploadingId={uploadingId}
                        uploadModalId={uploadModalId}
                        onUploadModalChange={onUploadModalChange}
                        onUploadSolarDiagram={onUploadSolarDiagram}
                        onRemoveUploadedDiagram={onRemoveUploadedDiagram}
                      />
                    ))}
                    {list.length === 0 && (
                      <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-[11px] text-slate-400">
                        No items
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === "list" && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="p-3">Requirement</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Supplied By</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-medium text-slate-900">
                      <div>
                        <p className="font-bold text-slate-800">{item.title}</p>
                        <p className="text-[11px] text-slate-500">{item.description}</p>
                      </div>
                    </td>
                    <td className="p-3 capitalize text-slate-600">
                      {CATEGORY_META[bucketItem(item)].title}
                    </td>
                    <td className="p-3 font-medium text-slate-700">{formatDate(item.dueDate)}</td>
                    <td className="p-3">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="p-3 capitalize font-medium text-slate-600">{item.suppliedBy}</td>
                    <td className="p-3 text-right">
                      {item.fileUrl ? (
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                        >
                          View File <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No file</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === "timeline" && (
          <div className="relative border-l-2 border-brand/20 ml-4 space-y-6 py-2">
            {timelineSorted.map((item) => (
              <div key={item.id} className="relative pl-6">
                <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-brand bg-white" />
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs max-w-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">{item.title}</span>
                    <StatusBadge status={item.status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{item.description}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Due: {formatDate(item.dueDate)}</span>
                    <span className="capitalize font-medium text-slate-600">
                      Supplied by: {item.suppliedBy}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard(props: {
  label: string;
  value: number;
  valueClass?: string;
  pill: string;
  pillTone: "up" | "dn";
}) {
  const { label, value, valueClass = "text-slate-900", pill, pillTone } = props;
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-slate-500">{label}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            pillTone === "dn"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}
        >
          {pill}
        </span>
      </div>
      <p className={`text-xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function KanbanCard(props: {
  item: AdminComplianceTrackerItem;
  reviewingId: string | null;
  onReview: (id: string, d: "approved" | "rejected") => void;
  uploadingId: string | null;
  uploadModalId: string | null;
  onUploadModalChange: (id: string | null) => void;
  onUploadSolarDiagram: (itemId: string, file: File) => void;
  onRemoveUploadedDiagram: (itemId: string) => void;
}) {
  const {
    item,
    reviewingId,
    onReview,
    uploadingId,
    uploadModalId,
    onUploadModalChange,
    onUploadSolarDiagram,
    onRemoveUploadedDiagram,
  } = props;

  const isReviewing = reviewingId === item.id;
  const isUploading = uploadingId === item.id;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2.5">
      <div>
        <div className="flex items-start justify-between gap-1 mb-1">
          <h4 className="text-xs font-bold text-slate-900 leading-snug">{item.title}</h4>
          <StatusBadge status={item.status} size="sm" />
        </div>
        <p className="text-[10px] text-slate-500 leading-tight">{item.description}</p>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2">
        <span>Due: {formatDate(item.dueDate)}</span>
        <span className="capitalize font-medium text-slate-500">{item.suppliedBy}</span>
      </div>

      {/* Actions */}
      {item.status === "submitted" && (
        <div className="flex gap-1.5 pt-1">
          <button
            type="button"
            disabled={isReviewing}
            onClick={() => onReview(item.id, "approved")}
            className="flex-1 rounded-lg bg-emerald-600 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={isReviewing}
            onClick={() => onReview(item.id, "rejected")}
            className="flex-1 rounded-lg bg-red-50 text-red-700 py-1 text-[10px] font-bold border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}

      {item.suppliedBy === "admin" && item.requirementKey === "solar_diagram" && (
        <div className="pt-1">
          {item.fileUrl ? (
            <div className="flex items-center justify-between gap-1">
              <a
                href={item.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-semibold text-brand hover:underline flex items-center gap-0.5"
              >
                <ExternalLink className="h-3 w-3" /> View Diagram
              </a>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => onRemoveUploadedDiagram(item.id)}
                className="text-[10px] text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <label className="flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer">
              <Upload className="h-3 w-3 text-brand" /> Upload Diagram
              <input
                type="file"
                className="hidden"
                accept="application/pdf,image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadSolarDiagram(item.id, f);
                }}
              />
            </label>
          )}
        </div>
      )}

      {item.fileUrl && item.suppliedBy === "client" && (
        <div className="pt-1 text-right">
          <a
            href={item.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-semibold text-brand hover:underline flex items-center justify-end gap-0.5"
          >
            View File <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
