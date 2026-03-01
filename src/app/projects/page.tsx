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
} from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import ProgressBar from "@/components/ui/ProgressBar";
import Modal from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/format";
import { getTodayInManila } from "@/lib/date-utils";
import { toast } from "@/lib/toast";
import type { Project, ProjectStatus, Priority, Technician } from "@/types";
import type { Booking } from "@/types/client";

export default function ProjectsPage() {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [clientContacts, setClientContacts] = useState<{ id: string; name: string; company: string }[]>([]);
  const [clientsWithAddresses, setClientsWithAddresses] = useState<{ id: string; company: string; defaultAddress: string }[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
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
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [projectsRes, techsRes, contactsRes, addressesRes, bookingsRes] = await Promise.all([
          fetch("/api/projects", { cache: "no-store" }),
          fetch("/api/technicians", { cache: "no-store" }),
          fetch("/api/clients/contacts", { cache: "no-store" }),
          fetch("/api/clients/addresses", { cache: "no-store" }),
          fetch("/api/bookings", { cache: "no-store" }),
        ]);
        setAllProjects(projectsRes.ok ? (((await projectsRes.json()) as { items: Project[] }).items ?? []) : []);
        setTechnicians(techsRes.ok ? ((await techsRes.json()) as Technician[]) : []);
        setClientContacts(
          contactsRes.ok
            ? ((await contactsRes.json()) as { id: string; name: string; company: string }[])
            : []
        );
        setClientsWithAddresses(
          addressesRes.ok
            ? ((await addressesRes.json()) as { id: string; company: string; defaultAddress: string }[])
            : []
        );
        setBookings(bookingsRes.ok ? ((await bookingsRes.json()) as Booking[]) : []);
      } catch {
        setAllProjects([]);
        setTechnicians([]);
        setClientContacts([]);
        setClientsWithAddresses([]);
        setBookings([]);
      }
    };
    void load();
  }, []);

  const clientOptions = useMemo(() => {
    const serviceLabel = (value: Booking["serviceType"]) =>
      value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

    const baseOptions = clientContacts.map((contact) => {
      const addr = clientsWithAddresses.find((item) => item.id === contact.id);
      return {
        id: contact.id,
        name: contact.name,
        company: contact.company,
        defaultAddress: addr?.defaultAddress ?? "",
      };
    });

    const bookingOptions = bookings.map((booking) => ({
      id: `booking-${booking.id}`,
      name: `${booking.referenceNo} - ${serviceLabel(booking.serviceType)}`,
      company: `${booking.referenceNo} (${serviceLabel(booking.serviceType)})`,
      defaultAddress: booking.address,
    }));

    return [...baseOptions, ...bookingOptions];
  }, [bookings, clientContacts, clientsWithAddresses]);

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
                  {formatCurrency(project.budget)}
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
                    {formatCurrency(project.budget)}
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
          }}
        title="New Project"
        size="lg"
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const client = clientOptions.find((c) => c.id === newProjectClient);
            if (!newProjectName.trim()) {
              toast.error("Project name is required.");
              return;
            }
            if (!client) {
              toast.error("Please select a client.");
              return;
            }
            let created: Project | null = null;
            try {
              const bookingId =
                newProjectClient.startsWith("booking-")
                  ? newProjectClient.replace(/^booking-/, "")
                  : undefined;

              const response = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: newProjectName.trim(),
                  client: client.company,
                  location: newProjectLocation.trim() || client.defaultAddress || "",
                  startDate: newProjectStartDate || getTodayInManila(),
                  endDate: newProjectEndDate || getTodayInManila(),
                  budget: Number(newProjectBudget) || 0,
                  priority: newProjectPriority,
                  description: newProjectDescription.trim(),
                  projectLead: newProjectLead || undefined,
                  bookingId,
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
                  const client = clientOptions.find((c) => c.id === clientId);
                  if (client) {
                    setNewProjectLocation(client.defaultAddress);
                  } else {
                    setNewProjectLocation("");
                  }
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="">— Select client —</option>
                {clientOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
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
                value={newProjectStartDate}
                onChange={(e) => setNewProjectStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={newProjectEndDate}
                onChange={(e) => setNewProjectEndDate(e.target.value)}
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
                type="number"
                value={newProjectBudget}
                onChange={(e) => setNewProjectBudget(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                placeholder="0"
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
