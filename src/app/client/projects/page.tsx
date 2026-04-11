"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  Calendar,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import ProgressBar from "@/components/ui/ProgressBar";
import { formatDate } from "@/lib/format";
import type { ClientProjectStatus } from "@/types/client";

type ProjectSummary = {
  id: string;
  name: string;
  location: string;
  status: ClientProjectStatus;
  priority: string;
  startDate: string;
  endDate: string;
  progress: number;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
};

const statusFilterOptions: { value: ClientProjectStatus | "all"; label: string }[] = [
  { value: "all", label: "All Projects" },
  { value: "ongoing", label: "Ongoing" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function ClientProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientProjectStatus | "all">("all");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/client/projects", { cache: "no-store" });
        if (res.ok) {
          setProjects((await res.json()) as ProjectSummary[]);
        }
      } catch {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.location.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [projects, search, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: projects.length };
    for (const p of projects) {
      counts[p.status] = (counts[p.status] ?? 0) + 1;
    }
    return counts;
  }, [projects]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 animate-pulse">
              <div className="h-4 w-2/3 bg-slate-100 rounded mb-3" />
              <div className="h-3 w-1/2 bg-slate-100 rounded mb-4" />
              <div className="h-2 w-full bg-slate-100 rounded mb-3" />
              <div className="h-3 w-3/4 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Projects</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Track your solar installation projects and view detailed progress
        </p>
      </div>

      {/* Status Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {statusFilterOptions.map((opt) => {
          const count = statusCounts[opt.value] ?? 0;
          return (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all ${
                statusFilter === opt.value
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {opt.label}{" "}
              <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      {/* Project Cards Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">
            {projects.length === 0
              ? "No projects assigned to you yet"
              : "No projects match your filters"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Link
              key={project.id}
              href={`/client/projects/${project.id}`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              {/* Top Row: Name + Status */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold text-slate-900 group-hover:text-brand transition-colors line-clamp-1">
                  {project.name}
                </h3>
                <StatusBadge status={project.status} size="sm" />
              </div>

              {/* Location */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{project.location}</span>
              </div>

              {/* Progress */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Progress</span>
                  <span className="text-xs font-semibold text-slate-700">{project.progress}%</span>
                </div>
                <ProgressBar value={project.progress} size="sm" />
              </div>

              {/* Schedule */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  {formatDate(project.startDate)} — {formatDate(project.endDate)}
                </span>
              </div>

              {/* Priority + Arrow */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <StatusBadge status={project.priority} size="sm" />
                <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:text-brand group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
