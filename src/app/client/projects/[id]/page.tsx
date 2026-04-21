"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import ProgressBar from "@/components/ui/ProgressBar";
import { formatDate } from "@/lib/format";
import { diffCalendarDaysIso } from "@/lib/date-utils";
import {
  TASK_STATUS_LABELS,
} from "@/lib/constants";
import type {
  ClientProjectDetail,
  ClientTask,
  ClientTaskStatus,
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
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [timelineCategory, setTimelineCategory] = useState<TimelineCategory>("day");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/client/projects/${projectId}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as ClientProjectDetail;
          setProject(data);
        } else if (res.status === 404) {
          setNotFound(true);
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

  // ---- Loading / Not Found States ----
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-slate-100 rounded animate-pulse" />
        <div className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse space-y-4">
          <div className="h-5 w-1/3 bg-slate-100 rounded" />
          <div className="h-3 w-2/3 bg-slate-100 rounded" />
          <div className="h-2.5 w-full bg-slate-100 rounded" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 bg-slate-100 rounded-lg" />
            <div className="h-16 bg-slate-100 rounded-lg" />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse space-y-3">
          <div className="h-5 w-1/4 bg-slate-100 rounded" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-lg" />
          ))}
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
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">Project not found</p>
        </div>
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
        <span className="text-slate-900 font-medium truncate max-w-[200px]">{project.name}</span>
      </div>

      {/* ====== Project Header Card ====== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        {/* Title + Status */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-lg font-bold text-slate-900">{project.name}</h1>
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
              <span className="text-[10px] uppercase tracking-wider font-medium">Team</span>
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
              <p className="text-xs font-medium text-slate-400">No team assigned</p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-500">Overall Progress</span>
            <span className="text-sm font-bold text-slate-700">{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} size="md" />
        </div>
      </div>

      {/* ====== Timeline (daily completion view) ====== */}
      {(timelineDays.length > 0 || timelineByStatus.length > 0) && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Timeline</h2>
              <p className="text-xs text-slate-500 mt-0.5">Track work by day or by task status</p>
            </div>
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
          </div>

          <div className="p-5 space-y-4">
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
          </div>
        </div>
      )}
    </div>
  );
}
