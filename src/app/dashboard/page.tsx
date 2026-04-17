"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FolderKanban,
  TrendingUp,
  Users,
  PhilippinePeso,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  X,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import StatsCard from "@/components/ui/StatsCard";
import StatusBadge from "@/components/ui/StatusBadge";
import ProgressBar from "@/components/ui/ProgressBar";
import { formatCurrencyDecimal } from "@/lib/format";
import type { Project, Report, Technician } from "@/types";

const QUICK_ACCESS_TIP_DISMISS_KEY = "gs.dismiss.quickAccessTip.v2";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [showQuickAccessTip, setShowQuickAccessTip] = useState(false);
  const [dontRemindQuickAccessTip, setDontRemindQuickAccessTip] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [projectsRes, techsRes, reportsRes] = await Promise.all([
          fetch("/api/projects", { cache: "no-store" }),
          fetch("/api/technicians", { cache: "no-store" }),
          fetch("/api/reports", { cache: "no-store" }),
        ]);
        setProjects(projectsRes.ok ? (((await projectsRes.json()) as { items: Project[] }).items ?? []) : []);
        setTechnicians(techsRes.ok ? ((await techsRes.json()) as Technician[]) : []);
        setReports(reportsRes.ok ? ((await reportsRes.json()) as Report[]) : []);
      } catch {
        setProjects([]);
        setTechnicians([]);
        setReports([]);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    // Avoid hydration mismatch: only decide tip visibility after mount.
    const id = window.requestAnimationFrame(() => {
      try {
        const dismissed = window.localStorage.getItem(QUICK_ACCESS_TIP_DISMISS_KEY) === "1";
        setShowQuickAccessTip(!dismissed);
      } catch {
        setShowQuickAccessTip(true);
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  const recentProjects = useMemo(() => projects.slice(0, 5), [projects]);
  const activeTechnicians = useMemo(
    () => technicians.filter((t) => t.status === "busy"),
    [technicians]
  );
  const revenueReports = useMemo(
    () => reports.filter((r) => r.type === "revenue" && typeof r.amount === "number"),
    [reports]
  );
  const monthlyRevenueData = useMemo(() => {
    const grouped = new Map<string, number>();
    revenueReports.forEach((report) => {
      const key = new Date(report.submittedAt).toLocaleDateString("en-US", { month: "short" });
      grouped.set(key, (grouped.get(key) ?? 0) + (report.amount ?? 0));
    });
    return Array.from(grouped.entries()).map(([month, revenue]) => ({ month, revenue }));
  }, [revenueReports]);
  const maxRevenue = Math.max(1, ...monthlyRevenueData.map((d) => d.revenue));

  const totalProjects = projects.length;
  const ongoingProjects = projects.filter((p) => p.status === "ongoing").length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;
  const pendingProjects = projects.filter((p) => p.status === "pending").length;
  const monthlyRevenue = monthlyRevenueData[monthlyRevenueData.length - 1]?.revenue ?? 0;
  const previousMonthlyRevenue = monthlyRevenueData[monthlyRevenueData.length - 2]?.revenue ?? 0;
  const monthlyRevenueChange =
    previousMonthlyRevenue > 0
      ? ((monthlyRevenue - previousMonthlyRevenue) / previousMonthlyRevenue) * 100
      : 0;
  const monthlyRevenueChangeRounded = Number(monthlyRevenueChange.toFixed(1));
  const totalTechnicians = technicians.length;
  const activeTechCount = activeTechnicians.length;
  const cardMotion = {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.35, ease: "easeOut" as const },
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div {...cardMotion} transition={{ ...cardMotion.transition, delay: 0.02 }}>
          <StatsCard
            title="Total Projects"
            value={totalProjects}
            subtitle={`${ongoingProjects} ongoing`}
            icon={FolderKanban}
            trend={undefined}
          />
        </motion.div>
        <motion.div {...cardMotion} transition={{ ...cardMotion.transition, delay: 0.08 }}>
          <StatsCard
            title="Completed"
            value={completedProjects}
            subtitle={`${pendingProjects} pending`}
            icon={CheckCircle2}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
        </motion.div>
        <motion.div {...cardMotion} transition={{ ...cardMotion.transition, delay: 0.14 }}>
          <StatsCard
            title="Active Technicians"
            value={`${activeTechCount}/${totalTechnicians}`}
            subtitle="Currently deployed"
            icon={Users}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
        </motion.div>
        <motion.div {...cardMotion} transition={{ ...cardMotion.transition, delay: 0.2 }}>
          <StatsCard
            title="Monthly Revenue"
            value={formatCurrencyDecimal(monthlyRevenue)}
            subtitle={monthlyRevenueData[monthlyRevenueData.length - 1]?.month ?? "No data"}
            icon={PhilippinePeso}
            trend={{
              value: Math.abs(monthlyRevenueChangeRounded),
              positive: monthlyRevenueChangeRounded >= 0,
            }}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <motion.div
          {...cardMotion}
          transition={{ ...cardMotion.transition, delay: 0.1 }}
          className="lg:col-span-2 rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Revenue Overview</h3>
              <p className="text-xs text-slate-500 mt-0.5">Monthly revenue trend</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-2.5 py-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs font-medium text-green-600">
                {monthlyRevenueChangeRounded >= 0 ? "+" : ""}
                {monthlyRevenueChangeRounded}%
              </span>
            </div>
          </div>
          {/* Bar Chart */}
          <div className="flex items-end gap-3 h-48">
            {monthlyRevenueData.map((d) => (
              <div key={d.month} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[10px] font-medium text-slate-500">
                  {formatCurrencyDecimal(d.revenue).replace("₱", "")}
                </span>
                <div
                  className="w-full rounded-t-md bg-brand/80 hover:bg-brand transition-colors cursor-default min-h-[4px]"
                  style={{ height: `${(d.revenue / maxRevenue) * 140}px` }}
                />
                <span className="text-xs font-medium text-slate-500">{d.month}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Project Status Donut */}
        <motion.div
          {...cardMotion}
          transition={{ ...cardMotion.transition, delay: 0.16 }}
          className="rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-sm"
        >
          <h3 className="text-sm font-semibold text-slate-900">Project Status</h3>
          <p className="text-xs text-slate-500 mt-0.5">Distribution overview</p>

          {/* Simple donut representation */}
          <div className="my-6 flex justify-center">
            <div className="relative h-36 w-36">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                {/* Completed */}
                <circle
                  cx="18" cy="18" r="14"
                  fill="none" stroke="#118C3A" strokeWidth="4"
                  strokeDasharray={`${((completedProjects || 0) / Math.max(totalProjects, 1)) * 88} ${88 - ((completedProjects || 0) / Math.max(totalProjects, 1)) * 88}`}
                  strokeDashoffset="0"
                />
                {/* Ongoing */}
                <circle
                  cx="18" cy="18" r="14"
                  fill="none" stroke="#2563EB" strokeWidth="4"
                  strokeDasharray={`${((ongoingProjects || 0) / Math.max(totalProjects, 1)) * 88} ${88 - ((ongoingProjects || 0) / Math.max(totalProjects, 1)) * 88}`}
                  strokeDashoffset={`${-((completedProjects || 0) / Math.max(totalProjects, 1)) * 88}`}
                />
                {/* Pending */}
                <circle
                  cx="18" cy="18" r="14"
                  fill="none" stroke="#F59E0B" strokeWidth="4"
                  strokeDasharray={`${((pendingProjects || 0) / Math.max(totalProjects, 1)) * 88} ${88 - ((pendingProjects || 0) / Math.max(totalProjects, 1)) * 88}`}
                  strokeDashoffset={`${-(((completedProjects || 0) + (ongoingProjects || 0)) / Math.max(totalProjects, 1)) * 88}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">{totalProjects}</span>
                <span className="text-xs text-slate-500">Total</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-brand" />
                <span className="text-xs text-slate-600">Completed</span>
              </div>
              <span className="text-xs font-semibold text-slate-900">{completedProjects}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-xs text-slate-600">Ongoing</span>
              </div>
              <span className="text-xs font-semibold text-slate-900">{ongoingProjects}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-xs text-slate-600">Pending</span>
              </div>
              <span className="text-xs font-semibold text-slate-900">{pendingProjects}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Projects + Active Technicians */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Projects */}
        <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Recent Projects</h3>
            <Link
              href="/projects"
              className="flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-dark"
            >
              View All <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {project.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{project.client}</p>
                </div>
                <div className="hidden sm:block w-32">
                  <ProgressBar value={project.progress} size="sm" />
                </div>
                <StatusBadge status={project.status} />
              </Link>
            ))}
          </div>
        </div>

        {/* Active Technicians */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Active Technicians</h3>
            <Link
              href="/technicians"
              className="flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-dark"
            >
              View All <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {activeTechnicians.slice(0, 6).map((tech) => (
              <div key={tech.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                  {tech.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {tech.name}
                  </p>
                  <p className="text-xs text-slate-500">{tech.specialization}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs text-slate-500">
                    {tech.activeProjects} active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Access tip */}
      {showQuickAccessTip && (
        <div className="fixed bottom-6 right-6 z-60 max-w-sm">
          <div className="rounded-2xl border border-brand/20 bg-white/95 p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  Tip: Quick Access
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Press{" "}
                  <kbd className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 shadow-sm">
                    M
                  </kbd>{" "}
                  to open the Quick Access menu.
                </p>
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={dontRemindQuickAccessTip}
                    onChange={(e) => setDontRemindQuickAccessTip(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-brand focus:ring-brand/30"
                  />
                  Don&apos;t remind me again
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowQuickAccessTip(false);
                  if (dontRemindQuickAccessTip) {
                    try {
                      window.localStorage.setItem(QUICK_ACCESS_TIP_DISMISS_KEY, "1");
                    } catch {
                      // ignore
                    }
                  }
                }}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Dismiss tip"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
