"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Users,
  CheckCircle2,
  Clock,
  Circle,
  XCircle,
  ClipboardList,
  FileText,
  FileCheck,
  ShieldCheck,
  FileSpreadsheet,
  Download,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import WorkspaceEmpty from "@/components/projects/WorkspaceEmpty";
import StatusBadge from "@/components/ui/StatusBadge";
import ProgressBar from "@/components/ui/ProgressBar";
import { formatDate } from "@/lib/format";
import { diffCalendarDaysIso } from "@/lib/date-utils";
import { TASK_STATUS_LABELS } from "@/lib/constants";
import type {
  ClientProjectDetail,
  ClientTask,
  ClientTaskStatus,
  Document as ClientDocument,
  ComplianceTimelineItem,
} from "@/types/client";

const taskStatusIcons: Record<ClientTaskStatus, React.ReactNode> = {
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  in_progress: <Clock className="h-4 w-4 text-blue-500" />,
  todo: <Circle className="h-4 w-4 text-slate-400" />,
  cancelled: <XCircle className="h-4 w-4 text-red-400" />,
};

type TimelineCategory = "day" | "status";

export default function ClientProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<ClientProjectDetail | null>(null);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [complianceItems, setComplianceItems] = useState<ComplianceTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [timelineCategory, setTimelineCategory] = useState<TimelineCategory>("day");

  useEffect(() => {
    const load = async () => {
      try {
        const [projRes, docsRes, compRes] = await Promise.allSettled([
          fetch(`/api/client/projects/${projectId}`, { cache: "no-store" }),
          fetch(`/api/client/documents`, { cache: "no-store" }),
          fetch(`/api/client/compliance`, { cache: "no-store" }),
        ]);

        if (projRes.status === "fulfilled" && projRes.value.ok) {
          const data = (await projRes.value.json()) as ClientProjectDetail;
          setProject(data);
        } else {
          setNotFound(true);
        }

        if (docsRes.status === "fulfilled" && docsRes.value.ok) {
          const docsData = (await docsRes.value.json()) as ClientDocument[];
          setDocuments(Array.isArray(docsData) ? docsData : []);
        }

        if (compRes.status === "fulfilled" && compRes.value.ok) {
          const compData = await compRes.value.json();
          setComplianceItems(Array.isArray(compData.items) ? compData.items : []);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [projectId]);

  const filteredTasks = useMemo(() => project?.tasks ?? [], [project]);

  const projectStartIso = project?.startDate?.slice(0, 10) ?? "";

  const taskProjectDayNumber = useCallback(
    (dueDate: string) => {
      const due = dueDate.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(projectStartIso) || !/^\d{4}-\d{2}-\d{2}$/.test(due)) return null;
      return diffCalendarDaysIso(projectStartIso, due) + 1;
    },
    [projectStartIso]
  );

  const timelineDays = useMemo(() => {
    const grouped = new Map<string, ClientTask[]>();
    filteredTasks.forEach((task) => {
      const dateKey = task.dueDate.slice(0, 10);
      const bucket = grouped.get(dateKey) ?? [];
      bucket.push(task);
      grouped.set(dateKey, bucket);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, tasks]) => ({
        dateKey,
        dayNumber: taskProjectDayNumber(dateKey),
        tasks: tasks.sort((a, b) => a.title.localeCompare(b.title)),
      }));
  }, [filteredTasks, taskProjectDayNumber]);

  const timelineByStatus = useMemo(() => {
    const order: ClientTaskStatus[] = ["todo", "in_progress", "completed", "cancelled"];
    return order
      .map((status) => ({
        status,
        label: TASK_STATUS_LABELS[status],
        tasks: filteredTasks
          .filter((task) => task.status === status)
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
      }))
      .filter((group) => group.tasks.length > 0);
  }, [filteredTasks]);

  // Documents categorized by type for this project
  const projectDocs = useMemo(() => {
    const projName = project?.name?.toLowerCase() ?? "";

    const relevantDocs = documents.filter(
      (d) => !d.projectName || d.projectName.toLowerCase() === projName || projName.includes(d.projectName.toLowerCase())
    );

    const quotation = relevantDocs.filter(
      (d) => d.linkedReportType === "quotation" || d.type === "contract" || d.title.toLowerCase().includes("quotation") || d.title.toLowerCase().includes("quote")
    );

    const invoice = relevantDocs.filter(
      (d) => d.type === "invoice" || d.title.toLowerCase().includes("invoice") || d.title.toLowerCase().includes("receipt")
    );

    const reports = relevantDocs.filter(
      (d) => (d.type === "report" && d.linkedReportType !== "quotation") || d.title.toLowerCase().includes("report")
    );

    const projectCompliance = complianceItems.filter(
      (c) => c.projectId === projectId || (project && c.projectName?.toLowerCase() === projName)
    );

    const complianceDocs = relevantDocs.filter(
      (d) => d.type === "permit" || d.type === "warranty" || d.title.toLowerCase().includes("permit") || d.title.toLowerCase().includes("compliance")
    );

    return {
      quotation,
      invoice,
      reports,
      compliance: projectCompliance,
      complianceDocs,
    };
  }, [documents, complianceItems, project, projectId]);

  // ---- Loading / Not Found States ----
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse space-y-4">
              <div className="h-5 w-1/3 bg-slate-100 rounded" />
              <div className="h-3 w-2/3 bg-slate-100 rounded" />
              <div className="h-2.5 w-full bg-slate-100 rounded" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-16 bg-slate-100 rounded-lg" />
                <div className="h-16 bg-slate-100 rounded-lg" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push("/client/projects")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Projects
        </button>
        <WorkspaceEmpty
          icon={ClipboardList}
          title="Project not found"
          description="This link may be outdated, or you no longer have access. Use Back to pick another project."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => router.push("/client/projects")}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Projects
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-medium truncate max-w-[250px]">ID: {project.id} — {project.name}</span>
      </div>

      {/* Grid Layout: Fits into 1 page screen with internal scrolling Documents box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* ====== Project Header Card ====== */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            {/* Title + Status */}
            <div className="flex items-start justify-between gap-3 mb-2">
                <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-slate-400 font-mono text-base">{project.id.slice(0, 8).toUpperCase()}</span>
                  {project.name}
                </h1>
              <StatusBadge status={project.status} size="md" />
            </div>

            {/* Description */}
            <p className="text-sm text-slate-600 leading-relaxed mb-5">{project.description}</p>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase tracking-wider font-medium">Location</span>
                </div>
                <p className="text-xs font-medium text-slate-700">{project.location}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase tracking-wider font-medium">Timeline</span>
                </div>
                <p className="text-xs font-medium text-slate-700">
                  {formatDate(project.startDate)} — {formatDate(project.endDate)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <User className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase tracking-wider font-medium">Project Lead</span>
                </div>
                <p className="text-xs font-medium text-slate-700">{project.projectLeadName}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase tracking-wider font-medium">Technicians</span>
                </div>
                {project.assignedTechnicianNames.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {project.assignedTechnicianNames.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-medium text-slate-400">No technicians assigned</p>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-500">Overall Progress</span>
                <span className="text-sm font-bold text-slate-700">{project.progress}%</span>
              </div>
              <ProgressBar value={project.progress} size="md" showLabel={false} />
            </div>
          </div>

          {/* ====== Timeline ====== */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Timeline</h2>
                <p className="text-xs text-slate-500 mt-0.5">Track work by day or by task status</p>
              </div>
              {filteredTasks.length > 0 ? (
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                  <button
                    onClick={() => setTimelineCategory("day")}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      timelineCategory === "day"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    By Day
                  </button>
                  <button
                    onClick={() => setTimelineCategory("status")}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      timelineCategory === "status"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    By Status
                  </button>
                </div>
              ) : null}
            </div>

            <div className="p-5 space-y-4">
              {filteredTasks.length === 0 ? (
                <WorkspaceEmpty
                  variant="compact"
                  icon={ClipboardList}
                  title="No tasks scheduled yet"
                  description="Your technicians add milestones here as installation moves forward. Check back soon, or reach out through your installer if you have questions."
                />
              ) : (
                <>
                  {timelineCategory === "day" &&
                    timelineDays.map((day) => (
                      <div key={day.dateKey} className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-4 py-2.5">
                          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                            Day {day.dayNumber ?? "?"}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            {new Date(`${day.dateKey}T00:00:00`).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            {day.tasks.length} task{day.tasks.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {day.tasks.map((task, taskIndex) => (
                            <div
                              key={`${day.dateKey}-${task.id}-${taskIndex}`}
                              className="flex items-start justify-between gap-3 bg-white px-4 py-3"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="flex-shrink-0">{taskStatusIcons[task.status]}</span>
                                  <p className="text-sm font-medium text-slate-900">{task.title}</p>
                                  <StatusBadge status={task.priority} size="sm" />
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Assigned to <span className="font-medium text-slate-700">{task.assignedToName}</span>
                                </p>
                              </div>
                              <StatusBadge status={task.status} size="sm" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                  {timelineCategory === "status" &&
                    timelineByStatus.map((group) => (
                      <div key={group.status} className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5">
                          <p className="text-sm font-semibold text-slate-900">{group.label}</p>
                          <span className="text-xs font-medium text-slate-500">{group.tasks.length} task(s)</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {group.tasks.map((task, taskIndex) => (
                            <div
                              key={`${group.status}-${task.id}-${taskIndex}`}
                              className="flex items-start justify-between gap-3 bg-white px-4 py-3"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="flex-shrink-0">{taskStatusIcons[task.status]}</span>
                                  <p className="text-sm font-medium text-slate-900">{task.title}</p>
                                  <StatusBadge status={task.priority} size="sm" />
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {taskProjectDayNumber(task.dueDate) != null
                                    ? `Day ${taskProjectDayNumber(task.dueDate)} · `
                                    : ""}
                                  Due: {formatDate(task.dueDate)} · Assigned to: {task.assignedToName}
                                </p>
                              </div>
                              <StatusBadge status={task.status} size="sm" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col) - Internal Scrollable Documents Panel */}
        <div className="lg:col-span-1 h-full">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col lg:h-[calc(100vh-140px)] lg:max-h-[640px]">
            {/* Fixed Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand" />
                  Documents
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quotation, Invoice, Reports & Compliance
                </p>
              </div>
              <Link
                href="/client/documents"
                className="text-xs font-semibold text-brand hover:underline flex items-center gap-0.5"
              >
                View All
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Scrollable Document Categories Container */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {/* Category 1: Quotation */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <FileSpreadsheet className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Quotation</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {projectDocs.quotation.length > 0 ? `${projectDocs.quotation.length} File(s)` : "Available"}
                  </span>
                </div>

                {projectDocs.quotation.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {projectDocs.quotation.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-slate-800 truncate">{doc.title}</p>
                          <p className="text-[10px] text-slate-400">{formatDate(doc.uploadedAt)}</p>
                        </div>
                        {doc.fileUrl ? (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-500 hover:text-brand transition-colors"
                            title="Download/View File"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <Link href="/client/documents" className="p-1 text-slate-500 hover:text-brand">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500">System Quotation & Proposal</span>
                    <Link
                      href="/client/documents"
                      className="text-[11px] font-medium text-brand hover:underline flex items-center gap-1"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Category 2: Invoice */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <FileCheck className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Invoice</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {projectDocs.invoice.length > 0 ? `${projectDocs.invoice.length} File(s)` : "Billing"}
                  </span>
                </div>

                {projectDocs.invoice.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {projectDocs.invoice.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-slate-800 truncate">{doc.title}</p>
                          <p className="text-[10px] text-slate-400">{formatDate(doc.uploadedAt)}</p>
                        </div>
                        {doc.fileUrl ? (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-500 hover:text-brand transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <Link href="/client/payments" className="p-1 text-slate-500 hover:text-brand">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500">Invoices & Billing Statements</span>
                    <Link
                      href="/client/payments"
                      className="text-[11px] font-medium text-brand hover:underline flex items-center gap-1"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Category 3: Reports */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                      <ClipboardList className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Reports</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    {projectDocs.reports.length > 0 ? `${projectDocs.reports.length} File(s)` : "Inspection"}
                  </span>
                </div>

                {projectDocs.reports.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {projectDocs.reports.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-slate-800 truncate">{doc.title}</p>
                          <p className="text-[10px] text-slate-400">{formatDate(doc.uploadedAt)}</p>
                        </div>
                        {doc.fileUrl ? (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-500 hover:text-brand transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <Link href="/client/documents" className="p-1 text-slate-500 hover:text-brand">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500">Service & Assessment Reports</span>
                    <Link
                      href="/client/documents"
                      className="text-[11px] font-medium text-brand hover:underline flex items-center gap-1"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Category 4: Compliance */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Compliance</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    {projectDocs.compliance.length > 0 ? `${projectDocs.compliance.length} Item(s)` : "Meralco / Permits"}
                  </span>
                </div>

                {projectDocs.compliance.length > 0 || projectDocs.complianceDocs.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {projectDocs.compliance.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-slate-800 truncate">{item.title}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{item.status.replace("_", " ")}</p>
                        </div>
                        {item.fileUrl ? (
                          <a
                            href={item.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-500 hover:text-brand transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <Link href="/client/compliance" className="p-1 text-slate-500 hover:text-brand">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    ))}
                    {projectDocs.complianceDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-slate-800 truncate">{doc.title}</p>
                          <p className="text-[10px] text-slate-400">{formatDate(doc.uploadedAt)}</p>
                        </div>
                        {doc.fileUrl ? (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-500 hover:text-brand transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <Link href="/client/compliance" className="p-1 text-slate-500 hover:text-brand">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500">Permits & Grid-Tie Compliance</span>
                    <Link
                      href="/client/compliance"
                      className="text-[11px] font-medium text-brand hover:underline flex items-center gap-1"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
