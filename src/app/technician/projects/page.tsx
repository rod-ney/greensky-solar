"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Circle,
  ArrowRight,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import ProgressBar from "@/components/ui/ProgressBar";
import { formatDate } from "@/lib/format";
import { useSessionUser } from "@/lib/client-session";
import type { Project, Technician } from "@/types";

export default function TechnicianProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const sessionUser = useSessionUser();

  useEffect(() => {
    const load = async () => {
      try {
        const [projectsRes, techRes] = await Promise.all([
          fetch("/api/projects", { cache: "no-store" }),
          fetch("/api/profile/technician", { cache: "no-store" }),
        ]);
        setProjects(projectsRes.ok ? (((await projectsRes.json()) as { items: Project[] }).items ?? []) : []);
        const techData = techRes.ok ? ((await techRes.json()) as Technician | null) : null;
        setTechnicians(techData ? [techData] : []);
      } catch {
        setProjects([]);
        setTechnicians([]);
      }
    };
    void load();
  }, []);

  const tech = technicians[0] ?? null;

  const myProjects = useMemo(
    () => projects.filter((p) => (tech ? p.assignedTechnicians.includes(tech.id) : false)),
    [projects, tech]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Projects</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {(tech?.name ?? sessionUser.name)} — {myProjects.length} project
          {myProjects.length !== 1 ? "s" : ""} assigned
        </p>
      </div>

      {/* Project Cards */}
      {myProjects.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">No projects assigned yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {myProjects.map((project) => {
            const myTasks = project.tasks.filter(
              (t) => (tech ? t.assignedTo === tech.id : false)
            );
            const myCompleted = myTasks.filter(
              (t) => t.status === "completed"
            ).length;
            const myPending = myTasks.filter(
              (t) => t.status === "todo" || t.status === "in_progress"
            ).length;

            return (
              <Link
                key={project.id}
                href={`/technician/projects/${project.id}`}
                className="group block rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-brand/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {project.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {project.client}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={project.status} />
                    <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:text-brand group-hover:translate-x-0.5" />
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-600 line-clamp-2">
                  {project.description}
                </p>

                <div className="mt-4">
                  <ProgressBar value={project.progress} />
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {project.location.split(",")[0]}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(project.endDate)}
                  </span>
                </div>

                {/* My tasks in this project */}
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-semibold text-slate-700 mb-2">
                    My Tasks ({myTasks.length})
                  </h4>
                  <div className="space-y-2">
                    {myTasks.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        No tasks assigned in this project
                      </p>
                    ) : (
                      myTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          {task.status === "completed" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          ) : task.status === "in_progress" ? (
                            <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="text-slate-700 truncate">
                            {task.title}
                          </span>
                          <span className="ml-auto text-slate-400 shrink-0">
                            {formatDate(task.dueDate)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  {myTasks.length > 0 && (
                    <div className="mt-3 flex gap-3 text-xs">
                      <span className="text-green-600 font-medium">
                        {myCompleted} done
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-blue-600 font-medium">
                        {myPending} pending
                      </span>
                    </div>
                  )}
                  <p className="mt-3 text-[11px] font-medium text-brand/80">
                    Click card to view full project tasks
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
