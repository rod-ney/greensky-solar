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
  List,
  ChartGantt,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import ProgressBar from "@/components/ui/ProgressBar";
import { formatDate } from "@/lib/format";
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

type TaskView = "list" | "gantt" | "calendar";
type GanttScale = "week" | "month";
type TaskFilter = ClientTaskStatus | "all";
type TimelineCategory = "day" | "status";

export default function ClientProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<ClientProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Task view state
  const [taskView, setTaskView] = useState<TaskView>("list");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [timelineCategory, setTimelineCategory] = useState<TimelineCategory>("day");
  const [ganttScale, setGanttScale] = useState<GanttScale>("month");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/client/projects/${projectId}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as ClientProjectDetail;
          setProject(data);
          // Set calendar to project start month
          if (data.startDate) {
            const d = new Date(data.startDate);
            setCalendarMonth({ year: d.getFullYear(), month: d.getMonth() });
          }
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

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    if (!project) return [];
    return taskFilter === "all"
      ? project.tasks
      : project.tasks.filter((t) => t.status === taskFilter);
  }, [project, taskFilter]);

  const taskCounts = useMemo(() => {
    if (!project) return { all: 0, todo: 0, in_progress: 0, completed: 0, cancelled: 0 };
    const counts: Record<string, number> = { all: project.tasks.length };
    for (const t of project.tasks) {
      counts[t.status] = (counts[t.status] ?? 0) + 1;
    }
    return counts;
  }, [project]);

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
      .map(([dateKey, tasks], index) => ({
        dateKey,
        dayNumber: index + 1,
        tasks: tasks.sort((a, b) => a.title.localeCompare(b.title)),
      }));
  }, [filteredTasks]);

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

  // ---- Gantt / Timeline date range ----
  const timelineRange = useMemo(() => {
    if (!project) return { start: 0, end: 1, totalDays: 1 };
    let min = project.startDate ? new Date(project.startDate).getTime() : Number.MAX_SAFE_INTEGER;
    let max = project.endDate ? new Date(project.endDate).getTime() : 0;
    filteredTasks.forEach((t) => {
      const creation = new Date(t.createdAt).getTime();
      const due = new Date(t.dueDate).getTime();
      min = Math.min(min, creation, due);
      max = Math.max(max, creation, due);
    });
    if (min > max) {
      const today = new Date();
      min = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
      max = new Date(today.getFullYear(), today.getMonth() + 2, 0).getTime();
    }
    return { start: min, end: max, totalDays: Math.ceil((max - min) / (24 * 60 * 60 * 1000)) || 1 };
  }, [project, filteredTasks]);

  const getTaskBarPosition = useCallback(
    (task: ClientTask) => {
      const start = new Date(task.createdAt).getTime();
      const end = new Date(task.dueDate).getTime();
      const range = timelineRange.end - timelineRange.start;
      if (range === 0) return { left: 0, width: 100 };
      const left = ((start - timelineRange.start) / range) * 100;
      const width = ((end - start) / range) * 100;
      return { left: Math.max(0, left), width: Math.max(2, Math.min(100 - Math.max(0, left), width)) };
    },
    [timelineRange]
  );

  const formatAxisDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });

  // Gantt scale markers
  const ganttMarkers = useMemo(() => {
    const { start, end } = timelineRange;
    const markers: { label: string; left: number; width: number }[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    const total = end - start;
    if (total === 0) return markers;

    if (ganttScale === "month") {
      let d = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (d.getTime() <= endDate.getTime()) {
        const monthStart = d.getTime();
        d = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const monthEnd = Math.min(d.getTime() + 86400000, end);
        d = new Date(d.getTime() + 86400000);
        markers.push({
          label: new Date(monthStart).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          left: ((monthStart - start) / total) * 100,
          width: ((monthEnd - monthStart) / total) * 100,
        });
      }
    } else {
      const d = new Date(startDate);
      d.setDate(d.getDate() - d.getDay());
      while (d.getTime() < endDate.getTime()) {
        const weekStart = d.getTime();
        const weekEnd = Math.min(weekStart + 7 * 86400000, end);
        markers.push({
          label: new Date(weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          left: ((weekStart - start) / total) * 100,
          width: ((weekEnd - weekStart) / total) * 100,
        });
        d.setDate(d.getDate() + 7);
      }
    }
    return markers;
  }, [timelineRange, ganttScale]);

  // Calendar view helpers
  const calendarDays = useMemo(() => {
    const { year, month } = calendarMonth;
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = first.getDay();
    const daysInMonth = last.getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  }, [calendarMonth]);

  const getTasksForDate = useCallback(
    (d: Date) => {
      const dateStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }).slice(0, 10);
      return filteredTasks.filter((t) => {
        const start = t.createdAt <= t.dueDate ? t.createdAt : t.dueDate;
        const end = t.createdAt <= t.dueDate ? t.dueDate : t.createdAt;
        return dateStr >= start && dateStr <= end;
      });
    },
    [filteredTasks]
  );

  const weekDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getBarColor = (status: ClientTaskStatus) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in_progress": return "bg-brand";
      case "cancelled": return "bg-red-400";
      default: return "bg-slate-300";
    }
  };

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

      {/* ====== Task Manager Section ====== */}
      <div className="rounded-2xl border border-slate-200 bg-white">
        {/* Task Header */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-brand" />
            <h2 className="text-base font-semibold text-slate-900">
              Tasks
              {project.tasks.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                  {project.tasks.length}
                </span>
              )}
            </h2>
          </div>

          {/* View Switcher */}
          <div className="flex rounded-lg border border-slate-200 bg-white">
            {([
              { key: "list" as TaskView, icon: List, label: "List" },
              { key: "gantt" as TaskView, icon: ChartGantt, label: "Gantt" },
              { key: "calendar" as TaskView, icon: CalendarDays, label: "Calendar" },
            ] as const).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setTaskView(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg border-r border-slate-200 last:border-r-0 ${
                  taskView === key
                    ? "bg-brand text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Task Filter Chips */}
        <div className="flex flex-wrap gap-2 px-5 pt-4 pb-2">
          {(["all", "todo", "in_progress", "completed", "cancelled"] as const).map((s) => {
            const count = taskCounts[s] ?? 0;
            const label = s === "all" ? "All" : TASK_STATUS_LABELS[s] ?? s;
            return (
              <button
                key={s}
                onClick={() => setTaskFilter(s)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium border transition-all ${
                  taskFilter === s
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                }`}
              >
                {label} <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        {/* ==== LIST VIEW ==== */}
        {taskView === "list" && (
          <div className="p-5 space-y-2">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">No tasks found</div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3 hover:bg-slate-50/50 transition-colors"
                >
                  <span className="flex-shrink-0">{taskStatusIcons[task.status]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-900">{task.title}</p>
                      <StatusBadge status={task.priority} size="sm" />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due: {formatDate(task.dueDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {task.assignedToName}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={task.status} size="sm" />
                </div>
              ))
            )}
          </div>
        )}

        {/* ==== GANTT VIEW ==== */}
        {taskView === "gantt" && (
          <div className="overflow-x-auto">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                No tasks found to display in Gantt chart
              </div>
            ) : (
              <div className="min-w-[600px] p-5">
                {/* Scale toggle + date range */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex rounded-lg border border-slate-200 bg-white">
                    <button
                      onClick={() => setGanttScale("week")}
                      className={`px-2.5 py-1 text-xs font-medium rounded-l-lg ${
                        ganttScale === "week" ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Week
                    </button>
                    <button
                      onClick={() => setGanttScale("month")}
                      className={`px-2.5 py-1 text-xs font-medium rounded-r-lg border-l border-slate-200 ${
                        ganttScale === "month" ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Month
                    </button>
                  </div>
                  <span className="text-xs text-slate-500">
                    {formatAxisDate(timelineRange.start)} – {formatAxisDate(timelineRange.end)}
                  </span>
                </div>

                {/* Column headers */}
                <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "180px 1fr" }}>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Task</div>
                  <div className="relative h-6">
                    {ganttMarkers.map((m, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 flex items-center justify-center text-xs text-slate-500 border-r border-slate-200 last:border-r-0"
                        style={{ left: `${m.left}%`, width: `${m.width}%` }}
                      >
                        {m.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Task rows */}
                <div className="space-y-2">
                  {filteredTasks.map((task) => {
                    const { left, width } = getTaskBarPosition(task);
                    const barColor = getBarColor(task.status);
                    return (
                      <div
                        key={task.id}
                        className="grid gap-2 items-center"
                        style={{ gridTemplateColumns: "180px 1fr" }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex-shrink-0">{taskStatusIcons[task.status]}</span>
                          <span className="text-sm font-medium text-slate-900 truncate" title={task.title}>
                            {task.title}
                          </span>
                        </div>
                        <div className="relative h-8 rounded bg-slate-100 overflow-hidden">
                          <div
                            className={`absolute top-1 bottom-1 rounded ${barColor} min-w-[4px]`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={`${formatDate(task.createdAt)} – ${formatDate(task.dueDate)}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==== CALENDAR VIEW ==== */}
        {taskView === "calendar" && (
          <div className="p-5">
            {/* Calendar header + month nav */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">
                {new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setCalendarMonth((prev) =>
                      prev.month === 0
                        ? { year: prev.year - 1, month: 11 }
                        : { ...prev, month: prev.month - 1 }
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() =>
                    setCalendarMonth((prev) =>
                      prev.month === 11
                        ? { year: prev.year + 1, month: 0 }
                        : { ...prev, month: prev.month + 1 }
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-px mb-1">
              {weekDayLabels.map((label) => (
                <div key={label} className="py-1.5 text-center text-xs font-medium text-slate-500">
                  {label}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden">
              {calendarDays.map((d, i) => {
                const isCurrentMonth = d !== null;
                const today = new Date();
                const isToday =
                  d &&
                  d.getDate() === today.getDate() &&
                  d.getMonth() === today.getMonth() &&
                  d.getFullYear() === today.getFullYear();
                const dayTasks = d ? getTasksForDate(d) : [];
                return (
                  <div
                    key={i}
                    className={`min-h-[80px] bg-white p-1 ${!isCurrentMonth ? "bg-slate-50" : ""}`}
                  >
                    <div
                      className={`text-xs font-medium mb-1 flex items-center ${
                        !isCurrentMonth
                          ? "text-slate-300"
                          : isToday
                          ? "text-brand"
                          : "text-slate-700"
                      } ${isToday ? "rounded-full bg-brand/10 w-6 h-6 justify-center" : ""}`}
                    >
                      {d ? d.getDate() : ""}
                    </div>
                    <div className="flex flex-col gap-1 min-h-[18px]">
                      {dayTasks.map((task) => {
                        const barColor = getBarColor(task.status);
                        return (
                          <div
                            key={task.id}
                            className={`w-full text-left px-1.5 py-1 rounded text-[10px] font-medium text-white truncate block ${barColor} shadow-sm border border-white/40`}
                            title={`${task.title} (${formatDate(task.createdAt)} – ${formatDate(task.dueDate)})`}
                          >
                            {task.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ====== Timeline (daily completion view) — shown in list view only ====== */}
      {taskView === "list" && (timelineDays.length > 0 || timelineByStatus.length > 0) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">Timeline</h2>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
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

          <div className="space-y-4">
            {timelineCategory === "day" &&
              timelineDays.map((day) => (
                <div key={day.dateKey} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {new Date(`${day.dateKey}T00:00:00`).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    <span className="text-slate-500 font-medium">(Day {day.dayNumber})</span>
                  </p>
                  <div className="mt-3 space-y-2">
                    {day.tasks.map((task, taskIndex) => (
                      <div
                        key={`${day.dateKey}-${task.id}-${taskIndex}`}
                        className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">{task.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Assigned to: {task.assignedToName}
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
                <div key={group.status} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">{group.label}</p>
                    <span className="text-xs font-medium text-slate-500">{group.tasks.length} task(s)</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {group.tasks.map((task, taskIndex) => (
                      <div
                        key={`${group.status}-${task.id}-${taskIndex}`}
                        className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">{task.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
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
