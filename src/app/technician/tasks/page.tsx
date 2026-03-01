"use client";

import { useState, useMemo, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  Calendar,
  ChevronDown,
} from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { formatDate } from "@/lib/format";
import { useSessionUser } from "@/lib/client-session";
import { toast } from "@/lib/toast";
import type { Task, TaskStatus, Project, Technician } from "@/types";

const taskStatusIcons: Record<TaskStatus, React.ReactNode> = {
  todo: <Circle className="h-4 w-4 text-slate-400" />,
  in_progress: <Clock className="h-4 w-4 text-blue-500" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  cancelled: <AlertCircle className="h-4 w-4 text-red-500" />,
};

export default function TechnicianTasksPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const sessionUser = useSessionUser();
  const [tasks, setTasks] = useState<(Task & { projectName: string })[]>([]);
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const [showUpdate, setShowUpdate] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [saveSubmitting, setSaveSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<
    (Task & { projectName: string }) | null
  >(null);
  const [updateStatus, setUpdateStatus] = useState<TaskStatus>("todo");
  const [updateNote, setUpdateNote] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [projectsRes, techRes] = await Promise.all([
          fetch("/api/projects", { cache: "no-store" }),
          fetch("/api/profile/technician", { cache: "no-store" }),
        ]);
        const loadedProjects = projectsRes.ok ? (((await projectsRes.json()) as { items: Project[] }).items ?? []) : [];
        const activeTech = techRes.ok ? ((await techRes.json()) as Technician | null) : null;
        setTechnicians(activeTech ? [activeTech] : []);
        const result: (Task & { projectName: string })[] = [];
        loadedProjects.forEach((project) => {
          project.tasks
            .filter((task) => (activeTech ? task.assignedTo === activeTech.id : false))
            .forEach((task) => result.push({ ...task, projectName: project.name }));
        });
        setTasks(result);
      } catch {
        setTechnicians([]);
        setTasks([]);
      }
    };
    void load();
  }, []);

  const tech = technicians[0] ?? null;

  const filtered = useMemo(
    () => (filter === "all" ? tasks : tasks.filter((t) => t.status === filter)),
    [tasks, filter]
  );

  const counts = useMemo(
    () => ({
      all: tasks.length,
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      cancelled: tasks.filter((t) => t.status === "cancelled").length,
    }),
    [tasks]
  );

  const openUpdate = (task: Task & { projectName: string }) => {
    setSelectedTask(task);
    setUpdateStatus(task.status);
    setUpdateNote("");
    setShowUpdate(true);
  };

  const handleUpdate = async () => {
    if (!selectedTask) return;
    setSaveSubmitting(true);
    try {
      const response = await fetch(
        `/api/projects/${selectedTask.projectId}/tasks/${selectedTask.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: updateStatus }),
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
        prev.map((t) =>
          t.id === selectedTask.id ? { ...t, status: updated.status } : t
        )
      );
      setShowUpdate(false);
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
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Tasks</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {(tech?.name ?? sessionUser.name)} — {tasks.length} total tasks across{" "}
          {new Set(tasks.map((t) => t.projectId)).size} projects
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(
          ["all", "todo", "in_progress", "completed", "cancelled"] as const
        ).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === status
                ? "bg-brand text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {status === "all"
              ? "All"
              : status === "in_progress"
              ? "In Progress"
              : status.charAt(0).toUpperCase() + status.slice(1)}{" "}
            ({counts[status]})
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No tasks found
          </div>
        ) : (
          filtered.map((task) => (
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
                  {(task.priority === "high" || task.priority === "urgent") && (
                    <StatusBadge status={task.priority} />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {task.projectName}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(task.dueDate)}
                </span>
              </div>
              <StatusBadge status={task.status} />
              <button
                onClick={() => openUpdate(task)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
              >
                Update
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Confirm Update Task */}
      <ConfirmModal
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={handleUpdate}
        title="Update Task Status"
        message={
          selectedTask ? (
            <>
              Are you sure you want to update{" "}
              <span className="font-semibold text-slate-900">{selectedTask.title}</span>{" "}
              to{" "}
              <span className="font-semibold text-slate-900">
                {updateStatus === "todo"
                  ? "To Do"
                  : updateStatus === "in_progress"
                  ? "In Progress"
                  : updateStatus === "completed"
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

      {/* Update Task Modal */}
      <Modal
        isOpen={showUpdate}
        onClose={() => setShowUpdate(false)}
        title="Update Task"
        size="sm"
      >
        {selectedTask && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {selectedTask.title}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedTask.projectName}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                value={updateStatus}
                onChange={(e) =>
                  setUpdateStatus(e.target.value as TaskStatus)
                }
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
                Note (optional)
              </label>
              <textarea
                rows={2}
                value={updateNote}
                onChange={(e) => setUpdateNote(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
                placeholder="Add a note..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowUpdate(false)}
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
