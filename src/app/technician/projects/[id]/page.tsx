"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Edit2,
  Filter,
  MapPin,
  Users,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import ProgressBar from "@/components/ui/ProgressBar";
import { formatDate } from "@/lib/format";
import { toast } from "@/lib/toast";
import type { Task, TaskStatus, Project, Technician } from "@/types";

export default function TechnicianProjectDetailPage() {
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [showEditTask, setShowEditTask] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [saveSubmitting, setSaveSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editStatus, setEditStatus] = useState<TaskStatus>("todo");
  const [myDayFilter, setMyDayFilter] = useState("all");
  const [allDayFilter, setAllDayFilter] = useState("all");
  const [showMyDayMenu, setShowMyDayMenu] = useState(false);
  const [showAllDayMenu, setShowAllDayMenu] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [projectRes, techRes] = await Promise.all([
          fetch(`/api/projects/${params.id as string}`, { cache: "no-store" }),
          fetch("/api/profile/technician", { cache: "no-store" }),
        ]);
        const loadedProject = projectRes.ok ? ((await projectRes.json()) as Project) : null;
        setProject(loadedProject);
        setTasks(loadedProject?.tasks ?? []);
        const techData = techRes.ok ? ((await techRes.json()) as Technician | null) : null;
        setTechnicians(techData ? [techData] : []);
      } catch {
        setProject(null);
        setTasks([]);
        setTechnicians([]);
      }
    };
    void load();
  }, [params.id]);

  const tech = technicians[0] ?? null;

  const myTasks = useMemo(
    () => tasks.filter((t) => (tech ? t.assignedTo === tech.id : false)),
    [tasks, tech]
  );

  const groupTasksByDay = useMemo(
    () =>
      (items: Task[]) =>
        Array.from(
          items.reduce<Map<string, Task[]>>((acc, task) => {
            const key = task.dueDate.slice(0, 10);
            const bucket = acc.get(key) ?? [];
            bucket.push(task);
            acc.set(key, bucket);
            return acc;
          }, new Map())
        )
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([dateKey, dayTasks]) => ({
            dateKey,
            tasks: dayTasks.sort((a, b) => a.title.localeCompare(b.title)),
          })),
    []
  );

  const myTasksByDay = useMemo(() => groupTasksByDay(myTasks), [groupTasksByDay, myTasks]);
  const allTasksByDay = useMemo(() => groupTasksByDay(tasks), [groupTasksByDay, tasks]);

  const dayNumberFromProjectStart = useMemo(
    () => (dateKey: string) => {
      const start = project?.startDate?.slice(0, 10);
      if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
      const [sy, sm, sd] = start.split("-").map(Number);
      const [dy, dm, dd] = dateKey.split("-").map(Number);
      const s = Date.UTC(sy, sm - 1, sd);
      const d = Date.UTC(dy, dm - 1, dd);
      return Math.floor((d - s) / 86400000) + 1;
    },
    [project?.startDate]
  );

  const myDayOptions = useMemo(
    () =>
      myTasksByDay.map((g) => ({
        value: g.dateKey,
        label: `Day ${dayNumberFromProjectStart(g.dateKey) ?? "?"} · ${formatDate(g.dateKey)}`,
      })),
    [myTasksByDay, dayNumberFromProjectStart]
  );

  const allDayOptions = useMemo(
    () =>
      allTasksByDay.map((g) => ({
        value: g.dateKey,
        label: `Day ${dayNumberFromProjectStart(g.dateKey) ?? "?"} · ${formatDate(g.dateKey)}`,
      })),
    [allTasksByDay, dayNumberFromProjectStart]
  );

  const visibleMyTasksByDay = useMemo(
    () => (myDayFilter === "all" ? myTasksByDay : myTasksByDay.filter((g) => g.dateKey === myDayFilter)),
    [myDayFilter, myTasksByDay]
  );
  const visibleAllTasksByDay = useMemo(
    () => (allDayFilter === "all" ? allTasksByDay : allTasksByDay.filter((g) => g.dateKey === allDayFilter)),
    [allDayFilter, allTasksByDay]
  );

  if (!project) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Project not found.</p>
        <Link href="/technician/projects" className="text-sm font-medium text-brand">
          Back to My Projects
        </Link>
      </div>
    );
  }

  const isAssigned = tech ? project.assignedTechnicians.includes(tech.id) : false;

  if (!isAssigned) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          You are not assigned to this project.
        </p>
        <Link href="/technician/projects" className="text-sm font-medium text-brand">
          Back to My Projects
        </Link>
      </div>
    );
  }

  const openEditTask = (task: Task) => {
    setSelectedTask(task);
    setEditStatus(task.status);
    setShowEditTask(true);
  };

  const saveTaskStatus = async () => {
    if (!selectedTask) return;
    setSaveSubmitting(true);
    try {
      const response = await fetch(
        `/api/projects/${selectedTask.projectId}/tasks/${selectedTask.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: editStatus }),
        }
      );
      const payload = (await response.json()) as Task | { error?: string };
      if (!response.ok) {
        toast.error(
          "error" in payload && payload.error
            ? payload.error
            : "Failed to update task."
        );
        setSaveSubmitting(false);
        return;
      }
      const updated = payload as Task;
      setTasks((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
      setShowEditTask(false);
      setShowSaveConfirm(false);
      setSelectedTask(null);
      toast.success("Task status updated.");
    } catch {
      toast.error("Failed to update task.");
    } finally {
      setSaveSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/technician/projects"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          My Projects
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 truncate">{project.name}</h1>
              <p className="mt-1 text-sm text-slate-500">{project.client}</p>
            </div>
            <StatusBadge status={project.status} />
          </div>

          <p className="mt-3 text-sm text-slate-600">{project.description}</p>

          <div className="mt-4">
            <ProgressBar value={project.progress} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                Location
              </div>
              <p className="mt-1 text-sm font-medium text-slate-900">{project.location}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5" />
                Timeline
              </div>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {formatDate(project.startDate)} - {formatDate(project.endDate)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Users className="h-3.5 w-3.5" />
                My Tasks
              </div>
              <p className="mt-1 text-sm font-medium text-slate-900">{myTasks.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white lg:row-span-2">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">My Assigned Tasks</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tasks assigned to you in this project
                </p>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowMyDayMenu((prev) => !prev);
                    setShowAllDayMenu(false);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  aria-label="Filter my tasks by day"
                  title="Filter by day"
                >
                  <Filter className="h-3.5 w-3.5" />
                </button>
                {showMyDayMenu && (
                  <div className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setMyDayFilter("all");
                        setShowMyDayMenu(false);
                      }}
                      className={`block w-full px-3 py-2 text-left text-xs hover:bg-slate-50 ${
                        myDayFilter === "all" ? "font-semibold text-brand" : "text-slate-700"
                      }`}
                    >
                      All
                    </button>
                    {myDayOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setMyDayFilter(opt.value);
                          setShowMyDayMenu(false);
                        }}
                        className={`block w-full px-3 py-2 text-left text-xs hover:bg-slate-50 ${
                          myDayFilter === opt.value ? "font-semibold text-brand" : "text-slate-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {myTasks.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                No tasks assigned to you yet.
              </div>
            ) : visibleMyTasksByDay.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                No tasks for this day.
              </div>
            ) : (
              visibleMyTasksByDay.map((group) => (
                <div key={group.dateKey}>
                  <div className="px-5 py-2 text-xs font-semibold text-slate-600">
                    Day {dayNumberFromProjectStart(group.dateKey) ?? "?"} {formatDate(group.dateKey)}{" "}
                    {group.tasks.length} task{group.tasks.length !== 1 ? "s" : ""}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {group.tasks.map((task) => (
                      <div key={task.id} className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {task.status === "completed" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : task.status === "in_progress" ? (
                            <Clock className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-slate-400" />
                          )}
                          <p className="text-sm font-medium text-slate-900">{task.title}</p>
                          <StatusBadge status={task.priority} />
                          <span className="ml-auto">
                            <StatusBadge status={task.status} />
                          </span>
                          <button
                            onClick={() => openEditTask(task)}
                            className="ml-2 flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            title="Edit task status"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{task.description}</p>
                        <p className="mt-2 text-xs text-slate-400">Due: {formatDate(task.dueDate)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white lg:col-span-2">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">All Project Tasks</h2>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowAllDayMenu((prev) => !prev);
                    setShowMyDayMenu(false);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  aria-label="Filter all tasks by day"
                  title="Filter by day"
                >
                  <Filter className="h-3.5 w-3.5" />
                </button>
                {showAllDayMenu && (
                  <div className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setAllDayFilter("all");
                        setShowAllDayMenu(false);
                      }}
                      className={`block w-full px-3 py-2 text-left text-xs hover:bg-slate-50 ${
                        allDayFilter === "all" ? "font-semibold text-brand" : "text-slate-700"
                      }`}
                    >
                      All
                    </button>
                    {allDayOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setAllDayFilter(opt.value);
                          setShowAllDayMenu(false);
                        }}
                        className={`block w-full px-3 py-2 text-left text-xs hover:bg-slate-50 ${
                          allDayFilter === opt.value ? "font-semibold text-brand" : "text-slate-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {visibleAllTasksByDay.map((group) => (
              <div key={group.dateKey}>
                <div className="px-5 py-2 text-xs font-semibold text-slate-600">
                  Day {dayNumberFromProjectStart(group.dateKey) ?? "?"} {formatDate(group.dateKey)}{" "}
                  {group.tasks.length} task{group.tasks.length !== 1 ? "s" : ""}
                </div>
                <div className="divide-y divide-slate-100">
                  {group.tasks.map((task) => (
                    <div key={task.id} className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">{task.title}</p>
                        <StatusBadge status={task.priority} />
                        <span className="ml-auto">
                          <StatusBadge status={task.status} />
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Assigned to: {task.assignedTo ? (technicians.find((t) => t.id === task.assignedTo)?.name ?? "Unknown") : "Unassigned"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirm Update Task */}
      <ConfirmModal
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={saveTaskStatus}
        title="Update Task Status"
        message={
          selectedTask ? (
            <>
              Are you sure you want to update{" "}
              <span className="font-semibold text-slate-900">{selectedTask.title}</span>{" "}
              to{" "}
              <span className="font-semibold text-slate-900">
                {editStatus === "todo"
                  ? "To Do"
                  : editStatus === "in_progress"
                  ? "In Progress"
                  : editStatus === "completed"
                  ? "Completed"
                  : "Cancelled"}
              </span>
              ?
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Update"
        variant="primary"
        isLoading={saveSubmitting}
      />

      <Modal
        isOpen={showEditTask}
        onClose={() => setShowEditTask(false)}
        title="Update Task Status"
        size="sm"
      >
        {selectedTask && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-900">{selectedTask.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{selectedTask.description}</p>
            </div>
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
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowEditTask(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => setShowSaveConfirm(true)}>Save</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
