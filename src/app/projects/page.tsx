"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  MapPin,
  Calendar,
  Users,
  Trash2,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import ProgressBar from "@/components/ui/ProgressBar";
import Modal from "@/components/ui/Modal";
import { formatCurrencyDecimal, formatDate, formatQuotationNumberFromReportId } from "@/lib/format";
import { getTodayInManila } from "@/lib/date-utils";
import { toast } from "@/lib/toast";
import type { Project, ProjectStatus, Priority, Technician } from "@/types";
import type { Report } from "@/types";
import type { Booking } from "@/types/client";

function sanitizeBudgetInput(raw: string): string {
  // Normalize comma decimal keyboards (e.g. numpad/locales) to dot.
  const normalized = raw.replace(/,/g, ".");
  const cleaned = normalized.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  const intPart = cleaned.slice(0, firstDot);
  const fracPart = cleaned.slice(firstDot + 1).replace(/\./g, "");
  return intPart + "." + fracPart;
}

type QuotationData = {
  clientName?: string;
  bookingId?: string;
  location?: string;
  materials?: string;
  technician?: string;
  installationStartDate?: string;
  installationEndDate?: string;
};

function parseQuotationData(description: string): QuotationData | null {
  try {
    const parsed = JSON.parse(description) as Record<string, unknown>;
    if (typeof parsed.clientName !== "string") return null;
    return parsed as QuotationData;
  } catch {
    return null;
  }
}

