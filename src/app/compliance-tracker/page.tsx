"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Calendar,
  Check,
  ExternalLink,
  FolderKanban,
  LayoutGrid,
  List,
  ListChecks,
  Loader2,
  Mail,
  Plus,
  User,
  X,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { toast } from "@/lib/toast";
import type { AdminComplianceTrackerItem } from "@/types/compliance-admin";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";

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

export default function ComplianceTrackerPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AdminComplianceTrackerItem[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [viewByProject, setViewByProject] = useState<Record<string, ViewMode>>({});

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

  const projectGroups = useMemo(() => {
    const map = new Map<string, ProjectGroup>();
    for (const item of items) {
      let g = map.get(item.projectId);
      if (!g) {
        g = {
          projectId: item.projectId,
          projectName: item.projectName,
          clientName: item.clientName,
          clientEmail: item.clientEmail,
          items: [],
        };
        map.set(item.projectId, g);
      }
      g.items.push(item);
    }
    return Array.from(map.values()).sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [items]);

  useEffect(() => {
    if (projectGroups.length === 0) {
      setSelectedProjectId(null);
      return;
    }
    setSelectedProjectId((prev) => {
      if (prev && projectGroups.some((g) => g.projectId === prev)) return prev;
      return projectGroups[0].projectId;
    });
  }, [projectGroups]);

  const selectedGroup = useMemo(
    () => projectGroups.find((g) => g.projectId === selectedProjectId) ?? null,
    [projectGroups, selectedProjectId]
  );

  const setProjectView = (projectId: string, mode: ViewMode) => {
    setViewByProject((prev) => ({ ...prev, [projectId]: mode }));
  };

  const getProjectView = (projectId: string): ViewMode =>
    viewByProject[projectId] ?? "kanban";

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      <header className="page-head mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 border border-brand-100">
            <ListChecks className="h-4 w-4 text-brand" strokeWidth={2} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Compliance tracker</h1>
        </div>
        <p className="mt-1 text-xs text-slate-500 max-w-2xl leading-relaxed">
          Only clients who completed a <strong className="font-semibold text-brand">site inspection</strong>{" "}
          booking appear here. Requirements are grouped by project, then by status.
        </p>
      </header>

      {projectGroups.length === 0 ? (
        <div className="rounded-2xl bg-gradient-to-b from-brand-50/45 via-white to-slate-50/30 py-16 text-center px-6">
          <ListChecks className="mx-auto h-14 w-14 text-brand/35 mb-4" strokeWidth={1.4} />
          <p className="text-sm text-slate-500 px-4">
            No eligible projects yet. A client must have a <strong>completed</strong> site inspection and an
            assigned project.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {projectGroups.length > 1 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <FolderKanban className="h-4 w-4 text-brand shrink-0" />
                <span>
                  <span className="font-medium text-slate-700">{projectGroups.length} projects</span>
                  {" · "}
                  Choose one to review compliance for that site.
                </span>
              </div>
              <div className="min-w-0 sm:max-w-md sm:flex-1 sm:pl-4">
                <label htmlFor="compliance-project" className="sr-only">
                  Project
                </label>
                <select
                  id="compliance-project"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  value={selectedProjectId ?? ""}
                  onChange={(e) => setSelectedProjectId(e.target.value || null)}
                >
                  {projectGroups.map((g) => (
                    <option key={g.projectId} value={g.projectId}>
                      {g.projectName} — {g.clientName} ({g.items.length} requirements)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {selectedGroup ? (
            <ProjectSection
              key={selectedGroup.projectId}
              group={selectedGroup}
              viewMode={getProjectView(selectedGroup.projectId)}
              onViewModeChange={(m) => setProjectView(selectedGroup.projectId, m)}
              reviewingId={reviewingId}
              onReview={reviewItem}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function ProjectSection(props: {
  group: ProjectGroup;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  reviewingId: string | null;
  onReview: (id: string, d: "approved" | "rejected") => void;
}) {
  const { group, viewMode, onViewModeChange, reviewingId, onReview } = props;
  const today = manilaToday();

  const { laneOverdue, laneActive, laneResolved, stats } = useMemo(() => {
    const sorted = [...group.items].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const resolved = sorted.filter(isResolvedItem);
    const unresolved = sorted.filter((i) => !isResolvedItem(i));
    const overdue = unresolved.filter((i) => i.dueDate < today);
    const active = unresolved.filter((i) => i.dueDate >= today);
    const nOverdue = overdue.length;
    const nActive = active.length;
    const nResolved = resolved.length;
    const total = group.items.length;
    const pct = total ? Math.round((nResolved / total) * 100) : 0;
    return {
      laneOverdue: overdue,
      laneActive: active,
      laneResolved: resolved,
      stats: { total, nOverdue, nActive, nResolved, pct },
    };
  }, [group.items, today]);

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
    <section className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2.5 border-b border-slate-100 bg-slate-50/50 p-4 sm:grid-cols-4">
        <StatCard label="Total requirements" value={stats.total} pill="Active project" pillTone="up" />
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

      {/* Client strip */}
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-50 text-sm font-bold text-brand border border-brand-100">
            {initials(group.clientName)}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 truncate">{group.projectName}</h2>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3 shrink-0" />
                {group.clientName}
              </span>
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3 shrink-0" />
                {group.clientEmail}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-800">
            {group.projectName}
          </span>
          <Link
            href={`/projects/${group.projectId}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-dark px-3.5 py-2 text-[11px] font-medium text-white hover:bg-brand transition-colors"
          >
            Open project
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between bg-white">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
          {(
            [
              ["kanban", "Kanban", LayoutGrid],
              ["list", "List", List],
              ["timeline", "Timeline", ListChecks],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => onViewModeChange(key)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                viewMode === key
                  ? "bg-brand-dark text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportGroupCsv(group)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11px] font-medium text-brand-800 hover:bg-brand-100 cursor-pointer"
          >
            <ExternalLink className="h-3 w-3" />
            Export
          </button>
          <button
            type="button"
            onClick={() => void toast.info("Add requirement is not available yet.")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand bg-brand px-3 py-1.5 text-[11px] font-medium text-white hover:bg-brand-dark cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            Add requirement
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5 bg-slate-50/40">
        {viewMode === "kanban" && (
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
            <KanbanLane
              title="Overdue"
              tone="overdue"
              items={laneOverdue}
              today={today}
              reviewingId={reviewingId}
              onReview={onReview}
              clientEmail={group.clientEmail}
            />
            <KanbanLane
              title="Awaiting client"
              tone="default"
              items={laneActive}
              today={today}
              reviewingId={reviewingId}
              onReview={onReview}
              clientEmail={group.clientEmail}
            />
            <KanbanLane
              title="Resolved"
              tone="done"
              items={laneResolved}
              today={today}
              reviewingId={reviewingId}
              onReview={onReview}
              clientEmail={group.clientEmail}
            />
          </div>
        )}

        {viewMode === "list" && (
          <div className="space-y-5">
            {CATEGORY_ORDER.map((cat) => {
              const catItems = byCat[cat];
              if (catItems.length === 0) return null;
              const meta = CATEGORY_META[cat];
              return (
                <div key={cat} className={`rounded-xl border p-4 ${meta.borderClass}`}>
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-900">{meta.title}</h3>
                    <span className="text-xs font-medium text-slate-500 tabular-nums">{catItems.length}</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-3">{meta.hint}</p>
                  <ul className="space-y-2">
                    {catItems.map((item) => (
                      <ListRowItem
                        key={item.id}
                        item={item}
                        cat={cat}
                        reviewingId={reviewingId}
                        onReview={onReview}
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === "timeline" && (
          <ul className="space-y-2">
            {timelineSorted.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{item.description}</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-500">
                    <Calendar className="h-3 w-3" />
                    Due {formatDate(item.dueDate)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={item.status} size="sm" />
                  {item.fileUrl && (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-brand hover:underline"
                    >
                      View file
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
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
  const { label, value, valueClass, pill, pillTone } = props;
  return (
    <div className="rounded-[10px] border border-slate-200/90 bg-white px-4 py-3.5 shadow-sm">
      <div className={`text-[22px] font-bold tabular-nums text-slate-900 leading-none ${valueClass ?? ""}`}>
        {value}
      </div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div
        className={`mt-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
          pillTone === "up" ? "bg-brand-50 text-brand-800" : "bg-red-50 text-red-800"
        }`}
      >
        {pill}
      </div>
    </div>
  );
}

function KanbanLane(props: {
  title: string;
  tone: "overdue" | "default" | "done";
  items: AdminComplianceTrackerItem[];
  today: string;
  reviewingId: string | null;
  onReview: (id: string, d: "approved" | "rejected") => void;
  clientEmail: string;
}) {
  const { title, tone, items, today, reviewingId, onReview, clientEmail } = props;
  const headCls =
    tone === "overdue"
      ? "text-red-700"
      : tone === "done"
        ? "text-brand-800"
        : "text-slate-600";
  const countCls =
    tone === "overdue"
      ? "border-red-200 bg-red-50 text-red-800"
      : tone === "done"
        ? "border-brand-200 bg-brand-50 text-brand-900"
        : "border-slate-200 bg-white text-slate-600";

  return (
    <div
      className={`rounded-xl p-3.5 ${
        tone === "overdue" ? "bg-red-50/30" : tone === "done" ? "bg-brand-50/20" : "bg-slate-100"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${headCls}`}>{title}</span>
        <span
          className={`flex h-5 min-w-5 items-center justify-center rounded-md border px-1 text-[10px] font-bold ${countCls}`}
        >
          {items.length}
        </span>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="rounded-lg bg-white/60 py-8 text-center text-[11px] text-slate-400">
            No items
          </p>
        ) : (
          items.map((item) => (
            <KanbanCard
              key={item.id}
              item={item}
              today={today}
              reviewingId={reviewingId}
              onReview={onReview}
              clientEmail={clientEmail}
            />
          ))
        )}
      </div>
    </div>
  );
}

function KanbanCard(props: {
  item: AdminComplianceTrackerItem;
  today: string;
  reviewingId: string | null;
  onReview: (id: string, d: "approved" | "rejected") => void;
  clientEmail: string;
}) {
  const { item, today, reviewingId, onReview, clientEmail } = props;
  const overdue = !isResolvedItem(item) && item.dueDate < today;

  const { label, badgeClass } = cardPrimaryBadge(item, overdue);
  const leftBorder = overdue
    ? "border-l-[3px] border-l-red-500 rounded-l-none"
    : item.status === "approved" || item.status === "waived"
      ? "border-l-[3px] border-l-brand rounded-l-none"
      : "";

  const remindHref = `mailto:${encodeURIComponent(clientEmail)}?subject=${encodeURIComponent(
    `Reminder: ${item.title} (due ${formatDate(item.dueDate)})`
  )}&body=${encodeURIComponent("Hi,\n\nThis is a friendly reminder about an outstanding compliance item.\n\nThank you.")}`;

  return (
    <div
      className={`rounded-lg border border-slate-200/90 bg-white px-3.5 py-3 shadow-sm transition-colors hover:border-brand-200 ${leftBorder}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-xs font-semibold text-slate-900 leading-snug flex-1">{item.title}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ${badgeClass}`}>
          {label}
        </span>
      </div>
      {isOptionalItem(item) && (
        <div className="mb-1.5">
          <span className="inline-block rounded-full bg-slate-100 px-1.5 py-px text-[9px] text-slate-500">
            Optional
          </span>
        </div>
      )}
      <p className="text-[11px] text-slate-500 leading-snug line-clamp-2 mb-2">{item.description}</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className={`inline-flex items-center gap-1 text-[10px] ${
            overdue ? "font-medium text-red-600" : "text-slate-500"
          }`}
        >
          <Calendar className={`h-2.5 w-2.5 shrink-0 ${overdue ? "text-red-500" : ""}`} />
          {formatDate(item.dueDate)}
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {bucketItem(item) === "pending_review" && item.documentId && (
            <>
              <button
                type="button"
                onClick={() => void onReview(item.id, "approved")}
                disabled={reviewingId === item.id}
                className="text-[10px] font-semibold text-brand hover:underline disabled:opacity-50 cursor-pointer"
              >
                {reviewingId === item.id ? "…" : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => void onReview(item.id, "rejected")}
                disabled={reviewingId === item.id}
                className="text-[10px] font-semibold text-red-600 hover:underline disabled:opacity-50 cursor-pointer"
              >
                Reject
              </button>
            </>
          )}
          {item.fileUrl && (
            <a
              href={item.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-semibold text-brand hover:underline"
            >
              View file →
            </a>
          )}
          {overdue && item.suppliedBy === "client" && item.status === "pending" && (
            <a href={remindHref} className="text-[10px] font-semibold text-brand hover:underline">
              Remind client →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function cardPrimaryBadge(
  item: AdminComplianceTrackerItem,
  overdue: boolean
): { label: string; badgeClass: string } {
  if (item.status === "waived") return { label: "Waived", badgeClass: "bg-orange-100 text-orange-900" };
  if (item.status === "approved") return { label: "Approved", badgeClass: "bg-brand-100 text-brand-900" };
  if (item.suppliedBy === "admin" && item.status === "pending")
    return { label: "GS provides", badgeClass: "bg-slate-100 text-slate-600" };
  if (item.status === "rejected") return { label: "Rejected", badgeClass: "bg-red-100 text-red-800" };
  if (item.status === "submitted") return { label: "In review", badgeClass: "bg-sky-100 text-sky-900" };
  if (overdue) return { label: "Overdue", badgeClass: "bg-red-100 text-red-800" };
  return { label: "Pending", badgeClass: "bg-amber-100 text-amber-900" };
}

function ListRowItem(props: {
  item: AdminComplianceTrackerItem;
  cat: CategoryKey;
  reviewingId: string | null;
  onReview: (id: string, d: "approved" | "rejected") => void;
}) {
  const { item, cat, reviewingId, onReview } = props;
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-white/60 bg-white/80 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{item.title}</p>
        <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{item.description}</p>
        <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-slate-500">
          <Calendar className="h-3 w-3 shrink-0" />
          Due {formatDate(item.dueDate)}
        </p>
        {cat === "pending_review" && item.documentId && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="primary"
              icon={reviewingId === item.id ? Loader2 : Check}
              className={`!h-8 ${reviewingId === item.id ? "[&_svg]:animate-spin" : ""}`}
              disabled={reviewingId === item.id}
              onClick={() => void onReview(item.id, "approved")}
            >
              {reviewingId === item.id ? "Saving…" : "Approve"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              icon={X}
              className="!h-8"
              disabled={reviewingId === item.id}
              onClick={() => void onReview(item.id, "rejected")}
            >
              Reject
            </Button>
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge status={item.status} size="sm" />
        {item.fileUrl && (
          <a
            href={item.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-brand hover:underline"
          >
            View file
          </a>
        )}
      </div>
    </li>
  );
}
