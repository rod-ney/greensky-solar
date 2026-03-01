"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  List,
  ChartGantt,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Package,
  Undo2,
  Search,
} from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import ProgressBar from "@/components/ui/ProgressBar";
import Modal from "@/components/ui/Modal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { formatCurrency, formatDate } from "@/lib/format";
import { getTodayInManila } from "@/lib/date-utils";
import { toast } from "@/lib/toast";
import type { Task, TaskStatus, Priority, ProjectStatus, Project, Technician, InventoryItem, ProjectInventoryItem } from "@/types";

const taskStatusIcons: Record<TaskStatus, React.ReactNode> = {
  todo: <Circle className="h-4 w-4 text-slate-400" />,
  in_progress: <Clock className="h-4 w-4 text-blue-500" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  cancelled: <AlertCircle className="h-4 w-4 text-red-500" />,
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [clientUsers, setClientUsers] = useState<{ id: string; name: string; email: string }[]>([]);

  // ---- Task state (local, mutable copy of project.tasks) ----
  const [tasks, setTasks] = useState<Task[]>(() => project?.tasks ?? []);

  // ---- Project state (editable) ----
  const [projectData, setProjectData] = useState(() =>
    project
      ? {
          name: project.name,
          description: project.description,
          status: project.status,
          priority: project.priority,
          location: project.location,
          startDate: project.startDate,
          endDate: project.endDate,
          budget: project.budget,
          assignedTechnicians: [...project.assignedTechnicians],
          progressOverride: project.progress,
          useManualProgress: false,
        }
      : null
  );

  useEffect(() => {
    const load = async () => {
      try {
        const [projectRes, techsRes, usersRes, inventoryRes, projInvRes] = await Promise.all([
          fetch(`/api/projects/${params.id as string}`, { cache: "no-store" }),
          fetch("/api/technicians", { cache: "no-store" }),
          fetch("/api/users", { cache: "no-store" }),
          fetch("/api/inventory", { cache: "no-store" }),
          fetch(`/api/projects/${params.id as string}/inventory`, { cache: "no-store" }),
        ]);
        const loadedProject = projectRes.ok ? ((await projectRes.json()) as Project) : null;
        setProject(loadedProject);
        if (loadedProject) {
          setTasks(loadedProject.tasks);
          setProjectData({
            name: loadedProject.name,
            description: loadedProject.description,
            status: loadedProject.status,
            priority: loadedProject.priority,
            location: loadedProject.location,
            startDate: loadedProject.startDate,
            endDate: loadedProject.endDate,
            budget: loadedProject.budget,
            assignedTechnicians: [...loadedProject.assignedTechnicians],
            progressOverride: loadedProject.progress,
            useManualProgress: false,
          });
        } else {
          setTasks([]);
          setProjectData(null);
        }
        setTechnicians(techsRes.ok ? ((await techsRes.json()) as Technician[]) : []);
        const users = usersRes.ok ? ((await usersRes.json()) as { id: string; name: string; email: string; role: string }[]) : [];
        setClientUsers(users.filter((u) => u.role === "client").map((u) => ({ id: u.id, name: u.name, email: u.email })));
        setAvailableInventory(inventoryRes.ok ? ((await inventoryRes.json()) as InventoryItem[]) : []);
        setProjectInventory(projInvRes.ok ? ((await projInvRes.json()) as ProjectInventoryItem[]) : []);
      } catch {
        setProject(null);
        setTasks([]);
        setProjectData(null);
        setTechnicians([]);
      }
    };
    void load();
  }, [params.id]);

  // ---- Modal visibility ----
  const [showAddTask, setShowAddTask] = useState(false);
  const [showEditTask, setShowEditTask] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskFilter, setTaskFilter] = useState<TaskStatus | "all">("all");
  const [taskView, setTaskView] = useState<"list" | "gantt" | "calendar">("list");
  const [ganttScale, setGanttScale] = useState<"week" | "month">("month");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // ---- Add‑task form fields ----
  const [addTitle, setAddTitle] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addAssignedTo, setAddAssignedTo] = useState("");
  const [addPriority, setAddPriority] = useState<Priority>("medium");
  const [addDueDate, setAddDueDate] = useState("");

  // ---- Edit‑task form fields ----
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<TaskStatus>("todo");
  const [editPriority, setEditPriority] = useState<Priority>("medium");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  // ---- Warranty modal ----
  const [warrantyStartDate, setWarrantyStartDate] = useState("");
  const [warrantyEndDate, setWarrantyEndDate] = useState("");
  const [warrantyUserId, setWarrantyUserId] = useState("");

  // ---- Inventory allocation ----
  const [projectInventory, setProjectInventory] = useState<ProjectInventoryItem[]>([]);
  const [availableInventory, setAvailableInventory] = useState<InventoryItem[]>([]);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [allocSelectedItem, setAllocSelectedItem] = useState("");
  const [allocQuantity, setAllocQuantity] = useState(1);
  const [allocNotes, setAllocNotes] = useState("");
  const [allocSearch, setAllocSearch] = useState("");
  const [allocSubmitting, setAllocSubmitting] = useState(false);
  const [itemToReturn, setItemToReturn] = useState<{ inventoryItemId: string; itemName: string } | null>(null);
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [showEditProjectConfirm, setShowEditProjectConfirm] = useState(false);
  const [showEditTaskConfirm, setShowEditTaskConfirm] = useState(false);
  const [showWarrantyConfirm, setShowWarrantyConfirm] = useState(false);

  // ---- Derived values ----
  const filteredTasks = useMemo(
    () => (taskFilter === "all" ? tasks : tasks.filter((t) => t.status === taskFilter)),
    [tasks, taskFilter]
  );

  const taskCounts = useMemo(
    () => ({
      all: tasks.length,
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      cancelled: tasks.filter((t) => t.status === "cancelled").length,
    }),
    [tasks]
  );

  const computedProgress = useMemo(() => {
    if (tasks.length === 0) return projectData?.progressOverride ?? project?.progress ?? 0;
    return Math.round((tasks.filter((t) => t.status === "completed").length / tasks.length) * 100);
  }, [tasks, project?.progress, projectData?.progressOverride]);

  const displayProgress = projectData?.useManualProgress
    ? projectData.progressOverride
    : computedProgress;

  // ---- Gantt / Timeline date range ----
  const timelineRange = useMemo(() => {
    const start = projectData?.startDate ?? project?.startDate ?? "";
    const end = projectData?.endDate ?? project?.endDate ?? "";
    let min = start ? new Date(start).getTime() : Number.MAX_SAFE_INTEGER;
    let max = end ? new Date(end).getTime() : 0;
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
  }, [filteredTasks, project?.startDate, project?.endDate, projectData?.startDate, projectData?.endDate]);

  const getTaskBarPosition = useCallback(
    (task: Task) => {
      const start = new Date(task.createdAt).getTime();
      const end = new Date(task.dueDate).getTime();
      const left = ((start - timelineRange.start) / (timelineRange.end - timelineRange.start)) * 100;
      const width = ((end - start) / (timelineRange.end - timelineRange.start)) * 100;
      return { left: Math.max(0, left), width: Math.max(2, Math.min(100 - left, width)) };
    },
    [timelineRange]
  );

  const formatAxisDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });

  // ---- Gantt scale: week/month markers ----
  const ganttMarkers = useMemo(() => {
    const { start, end } = timelineRange;
    const markers: { label: string; left: number; width: number }[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    const total = end - start;

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

  // ---- Calendar view: days grid + tasks per day ----
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

  // ---- Handlers ----

  // Open the edit modal and seed form fields from the selected task
  const openEditModal = useCallback((task: Task) => {
    setSelectedTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditStatus(task.status);
    setEditPriority(task.priority);
    setEditAssignedTo(task.assignedTo);
    setEditDueDate(task.dueDate);
    setShowEditTask(true);
  }, []);

  // Save edits
  const handleSaveEdit = useCallback(async () => {
    if (!selectedTask || !editTitle.trim()) return;
    try {
      const response = await fetch(
        `/api/projects/${selectedTask.projectId}/tasks/${selectedTask.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editTitle.trim(),
            description: editDescription.trim(),
            status: editStatus,
            priority: editPriority,
            assignedTo: editAssignedTo,
            dueDate: editDueDate,
          }),
        }
      );
      const payload = (await response.json()) as Task | { error?: string };
      if (!response.ok) {
        toast.error(
          "error" in payload && payload.error
            ? payload.error
            : "Failed to update task."
        );
        return;
      }
      const updated = payload as Task;
      setTasks((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
      setShowEditTask(false);
      setSelectedTask(null);
      toast.success("Task updated.");
    } catch {
      toast.error("Failed to update task.");
    }
  }, [selectedTask, editTitle, editDescription, editStatus, editPriority, editAssignedTo, editDueDate]);

  // Add a new task
  const handleAddTask = useCallback(async () => {
    if (!addTitle.trim() || !project) return;
    try {
      const response = await fetch(`/api/projects/${project.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: addTitle.trim(),
          description: addDescription.trim(),
          priority: addPriority,
          assignedTo: addAssignedTo,
          dueDate: addDueDate || getTodayInManila(),
        }),
      });
      const payload = (await response.json()) as Task | { error?: string };
      if (!response.ok) {
        toast.error(
          "error" in payload && payload.error
            ? payload.error
            : "Failed to add task."
        );
        return;
      }
      const created = payload as Task;
      setTasks((prev) => [...prev, created]);
      // Reset form
      setAddTitle("");
      setAddDescription("");
      setAddAssignedTo("");
      setAddPriority("medium");
      setAddDueDate("");
      setShowAddTask(false);
      toast.success("Task added.");
    } catch {
      toast.error("Failed to add task.");
    }
  }, [addTitle, addDescription, addPriority, addAssignedTo, addDueDate, project]);

  // Open delete confirmation
  const openDeleteConfirm = useCallback((task: Task) => {
    setSelectedTask(task);
    setShowDeleteConfirm(true);
  }, []);

  // Confirm delete
  const handleDeleteTask = useCallback(async () => {
    if (!selectedTask) return;
    try {
      const response = await fetch(
        `/api/projects/${selectedTask.projectId}/tasks/${selectedTask.id}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        toast.error("Failed to delete task.");
        return;
      }
      setTasks((prev) => prev.filter((t) => t.id !== selectedTask.id));
      setShowDeleteConfirm(false);
      setSelectedTask(null);
      toast.success("Task deleted.");
    } catch {
      toast.error("Failed to delete task.");
    }
  }, [selectedTask]);

  // ---- Inventory handlers ----
  const filteredAvailableInventory = useMemo(() => {
    if (!allocSearch.trim()) return availableInventory;
    const q = allocSearch.toLowerCase();
    return availableInventory.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        i.category.replace(/_/g, " ").includes(q)
    );
  }, [availableInventory, allocSearch]);

  const inventoryTotalCost = useMemo(
    () => projectInventory.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    [projectInventory]
  );

  const handleAllocateInventory = useCallback(async () => {
    if (!allocSelectedItem || allocQuantity <= 0 || !project) return;
    setAllocSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ inventoryItemId: allocSelectedItem, quantity: allocQuantity, notes: allocNotes }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to allocate." }));
        toast.error(err.error || "Failed to allocate inventory.");
        return;
      }
      const updated = (await res.json()) as ProjectInventoryItem[];
      setProjectInventory(updated);
      const invRes = await fetch("/api/inventory", { cache: "no-store" });
      if (invRes.ok) setAvailableInventory((await invRes.json()) as InventoryItem[]);
      setShowAllocateModal(false);
      setAllocSelectedItem("");
      setAllocQuantity(1);
      setAllocNotes("");
      setAllocSearch("");
      toast.success("Inventory allocated successfully.");
    } catch {
      toast.error("Failed to allocate inventory.");
    } finally {
      setAllocSubmitting(false);
    }
  }, [allocSelectedItem, allocQuantity, allocNotes, project]);

  const handleReturnInventoryItem = useCallback(
    async (inventoryItemId: string, itemName: string) => {
      if (!project) return;
      setReturnSubmitting(true);
      try {
        const res = await fetch(`/api/projects/${project.id}/inventory/${inventoryItemId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          toast.error("Failed to return inventory item.");
          return;
        }
        setProjectInventory((prev) => prev.filter((i) => i.inventoryItemId !== inventoryItemId));
        const invRes = await fetch("/api/inventory", { cache: "no-store" });
        if (invRes.ok) setAvailableInventory((await invRes.json()) as InventoryItem[]);
        setItemToReturn(null);
        toast.success(`"${itemName}" returned to stock.`);
      } catch {
        toast.error("Failed to return inventory item.");
      } finally {
        setReturnSubmitting(false);
      }
    },
    [project]
  );

  // ---- Guard: project not found ----
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold text-slate-900">Project not found</h2>
        <p className="mt-1 text-sm text-slate-500">
          The project you are looking for does not exist.
        </p>
        <Link href="/projects" className="mt-4 text-sm font-medium text-brand hover:text-brand-dark">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push("/projects")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Projects
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-900 truncate">
          {project.name}
        </span>
      </div>

      {/* Project Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">
                {projectData?.name ?? project.name}
              </h1>
              <StatusBadge
                status={(projectData?.status ?? project.status) as ProjectStatus}
                size="md"
              />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {projectData?.description ?? project.description}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              icon={ShieldCheck}
              size="sm"
              onClick={() => {
                const end = project.endDate ?? getTodayInManila();
                setWarrantyStartDate(project.warrantyStartDate ?? end);
                setWarrantyEndDate(
                  project.warrantyEndDate ??
                    (() => {
                      const [y, m, d] = end.slice(0, 10).split("-").map(Number);
                      const dte = new Date(y, (m ?? 1) - 1, d ?? 1);
                      dte.setFullYear(dte.getFullYear() + 1);
                      return dte.toISOString().slice(0, 10);
                    })()
                );
                setWarrantyUserId(project.userId ?? "");
                setShowWarrantyModal(true);
              }}
            >
              Mark Warranty
            </Button>
            <Button
              variant="outline"
              icon={Edit2}
              size="sm"
              onClick={() => setShowEditProject(true)}
            >
              Edit
            </Button>
          </div>
        </div>

        {/* Project Details Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              Location
            </div>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {projectData?.location ?? project.location}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              Timeline
            </div>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {formatDate(projectData?.startDate ?? project.startDate)} —{" "}
              {formatDate(projectData?.endDate ?? project.endDate)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <DollarSign className="h-3.5 w-3.5" />
              Budget
            </div>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {formatCurrency(projectData?.budget ?? project.budget)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Users className="h-3.5 w-3.5" />
              Team
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {(projectData?.assignedTechnicians ?? project.assignedTechnicians).length > 0 ? (
                (projectData?.assignedTechnicians ?? project.assignedTechnicians).map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand"
                  >
                    {(technicians.find((t) => t.id === id)?.name ?? "Unknown").split(" ")[0]}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-400">No one assigned</span>
              )}
            </div>
          </div>
        </div>

        {/* Progress (computed from task statuses) */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Overall Progress</span>
            <span className="text-sm font-bold text-brand">{displayProgress}%</span>
          </div>
          <ProgressBar value={displayProgress} size="md" showLabel={false} />
        </div>
      </div>

      {/* Task Manager */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Tasks</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {tasks.length} task{tasks.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-white">
              <button
                onClick={() => setTaskView("list")}
                className={`flex h-9 w-9 items-center justify-center rounded-l-lg ${
                  taskView === "list" ? "bg-brand text-white" : "text-slate-400 hover:text-slate-600"
                }`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTaskView("gantt")}
                className={`flex h-9 w-9 items-center justify-center border-l border-slate-200 ${
                  taskView === "gantt" ? "bg-brand text-white" : "text-slate-400 hover:text-slate-600"
                }`}
                title="Gantt chart"
              >
                <ChartGantt className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTaskView("calendar")}
                className={`flex h-9 w-9 items-center justify-center rounded-r-lg border-l border-slate-200 ${
                  taskView === "calendar" ? "bg-brand text-white" : "text-slate-400 hover:text-slate-600"
                }`}
                title="Calendar timeline"
              >
                <CalendarDays className="h-4 w-4" />
              </button>
            </div>
            <Button icon={Plus} size="sm" onClick={() => setShowAddTask(true)}>
              Add Task
            </Button>
          </div>
        </div>

        {/* Task Filters */}
        <div className="flex gap-2 border-b border-slate-100 px-5 py-3 overflow-x-auto">
          {(["all", "todo", "in_progress", "completed", "cancelled"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setTaskFilter(status)}
              className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                taskFilter === status
                  ? "bg-brand text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {status === "all"
                ? "All"
                : status === "in_progress"
                ? "In Progress"
                : status.charAt(0).toUpperCase() + status.slice(1)}{" "}
              ({taskCounts[status]})
            </button>
          ))}
        </div>

        {/* Task Content (List / Gantt / Calendar) */}
        {taskView === "list" && (
          <div className="divide-y divide-slate-100">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                No tasks found
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex-shrink-0">
                    {taskStatusIcons[task.status]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {task.title}
                      </p>
                    <StatusBadge status={task.priority} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {task.description}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {task.assignedTo
                        ? technicians.find((t) => t.id === task.assignedTo)?.name ?? "Unknown"
                        : "Unassigned"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(task.dueDate)}
                    </span>
                  </div>
                  <StatusBadge status={task.status} />
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(task)}
                      className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="Edit task"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(task)}
                      className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500"
                      title="Delete task"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {taskView === "gantt" && (
          <div className="overflow-x-auto">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                No tasks found. Add tasks to view the Gantt chart.
              </div>
            ) : (
              <div className="min-w-[600px] p-5">
                {/* Gantt scale toggle + header */}
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
                {/* Gantt rows */}
                <div className="space-y-2">
                  {filteredTasks.map((task) => {
                    const { left, width } = getTaskBarPosition(task);
                    const barColor =
                      task.status === "completed"
                        ? "bg-green-500"
                        : task.status === "in_progress"
                        ? "bg-brand"
                        : task.status === "cancelled"
                        ? "bg-red-400"
                        : "bg-slate-300";
                    return (
                      <div
                        key={task.id}
                        className="grid gap-2 items-center group"
                        style={{ gridTemplateColumns: "180px 1fr" }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-slate-900 truncate" title={task.title}>
                            {task.title}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => openEditModal(task)}
                              className="p-0.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                              title="Edit"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => openDeleteConfirm(task)}
                              className="p-0.5 rounded text-slate-400 hover:bg-red-50 hover:text-red-500"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="relative h-8 rounded bg-slate-100 overflow-hidden">
                          <div
                            className={`absolute top-1 bottom-1 rounded ${barColor} min-w-[4px]`}
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                            }}
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
                <div
                  key={label}
                  className="py-1.5 text-center text-xs font-medium text-slate-500"
                >
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
                    className={`min-h-[80px] bg-white p-1 ${
                      !isCurrentMonth ? "bg-slate-50" : ""
                    }`}
                  >
                    <div
                      className={`text-xs font-medium mb-1 flex items-center ${
                        !isCurrentMonth ? "text-slate-300" : isToday ? "text-brand" : "text-slate-700"
                      } ${isToday ? "rounded-full bg-brand/10 w-6 h-6 justify-center" : ""}`}
                    >
                      {d ? d.getDate() : ""}
                    </div>
                    <div className="flex flex-col gap-1 min-h-[18px]">
                      {dayTasks.map((task) => {
                        const barColor =
                          task.status === "completed"
                            ? "bg-green-500"
                            : task.status === "in_progress"
                            ? "bg-brand"
                        : task.status === "cancelled"
                            ? "bg-red-400"
                            : "bg-slate-400";
                        return (
                          <button
                            key={task.id}
                            onClick={() => openEditModal(task)}
                            className={`w-full text-left px-1.5 py-1 rounded text-[10px] font-medium text-white truncate block ${barColor} hover:opacity-90 shadow-sm border border-white/40`}
                            title={`${task.title} (${formatDate(task.createdAt)} – ${formatDate(task.dueDate)})`}
                          >
                            {task.title}
                          </button>
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

      {/* Timeline / Progress Indicator (shown in list view only) */}
      {taskView === "list" && (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Timeline</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No tasks yet. Add a task above to see the timeline.</p>
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-slate-200" />
            {tasks.map((task) => (
              <div key={task.id} className="relative mb-6 last:mb-0">
                <div
                  className={`absolute left-[-17px] top-1 h-3 w-3 rounded-full border-2 ${
                    task.status === "completed"
                      ? "border-green-500 bg-green-500"
                      : task.status === "in_progress"
                      ? "border-blue-500 bg-blue-500"
                      : "border-slate-300 bg-white"
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{task.title}</p>
                    <StatusBadge status={task.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Due: {formatDate(task.dueDate)} · Assigned to:{" "}
                    {task.assignedTo ? (technicians.find((t) => t.id === task.assignedTo)?.name ?? "Unknown") : "Unassigned"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* ====== INVENTORY SECTION ====== */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-brand" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Inventory
                {projectInventory.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                    {projectInventory.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Materials allocated to this project
              </p>
            </div>
          </div>
          {(projectData?.status ?? project.status) !== "cancelled" && (
            <Button
              variant="primary"
              icon={Plus}
              size="sm"
              onClick={() => setShowAllocateModal(true)}
            >
              Allocate Items
            </Button>
          )}
        </div>

        {(projectData?.status ?? project.status) === "cancelled" && projectInventory.length === 0 && (
          <div className="flex items-center gap-2 bg-amber-50 px-5 py-3 text-sm text-amber-700 border-b border-amber-100">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            This project was cancelled. All allocated inventory has been returned to stock.
          </div>
        )}

        <div className="p-5">
          {projectInventory.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">No inventory items allocated yet.</p>
              {(projectData?.status ?? project.status) !== "cancelled" && (
                <button
                  onClick={() => setShowAllocateModal(true)}
                  className="mt-2 text-sm font-medium text-brand hover:text-brand-dark"
                >
                  Allocate inventory items
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wider text-slate-500">
                      <th className="py-2 pr-3">Item</th>
                      <th className="py-2 pr-3">SKU</th>
                      <th className="py-2 pr-3">Category</th>
                      <th className="py-2 pr-3 text-right">Qty</th>
                      <th className="py-2 pr-3 text-right">Unit Price</th>
                      <th className="py-2 pr-3 text-right">Total</th>
                      <th className="py-2 pr-3">Allocated By</th>
                      <th className="py-2 pr-3">Notes</th>
                      {(projectData?.status ?? project.status) !== "cancelled" && (
                        <th className="py-2 w-16"></th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {projectInventory.map((item) => (
                      <tr key={item.id} className="border-b border-slate-50 last:border-b-0">
                        <td className="py-2.5 pr-3 font-medium text-slate-900">{item.itemName}</td>
                        <td className="py-2.5 pr-3 text-slate-500 font-mono text-xs">{item.itemSku}</td>
                        <td className="py-2.5 pr-3">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 capitalize">
                            {item.itemCategory.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-right font-medium">{item.quantity} {item.unit}</td>
                        <td className="py-2.5 pr-3 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-2.5 pr-3 text-right font-medium text-slate-900">{formatCurrency(item.quantity * item.unitPrice)}</td>
                        <td className="py-2.5 pr-3 text-slate-500 text-xs">{item.allocatedByName || "—"}</td>
                        <td className="py-2.5 pr-3 text-slate-500 text-xs max-w-[150px] truncate" title={item.notes}>{item.notes || "—"}</td>
                        {(projectData?.status ?? project.status) !== "cancelled" && (
                          <td className="py-2.5">
                            <button
                              onClick={() => setItemToReturn({ inventoryItemId: item.inventoryItemId, itemName: item.itemName })}
                              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                              title="Return to stock"
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                              Return
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-end border-t border-slate-100 pt-3">
                <div className="text-sm">
                  <span className="text-slate-500">Total inventory cost:</span>{" "}
                  <span className="font-bold text-slate-900">{formatCurrency(inventoryTotalCost)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ====== RETURN INVENTORY CONFIRMATION ====== */}
      <ConfirmModal
        isOpen={!!itemToReturn}
        onClose={() => setItemToReturn(null)}
        onConfirm={async () => {
          if (itemToReturn) {
            await handleReturnInventoryItem(itemToReturn.inventoryItemId, itemToReturn.itemName);
          }
        }}
        title="Return Inventory"
        message={
          itemToReturn ? (
            <>
              Are you sure you want to return all allocated{" "}
              <span className="font-semibold text-slate-900">&ldquo;{itemToReturn.itemName}&rdquo;</span>{" "}
              back to stock?
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Return to Stock"
        variant="danger"
        isLoading={returnSubmitting}
      />

      {/* ====== ALLOCATE INVENTORY MODAL ====== */}
      <Modal
        isOpen={showAllocateModal}
        onClose={() => {
          setShowAllocateModal(false);
          setAllocSelectedItem("");
          setAllocQuantity(1);
          setAllocNotes("");
          setAllocSearch("");
        }}
        title="Allocate Inventory to Project"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleAllocateInventory();
          }}
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Search Items
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={allocSearch}
                onChange={(e) => setAllocSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                placeholder="Search by name, SKU, or category..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select Item <span className="text-red-500">*</span>
            </label>
            <select
              value={allocSelectedItem}
              onChange={(e) => {
                setAllocSelectedItem(e.target.value);
                setAllocQuantity(1);
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              required
            >
              <option value="">Choose an item...</option>
              {filteredAvailableInventory
                .filter((i) => i.quantity > 0)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku}) — {item.quantity} {item.unit} available
                  </option>
                ))}
            </select>
          </div>
          {allocSelectedItem && (() => {
            const sel = availableInventory.find((i) => i.id === allocSelectedItem);
            if (!sel) return null;
            const alreadyAllocated = projectInventory.find((pi) => pi.inventoryItemId === allocSelectedItem);
            return (
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Available stock:</span>
                  <span className="font-medium text-slate-900">{sel.quantity} {sel.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unit price:</span>
                  <span className="font-medium text-slate-900">{formatCurrency(sel.unitPrice)}</span>
                </div>
                {alreadyAllocated && (
                  <div className="flex justify-between text-amber-600">
                    <span>Already allocated to this project:</span>
                    <span className="font-medium">{alreadyAllocated.quantity} {sel.unit}</span>
                  </div>
                )}
              </div>
            );
          })()}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              max={(() => {
                const sel = availableInventory.find((i) => i.id === allocSelectedItem);
                if (!sel) return 999;
                const existing = projectInventory.find((pi) => pi.inventoryItemId === allocSelectedItem);
                return sel.quantity + (existing?.quantity ?? 0);
              })()}
              value={allocQuantity}
              onChange={(e) => setAllocQuantity(Math.max(1, Number(e.target.value)))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes / Reason
            </label>
            <textarea
              rows={2}
              value={allocNotes}
              onChange={(e) => setAllocNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
              placeholder="e.g., Main roof installation panels"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAllocateModal(false);
                setAllocSelectedItem("");
                setAllocQuantity(1);
                setAllocNotes("");
                setAllocSearch("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={allocSubmitting || !allocSelectedItem}>
              {allocSubmitting ? "Allocating..." : "Allocate"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ====== ADD TASK MODAL ====== */}
      <Modal
        isOpen={showAddTask}
        onClose={() => setShowAddTask(false)}
        title="Add New Task"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleAddTask();
          }}
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              placeholder="Enter task title"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={addDescription}
              onChange={(e) => setAddDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
              placeholder="Task description..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Assign To
              </label>
              <select
                value={addAssignedTo}
                onChange={(e) => setAddAssignedTo(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="">Select technician</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={addPriority}
                onChange={(e) => setAddPriority(e.target.value as Priority)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={addDueDate}
              onChange={(e) => setAddDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowAddTask(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Task</Button>
          </div>
        </form>
      </Modal>

      {/* ====== CONFIRM EDIT TASK ====== */}
      <ConfirmModal
        isOpen={showEditTaskConfirm}
        onClose={() => setShowEditTaskConfirm(false)}
        onConfirm={async () => {
          await handleSaveEdit();
          setShowEditTaskConfirm(false);
        }}
        title="Save Changes"
        message={
          selectedTask ? (
            <>
              Are you sure you want to save changes to{" "}
              <span className="font-semibold text-slate-900">{selectedTask.title}</span>?
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Save Changes"
        variant="primary"
      />

      {/* ====== EDIT TASK MODAL ====== */}
      <Modal
        isOpen={showEditTask}
        onClose={() => {
          setShowEditTask(false);
          setSelectedTask(null);
        }}
        title="Edit Task"
      >
        {selectedTask && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setShowEditTaskConfirm(true);
            }}
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Task Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Priority
                </label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as Priority)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Assign To
                </label>
                <select
                  value={editAssignedTo}
                  onChange={(e) => setEditAssignedTo(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  <option value="">Unassigned</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name}
                    </option>
                  ))}
                </select>
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
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setShowEditTask(false);
                  setSelectedTask(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ====== CONFIRM MARK WARRANTY ====== */}
      <ConfirmModal
        isOpen={showWarrantyConfirm}
        onClose={() => setShowWarrantyConfirm(false)}
        onConfirm={async () => {
          if (!project || !warrantyStartDate || !warrantyEndDate) return;
          try {
            const response = await fetch(`/api/projects/${project.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                warrantyStartDate: warrantyStartDate,
                warrantyEndDate: warrantyEndDate,
                userId: warrantyUserId || null,
              }),
            });
            const payload = (await response.json()) as Project | { error?: string };
            if (!response.ok) {
              toast.error("error" in payload && payload.error ? payload.error : "Failed to update warranty.");
              return;
            }
            const updated = payload as Project;
            setProject(updated);
            setShowWarrantyModal(false);
            setShowWarrantyConfirm(false);
            toast.success("Warranty marked successfully.");
          } catch {
            toast.error("Failed to update warranty.");
          }
        }}
        title="Save Warranty"
        message="Are you sure you want to save these warranty details?"
        confirmLabel="Save Warranty"
        variant="primary"
      />

      {/* ====== MARK WARRANTY MODAL ====== */}
      <Modal
        isOpen={showWarrantyModal}
        onClose={() => setShowWarrantyModal(false)}
        title="Mark Warranty"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!project || !warrantyStartDate || !warrantyEndDate) {
              toast.error("Warranty start and end dates are required.");
              return;
            }
            setShowWarrantyConfirm(true);
          }}
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Warranty Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={warrantyStartDate}
              onChange={(e) => setWarrantyStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Warranty End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={warrantyEndDate}
              onChange={(e) => setWarrantyEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              required
            />
          </div>
          {clientUsers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Client User (for warranty portal)
              </label>
              <select
                value={warrantyUserId}
                onChange={(e) => setWarrantyUserId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="">— None —</option>
                {clientUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
              <p className="mt-0.5 text-xs text-slate-500">
                Assign this project to a client account so they can see it in their warranty page
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowWarrantyModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Warranty</Button>
          </div>
        </form>
      </Modal>

      {/* ====== CONFIRM EDIT PROJECT ====== */}
      <ConfirmModal
        isOpen={showEditProjectConfirm}
        onClose={() => setShowEditProjectConfirm(false)}
        onConfirm={async () => {
          if (!projectData || !project) return;
          try {
            const progressToSave = projectData.useManualProgress
              ? projectData.progressOverride
              : computedProgress;
            const response = await fetch(`/api/projects/${project.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: projectData.name,
                description: projectData.description,
                status: projectData.status,
                priority: projectData.priority,
                location: projectData.location,
                startDate: projectData.startDate,
                endDate: projectData.endDate,
                budget: projectData.budget,
                progress: progressToSave,
                assignedTechnicians: projectData.assignedTechnicians,
              }),
            });
            const payload = (await response.json()) as Project | { error?: string };
            if (!response.ok) {
              toast.error(
                "error" in payload && payload.error
                  ? payload.error
                  : "Failed to update project."
              );
              return;
            }
            const updated = payload as Project;
            setProject(updated);
            setProjectData({
              name: updated.name,
              description: updated.description,
              status: updated.status,
              priority: updated.priority,
              location: updated.location,
              startDate: updated.startDate,
              endDate: updated.endDate,
              budget: updated.budget,
              assignedTechnicians: [...updated.assignedTechnicians],
              progressOverride: updated.progress,
              useManualProgress: false,
            });
            setShowEditProject(false);
            setShowEditProjectConfirm(false);
            toast.success("Project updated successfully.");
          } catch {
            toast.error("Failed to update project.");
          }
        }}
        title="Save Changes"
        message={
          projectData ? (
            <>
              Are you sure you want to save changes to{" "}
              <span className="font-semibold text-slate-900">{projectData.name}</span>?
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Save Changes"
        variant="primary"
      />

      {/* ====== EDIT PROJECT MODAL ====== */}
      <Modal
        isOpen={showEditProject}
        onClose={() => setShowEditProject(false)}
        title="Edit Project"
        size="lg"
      >
        {projectData && project && (
          <form
            className="flex flex-col max-h-[95vh]"
            onSubmit={(e) => {
              e.preventDefault();
              setShowEditProjectConfirm(true);
            }}
          >
            <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-0">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-0.5">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={projectData.name}
                onChange={(e) =>
                  setProjectData((p) => (p ? { ...p, name: e.target.value } : null))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-0.5">
                Description
              </label>
              <textarea
                rows={2}
                value={projectData.description}
                onChange={(e) =>
                  setProjectData((p) => (p ? { ...p, description: e.target.value } : null))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">
                  Status
                </label>
                <select
                  value={projectData.status}
                  onChange={(e) =>
                    setProjectData((p) =>
                      p ? { ...p, status: e.target.value as ProjectStatus } : null
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  <option value="pending">Pending</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">
                  Priority
                </label>
                <select
                  value={projectData.priority}
                  onChange={(e) =>
                    setProjectData((p) =>
                      p ? { ...p, priority: e.target.value as Priority } : null
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-0.5">
                Location
              </label>
              <input
                type="text"
                value={projectData.location}
                onChange={(e) =>
                  setProjectData((p) => (p ? { ...p, location: e.target.value } : null))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={projectData.startDate}
                  onChange={(e) =>
                    setProjectData((p) => (p ? { ...p, startDate: e.target.value } : null))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={projectData.endDate}
                  onChange={(e) =>
                    setProjectData((p) => (p ? { ...p, endDate: e.target.value } : null))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">
                  Budget
                </label>
                <input
                  type="number"
                  min={0}
                  value={projectData.budget}
                  onChange={(e) =>
                    setProjectData((p) =>
                      p ? { ...p, budget: Number(e.target.value) || 0 } : null
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">
                  Team Members
                </label>
                <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 p-2 max-h-20 overflow-y-auto">
                  {technicians.map((tech) => {
                    const isSelected = projectData.assignedTechnicians.includes(tech.id);
                    return (
                      <label
                        key={tech.id}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-brand text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            setProjectData((p) => {
                              if (!p) return null;
                              const next = e.target.checked
                                ? [...p.assignedTechnicians, tech.id]
                                : p.assignedTechnicians.filter((id) => id !== tech.id);
                              return { ...p, assignedTechnicians: next };
                            });
                          }}
                          className="sr-only"
                        />
                        {tech.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1">
                <input
                  type="checkbox"
                  checked={projectData.useManualProgress}
                  onChange={(e) =>
                    setProjectData((p) =>
                      p ? { ...p, useManualProgress: e.target.checked } : null
                    )
                  }
                  className="rounded border-slate-300"
                />
                Use manual progress
              </label>
              {projectData.useManualProgress && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Progress</span>
                    <span className="font-semibold text-brand">
                      {projectData.progressOverride}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={projectData.progressOverride}
                    onChange={(e) =>
                      setProjectData((p) =>
                        p ? { ...p, progressOverride: Number(e.target.value) } : null
                      )
                    }
                    className="w-full h-2 rounded-lg appearance-none bg-slate-200 accent-brand"
                  />
                </div>
              )}
              {!projectData.useManualProgress && (
                <p className="text-xs text-slate-500">
                  Progress is auto-calculated from completed tasks ({computedProgress}%)
                </p>
              )}
            </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-200 flex-shrink-0">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowEditProject(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ====== DELETE CONFIRMATION MODAL ====== */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedTask(null);
        }}
        title="Delete Task"
        size="sm"
      >
        {selectedTask && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">&ldquo;{selectedTask.title}&rdquo;</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedTask(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteTask}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