export default function ProjectsPage() {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectClient, setNewProjectClient] = useState("");
  const [newProjectLocation, setNewProjectLocation] = useState("");
  const [newProjectStartDate, setNewProjectStartDate] = useState("");
  const [newProjectEndDate, setNewProjectEndDate] = useState("");
  const [newProjectBudget, setNewProjectBudget] = useState("");
  const [newProjectPriority, setNewProjectPriority] = useState<Priority>("medium");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectLead, setNewProjectLead] = useState("");
  const [newProjectTechnicians, setNewProjectTechnicians] = useState<string[]>([]);
  const [showTechniciansDropdown, setShowTechniciansDropdown] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [projectsRes, techsRes, bookingsRes, reportsRes] = await Promise.all([
          fetch("/api/projects", { cache: "no-store" }),
          fetch("/api/technicians", { cache: "no-store" }),
          fetch("/api/bookings", { cache: "no-store" }),
          fetch("/api/reports", { cache: "no-store" }),
        ]);
        setAllProjects(projectsRes.ok ? (((await projectsRes.json()) as { items: Project[] }).items ?? []) : []);
        setTechnicians(techsRes.ok ? ((await techsRes.json()) as Technician[]) : []);
        setBookings(bookingsRes.ok ? ((await bookingsRes.json()) as Booking[]) : []);
        setReports(reportsRes.ok ? ((await reportsRes.json()) as Report[]) : []);
      } catch {
        setAllProjects([]);
        setTechnicians([]);
        setBookings([]);
        setReports([]);
      }
    };
    void load();
  }, []);

  const quotationClientOptions = useMemo(() => {
    return reports
      .filter((report) => report.type === "quotation" && report.status === "approved")
      .map((report) => {
        const qData = parseQuotationData(report.description);
        if (!qData?.clientName) return null;
        const booking = qData.bookingId
          ? bookings.find((item) => item.id === qData.bookingId)
          : undefined;
        const suggestedName = report.title.replace(/^Quotation\s*-\s*/i, "").trim();
        return {
          id: report.id,
          label: `${qData.clientName} - ${formatQuotationNumberFromReportId(report.id)}`,
          clientName: qData.clientName,
          userId: booking?.userId,
          bookingId: qData.bookingId,
          name: suggestedName || `Project - ${qData.clientName}`,
          location: qData.location ?? booking?.address ?? "",
          startDate: qData.installationStartDate ?? getTodayInManila(),
          endDate: qData.installationEndDate ?? qData.installationStartDate ?? getTodayInManila(),
          budget: report.amount ?? 0,
          description: qData.materials ?? "",
          technician: qData.technician ?? "",
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [bookings, reports]);

  const availableLeadTechnicians = useMemo(
    () => technicians.filter((technician) => technician.status === "available"),
    [technicians]
  );

  const filteredProjects = allProjects.filter((p: Project) => {
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusCounts = {
    all: allProjects.length,
    ongoing: allProjects.filter((p: Project) => p.status === "ongoing").length,
    completed: allProjects.filter((p: Project) => p.status === "completed").length,
    pending: allProjects.filter((p: Project) => p.status === "pending").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage and track all solar installation projects
          </p>
        </div>
        <Button
          icon={Plus}
          onClick={() => {
            setShowAddModal(true);
            setNewProjectClient("");
            setNewProjectLocation("");
            setNewProjectName("");
            setNewProjectStartDate("");
            setNewProjectEndDate("");
            setNewProjectBudget("");
            setNewProjectPriority("medium");
            setNewProjectDescription("");
            setNewProjectLead("");
            setNewProjectTechnicians([]);
            setShowTechniciansDropdown(false);
          }}
        >
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["all", "ongoing", "completed", "pending"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterStatus === status
                  ? "bg-brand text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}{" "}
              <span className="ml-1 opacity-75">
                {statusCounts[status]}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-56 rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="flex rounded-lg border border-slate-200 bg-white">
            <button
              onClick={() => setView("grid")}
              className={`flex h-9 w-9 items-center justify-center rounded-l-lg ${
                view === "grid" ? "bg-brand text-white" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex h-9 w-9 items-center justify-center rounded-r-lg border-l border-slate-200 ${
                view === "list" ? "bg-brand text-white" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project: Project) => (
            <div
              key={project.id}
              className="group relative rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-brand/30 hover:shadow-md"
            >
              <Link href={`/projects/${project.id}`} className="block">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-brand truncate">
                      {project.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{project.client}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {project.warrantyEndDate && (
                      <span
                        title={`Warranty until ${formatDate(project.warrantyEndDate)}`}
                        className="flex h-7 w-7 items-center justify-center rounded text-green-600"
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </span>
                    )}
                    <StatusBadge status={project.status} />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setProjectToDelete(project);
                      }}
                      title="Delete project"
                      className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs text-slate-500">
                    {project.assignedTechnicians.length} technician
                    {project.assignedTechnicians.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  {formatCurrencyDecimal(project.budget)}
                </span>
              </div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">
                  Project
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 hidden md:table-cell">
                  Client
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 hidden lg:table-cell">
                  Budget
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">
                  Progress
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 hidden lg:table-cell">
                  Deadline
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map((project: Project) => (
                <tr
                  key={project.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {project.warrantyEndDate && (
                        <span
                          title={`Warranty until ${formatDate(project.warrantyEndDate)}`}
                          className="flex text-green-600"
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </span>
                      )}
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-sm font-medium text-slate-900 hover:text-brand"
                      >
                        {project.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600 hidden md:table-cell">
                    {project.client}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-700 hidden lg:table-cell">
                    {formatCurrencyDecimal(project.budget)}
                  </td>
                  <td className="px-5 py-3.5 w-40">
                    <ProgressBar value={project.progress} />
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={project.status} />
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500 hidden lg:table-cell">
                    {formatDate(project.endDate)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end">
                      <button
                        onClick={() => setProjectToDelete(project)}
                        title="Delete project"
                        className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Project Modal */}
      <Modal
        isOpen={showAddModal}
          onClose={() => {
          setShowAddModal(false);
          setNewProjectClient("");
          setNewProjectLocation("");
          setNewProjectName("");
          setNewProjectStartDate("");
          setNewProjectEndDate("");
          setNewProjectBudget("");
          setNewProjectPriority("medium");
          setNewProjectDescription("");
          setNewProjectLead("");
          setNewProjectTechnicians([]);
          setShowTechniciansDropdown(false);
          }}
        title="New Project"
        size="lg"
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const client = quotationClientOptions.find((c) => c.id === newProjectClient);
            if (!newProjectName.trim()) {
              toast.error("Project name is required.");
              return;
            }
            if (!client) {
              toast.error("Please select an approved quotation.");
              return;
            }
            let created: Project | null = null;
            try {
              const bookingId = client.bookingId;
              const resolvedUserId = client.userId;

              const response = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: newProjectName.trim(),
                  client: client.clientName,
                  location: newProjectLocation.trim(),
                  startDate: newProjectStartDate || getTodayInManila(),
                  endDate: newProjectEndDate || getTodayInManila(),
                  budget: Number(newProjectBudget) || 0,
                  priority: newProjectPriority,
                  description: newProjectDescription.trim(),
                  projectLead: newProjectLead || undefined,
                  assignedTechnicians: newProjectTechnicians,
                  bookingId,
                  userId: resolvedUserId,
                }),
              });
              if (!response.ok) {
                toast.error("Failed to create project.");
                return;
              }
              created = (await response.json()) as Project;
              setAllProjects((prev) => [created!, ...prev]);
            } catch {
              toast.error("Failed to create project.");
              return;
            }
            setShowAddModal(false);
            setNewProjectClient("");
            setNewProjectLocation("");
            setNewProjectName("");
            setNewProjectStartDate("");
            setNewProjectEndDate("");
            setNewProjectBudget("");
            setNewProjectPriority("medium");
            setNewProjectDescription("");
            setNewProjectLead("");
            setNewProjectTechnicians([]);
            setShowTechniciansDropdown(false);
            toast.success(`Project "${created?.name ?? newProjectName.trim()}" created successfully.`);
          }}
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              placeholder="Enter project name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Client
              </label>
              <select
                value={newProjectClient}
                onChange={(e) => {
                  const clientId = e.target.value;
                  setNewProjectClient(clientId);
                  const client = quotationClientOptions.find((c) => c.id === clientId);
                  if (client) {
                    setNewProjectLocation(client.location);
                    setNewProjectStartDate(client.startDate);
                    setNewProjectEndDate(client.endDate);
                    setNewProjectBudget(String(client.budget));
                    const matchedTechnician = technicians.find(
                      (tech) =>
                        tech.name.trim().toLowerCase() === client.technician.trim().toLowerCase()
                    );
                    if (matchedTechnician) {
                      setNewProjectLead(matchedTechnician.id);
                      setNewProjectTechnicians((prev) =>
                        prev.includes(matchedTechnician.id) ? prev : [...prev, matchedTechnician.id]
                      );
                    }
                  } else {
                    setNewProjectLocation("");
                    setNewProjectStartDate("");
                    setNewProjectEndDate("");
                    setNewProjectBudget("");
                    setNewProjectLead("");
                    setNewProjectTechnicians([]);
                  }
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="">— Select approved quotation client —</option>
                {quotationClientOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={newProjectLocation}
                onChange={(e) => setNewProjectLocation(e.target.value)}
                readOnly
                disabled
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                placeholder="Project location (auto-filled from client)"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                min={getTodayInManila()}
                value={newProjectStartDate}
                onChange={(e) => setNewProjectStartDate(e.target.value)}
                readOnly
                disabled
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                min={getTodayInManila()}
                value={newProjectEndDate}
                onChange={(e) => setNewProjectEndDate(e.target.value)}
                readOnly
                disabled
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Budget
              </label>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={newProjectBudget}
                onChange={(e) => setNewProjectBudget(sanitizeBudgetInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
                    e.preventDefault();
                  }
                }}
                readOnly
                disabled
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={newProjectPriority}
                onChange={(e) => setNewProjectPriority(e.target.value as Priority)}
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
              Project Lead
            </label>
            <select
              value={newProjectLead}
              onChange={(e) => setNewProjectLead(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="">— Select project lead —</option>
              {availableLeadTechnicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name}
                </option>
              ))}
            </select>
            {availableLeadTechnicians.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                No available active technicians right now.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Technicians
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTechniciansDropdown((prev) => !prev)}
                className="flex min-h-[42px] w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-brand focus:ring-1 focus:ring-brand"
              >
                {newProjectTechnicians.length > 0 ? (
                  <span className="flex flex-wrap gap-1.5 pr-3">
                    {newProjectTechnicians.map((techId) => {
                      const label = technicians.find((tech) => tech.id === techId)?.name ?? techId;
                      return (
                        <span
                          key={techId}
                          className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                        >
                          {label}
                        </span>
                      );
                    })}
                  </span>
                ) : (
                  <span className="text-slate-400">Select technicians</span>
                )}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                    showTechniciansDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>
              {showTechniciansDropdown && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                  <div className="grid grid-cols-1 gap-2">
                    {technicians.map((tech) => {
                      const checked = newProjectTechnicians.includes(tech.id);
                      return (
                        <button
                          key={tech.id}
                          type="button"
                          onClick={() =>
                            setNewProjectTechnicians((prev) =>
                              checked ? prev.filter((id) => id !== tech.id) : [...prev, tech.id]
                            )
                          }
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                            checked
                              ? "border-brand bg-brand-50 text-brand"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <span className="font-medium">{tech.name}</span>
                          <span
                            className={`inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] font-bold ${
                              checked
                                ? "border-brand bg-brand text-white"
                                : "border-slate-300 text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              You can select multiple technicians.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
              placeholder="Project description..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Project</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Project Modal */}
      <Modal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        title="Delete Project"
      >
        {projectToDelete && (
          <>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">{projectToDelete.name}</span>
              ? This will remove all tasks and cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setProjectToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (!projectToDelete) return;
                  try {
                    const res = await fetch(`/api/projects/${projectToDelete.id}`, {
                      method: "DELETE",
                    });
                    if (!res.ok) {
                      toast.error("Failed to delete project.");
                      return;
                    }
                    setAllProjects((prev) =>
                      prev.filter((p) => p.id !== projectToDelete.id)
                    );
                    setProjectToDelete(null);
                    toast.success("Project deleted.");
                  } catch {
                    toast.error("Failed to delete project.");
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
