"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronRight,
  FolderKanban,
  ListChecks,
  Loader2,
  MapPin,
  Search,
  User,
} from "lucide-react";
import { toast } from "@/lib/toast";
import type { AdminComplianceTrackerItem } from "@/types/compliance-admin";
import ProgressBar from "@/components/ui/ProgressBar";

type ProjectGroup = {
  projectId: string;
  projectName: string;
  location?: string;
  clientName: string;
  clientEmail: string;
  items: AdminComplianceTrackerItem[];
};

function manilaToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }).slice(0, 10);
}

function isResolvedItem(item: AdminComplianceTrackerItem): boolean {
  if (item.status === "approved" || item.status === "waived") return true;
  if (item.suppliedBy === "admin" && item.status === "pending") return true;
  return false;
}

export default function ComplianceTrackerPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AdminComplianceTrackerItem[]>([]);
  const [projectSearch, setProjectSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/compliance-tracker", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        toast.error("You don’t have access to this page.");
        return;
      }
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        toast.error(j.error ?? "Could not load compliance tracker.");
        return;
      }
      const data = (await res.json()) as { items: AdminComplianceTrackerItem[] };
      setItems(data.items ?? []);
    } catch {
      toast.error("Could not load compliance tracker.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const projectGroups = useMemo(() => {
    const map = new Map<string, ProjectGroup>();
    for (const item of items) {
      let g = map.get(item.projectId);
      if (!g) {
        g = {
          projectId: item.projectId,
          projectName: item.projectName,
          location: item.location,
          clientName: item.clientName,
          clientEmail: item.clientEmail,
          items: [],
        };
        map.set(item.projectId, g);
      }
      g.items.push(item);
    }
    return Array.from(map.values()).sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [items]);

  const today = manilaToday();

  const filteredProjectGroups = useMemo(() => {
    if (!projectSearch.trim()) return projectGroups;
    const q = projectSearch.toLowerCase();
    return projectGroups.filter(
      (g) =>
        g.projectName.toLowerCase().includes(q) ||
        g.projectId.toLowerCase().includes(q) ||
        g.clientName.toLowerCase().includes(q) ||
        g.clientEmail.toLowerCase().includes(q) ||
        (g.location && g.location.toLowerCase().includes(q))
    );
  }, [projectGroups, projectSearch]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      <header className="page-head mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 border border-brand-100">
            <ListChecks className="h-4 w-4 text-brand" strokeWidth={2} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Compliance tracker</h1>
        </div>
      </header>

      {projectGroups.length === 0 ? (
        <div className="rounded-2xl bg-gradient-to-b from-brand-50/45 via-white to-slate-50/30 py-16 text-center px-6">
          <ListChecks className="mx-auto h-14 w-14 text-brand/35 mb-4" strokeWidth={1.4} />
          <p className="text-sm text-slate-500 px-4">
            No eligible projects yet. A client must have a <strong>completed</strong> site inspection and an
            assigned project.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top Filter */}
          {projectGroups.length > 2 && (
            <div className="flex justify-end">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Search project ID, name, or address..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-sm"
                />
              </div>
            </div>
          )}

          {/* Grid of Clickable Project Rectangles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjectGroups.map((g) => {
              const total = g.items.length;
              const nResolved = g.items.filter(isResolvedItem).length;
              const nOverdue = g.items.filter((i) => !isResolvedItem(i) && i.dueDate < today).length;
              const nPendingReview = g.items.filter((i) => i.status === "submitted").length;
              const nAwaitingClient = g.items.filter((i) => i.status === "pending" && i.suppliedBy === "client").length;
              const pct = total > 0 ? Math.round((nResolved / total) * 100) : 0;

              return (
                <Link
                  key={g.projectId}
                  href={`/compliance-tracker/${g.projectId}`}
                  className="group relative flex flex-col justify-between text-left rounded-2xl border border-slate-200/90 bg-white p-5 transition-all duration-200 hover:border-brand hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                >
                  <div>
                    {/* Header: Project ID, Name & Status Badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-brand transition-colors">
                            <span className="text-slate-400 font-mono mr-2">{g.projectId.slice(0, 8).toUpperCase()}</span>
                            {g.projectName}
                          </h3>
                        {g.location ? (
                          <p className="text-xs text-slate-500 truncate flex items-center gap-1 mb-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{g.location}</span>
                          </p>
                        ) : null}
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-700">{g.clientName}</span>
                        </p>
                      </div>
                      {nOverdue > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700 border border-red-200 shrink-0">
                          Overdue ({nOverdue})
                        </span>
                      ) : nPendingReview > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200 shrink-0">
                          Needs Review ({nPendingReview})
                        </span>
                      ) : pct === 100 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200 shrink-0">
                          100% Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200 shrink-0">
                          In Progress
                        </span>
                      )}
                    </div>

                    {/* Requirements Badges */}
                    <div className="flex flex-wrap gap-1.5 my-3">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {total} Requirements
                      </span>
                      {nResolved > 0 && (
                        <span className="inline-flex items-center rounded-md bg-emerald-100/70 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                          {nResolved} Passed
                        </span>
                      )}
                      {nAwaitingClient > 0 && (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {nAwaitingClient} Awaiting Client
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer: Progress Bar & Action CTA */}
                  <div className="pt-3 border-t border-slate-100 mt-2 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Compliance Progress</span>
                      <span className="font-bold text-slate-900">{pct}%</span>
                    </div>
                    <ProgressBar value={pct} size="sm" showLabel={false} />

                    <div className="flex items-center justify-between text-xs font-semibold text-brand pt-1 group-hover:underline">
                      <span>Open Compliance Tracker</span>
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
