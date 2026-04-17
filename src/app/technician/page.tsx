"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
      color: "bg-blue-600",
      iconColor: "text-blue-600",
      stat: `${pendingTasks.length} pending`,
    },
    {
      label: "My Projects",
      description: "Browse projects you're assigned to and track progress",
      href: "/technician/projects",
      icon: FolderKanban,
      color: "bg-brand",
      iconColor: "text-brand",
      stat: `${myProjects.length} active`,
    },
    {
      label: "Calendar",
      description: "See your tasks by date and plan your work week",
      href: "/technician/calendar",
      icon: Calendar,
      color: "bg-purple-600",
      iconColor: "text-purple-600",
      stat: "Date view",
    },
    {
      label: "Submit Report",
      description: "Create and submit inspection or completion reports",
      href: "/technician/reports",
      icon: FileText,
      color: "bg-teal-600",
      iconColor: "text-teal-600",
      stat: "Send to admin",
    },
  ];

  const nextTask = pendingTasks[0] as (Task & { projectId: string }) | undefined;
  const analyticsMotion = {
    initial: { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.35 },
    transition: { duration: 0.32, ease: "easeOut" as const },
  };

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
        <motion.div
          {...analyticsMotion}
          transition={{ ...analyticsMotion.transition, delay: 0.02 }}
          className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 text-center"
        >
          <ClipboardCheck className="relative z-10 mx-auto h-5 w-5 text-blue-600" />
          <p className="relative z-10 mt-2 text-lg font-bold text-slate-900">
            {pendingTasks.length}
          </p>
          <p className="relative z-10 text-[11px] text-slate-500">Pending Tasks</p>
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-slate-300/20" />
          <div className="pointer-events-none absolute right-3 -bottom-5 h-14 w-14 rounded-full bg-slate-200/30" />
        </motion.div>
        <motion.div
          {...analyticsMotion}
          transition={{ ...analyticsMotion.transition, delay: 0.08 }}
          className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 text-center"
        >
          <CheckCircle2 className="relative z-10 mx-auto h-5 w-5 text-green-600" />
          <p className="relative z-10 mt-2 text-lg font-bold text-slate-900">
            {completedTasks.length}
          </p>
          <p className="relative z-10 text-[11px] text-slate-500">Completed</p>
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-slate-300/20" />
          <div className="pointer-events-none absolute right-3 -bottom-5 h-14 w-14 rounded-full bg-slate-200/30" />
        </motion.div>
        <motion.div
          {...analyticsMotion}
          transition={{ ...analyticsMotion.transition, delay: 0.14 }}
          className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 text-center"
        >
          <AlertCircle className="relative z-10 mx-auto h-5 w-5 text-amber-500" />
          <p className="relative z-10 mt-2 text-lg font-bold text-slate-900">
            {urgentTasks.length}
          </p>
          <p className="relative z-10 text-[11px] text-slate-500">Urgent</p>
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-slate-300/20" />
          <div className="pointer-events-none absolute right-3 -bottom-5 h-14 w-14 rounded-full bg-slate-200/30" />
        </motion.div>
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
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="pointer-events-none absolute inset-0">
                  <div
                    className={`absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-2xl ${card.color}`}
                  />
                  <div
                    className={`absolute -left-6 bottom-4 h-16 w-16 rounded-full opacity-10 blur-xl ${card.color}`}
                  />
                </div>
                <div className="relative z-10 flex items-start justify-between">
                  <Icon className={`h-7 w-7 ${card.iconColor}`} />
                  <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:text-brand group-hover:translate-x-0.5" />
                </div>
                <h3 className="relative z-10 mt-4 text-base font-semibold text-slate-900 group-hover:text-brand transition-colors">
                  {card.label}
                </h3>
                <p className="relative z-10 mt-1 text-sm text-slate-500 leading-relaxed">
                  {card.description}
                </p>
                <div className="relative z-10 mt-3 pt-3 border-t border-slate-100">
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
