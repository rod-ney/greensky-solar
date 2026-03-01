"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  FolderKanban,
  Calendar,
  FileText,
  Sun,
  ArrowRight,
  Wrench,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useSessionUser } from "@/lib/client-session";
import type { Project, Technician, Task } from "@/types";

export default function TechnicianHomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const sessionUser = useSessionUser();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsRes, techRes] = await Promise.all([
          fetch("/api/projects", { cache: "no-store" }),
          fetch("/api/profile/technician", { cache: "no-store" }),
        ]);
        const projectsData = projectsRes.ok ? (((await projectsRes.json()) as { items: Project[] }).items ?? []) : [];
        const techData = techRes.ok ? ((await techRes.json()) as Technician | null) : null;
        setProjects(projectsData);
        setTechnicians(techData ? [techData] : []);
      } catch {
        setProjects([]);
        setTechnicians([]);
      }
    };
    void loadData();
  }, []);

  const tech = technicians[0] ?? null;

  const myProjects = useMemo(
    () => projects.filter((p) => (tech ? p.assignedTechnicians.includes(tech.id) : false)),
    [projects, tech]
  );

  const myTasks = useMemo(
    () =>
      myProjects.flatMap((p) =>
        p.tasks.filter((t) => (tech ? t.assignedTo === tech.id : false))
      ),
    [myProjects, tech]
  );

  const pendingTasks = useMemo(
    () => myTasks.filter((t) => t.status === "todo" || t.status === "in_progress"),
    [myTasks]
  );
  const completedTasks = useMemo(
    () => myTasks.filter((t) => t.status === "completed"),
    [myTasks]
  );
  const urgentTasks = useMemo(
    () => pendingTasks.filter((t) => t.priority === "high" || t.priority === "urgent"),
    [pendingTasks]
  );

  const navCards = [
    {
      label: "My Tasks",
      description: "View and update your assigned tasks across all projects",
      href: "/technician/tasks",
      icon: ClipboardCheck,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      stat: `${pendingTasks.length} pending`,
    },
    {
      label: "My Projects",
      description: "Browse projects you're assigned to and track progress",
      href: "/technician/projects",
      icon: FolderKanban,
      iconBg: "bg-brand/10",
      iconColor: "text-brand",
      stat: `${myProjects.length} active`,
    },
    {
      label: "Calendar",
      description: "See your tasks by date and plan your work week",
      href: "/technician/calendar",
      icon: Calendar,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      stat: "Date view",
    },
    {
      label: "Submit Report",
      description: "Create and submit inspection or completion reports",
      href: "/technician/reports",
      icon: FileText,
      iconBg: "bg-teal-50",
      iconColor: "text-teal-600",
      stat: "Send to admin",
    },
  ];

  const nextTask = pendingTasks[0] as (Task & { projectId: string }) | undefined;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-emerald-700 p-6 sm:p-8 text-white">
        <div className="relative z-10">
          <p className="text-sm font-medium text-white/70">Welcome back,</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{tech?.name ?? sessionUser.name}</h1>
          <p className="mt-2 text-sm text-white/80 max-w-md">
            {tech?.specialization ?? "Technician"} — manage your tasks, track project progress,
            and submit reports.
          </p>

          {nextTask && (
            <div className="mt-5 inline-flex items-center gap-3 rounded-xl bg-white/15 backdrop-blur-sm px-4 py-3">
              <Wrench className="h-4 w-4 text-white/80" />
              <div>
                <p className="text-xs text-white/70">Next task</p>
                <p className="text-sm font-semibold">
                  {nextTask.title} —{" "}
                  {myProjects.find((p) => p.id === nextTask.projectId)
                    ?.name ?? ""}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Decorative elements */}
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="absolute -right-2 top-10 h-20 w-20 rounded-full bg-white/5" />
        <div className="absolute right-16 -bottom-8 h-24 w-24 rounded-full bg-white/5" />
        <Sun className="absolute right-8 top-8 h-16 w-16 text-white/10" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
            <ClipboardCheck className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {pendingTasks.length}
          </p>
          <p className="text-[11px] text-slate-500">Pending Tasks</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </div>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {completedTasks.length}
          </p>
          <p className="text-[11px] text-slate-500">Completed</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {urgentTasks.length}
          </p>
          <p className="text-[11px] text-slate-500">Urgent</p>
        </div>
      </div>

      {/* Navigation Cards */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          Quick Access
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {navCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group relative rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.iconBg}`}
                  >
                    <Icon className={`h-6 w-6 ${card.iconColor}`} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:text-brand group-hover:translate-x-0.5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900 group-hover:text-brand transition-colors">
                  {card.label}
                </h3>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                  {card.description}
                </p>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <span className="text-xs font-medium text-slate-400">
                    {card.stat}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
