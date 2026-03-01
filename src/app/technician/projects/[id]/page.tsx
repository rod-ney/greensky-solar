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

      <div className="rounded-xl border border-slate-200 bg-white p-5">
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

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-base font-semibold text-slate-900">My Assigned Tasks</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tasks assigned to you in this project
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {myTasks.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              No tasks assigned to you yet.
            </div>
          ) : (
            myTasks.map((task) => (
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
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-base font-semibold text-slate-900">All Project Tasks</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {tasks.map((task) => (
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
