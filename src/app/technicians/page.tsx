"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Mail,
  Phone,
  Star,
  FolderKanban,
  Briefcase,
} from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import type { Technician, User } from "@/types";

type TechFilter = "all" | "available" | "busy" | "on_leave";

const SPECIALIZATIONS = [
  "Rooftop Installation",
  "Electrical Systems",
  "Commercial Systems",
  "Engineering Design",
  "Ground Mount Systems",
  "Battery Storage",
  "Maintenance & Inspection",
  "Rural & Agricultural Solar",
] as const;

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<TechFilter>("all");
  useEffect(() => {
    const loadTechnicians = async () => {
      try {
        const response = await fetch("/api/technicians", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as Technician[];
        setTechnicians(data);
      } catch {
        setTechnicians([]);
      }
    };
    void loadTechnicians();
  }, []);
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch("/api/users", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as User[];
        setUsers(data);
      } catch {
        setUsers([]);
      }
    };
    void loadUsers();
  }, []);

  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [addUserId, setAddUserId] = useState("");
  const [addSpecialization, setAddSpecialization] =
    useState<(typeof SPECIALIZATIONS)[number]>("Rooftop Installation");
  const [addError, setAddError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const filteredTechs = technicians.filter((t) => {
    const matchesFilter = filter === "all" || t.status === filter;
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.specialization.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const statusCounts = {
    all: technicians.length,
    available: technicians.filter((t) => t.status === "available").length,
    busy: technicians.filter((t) => t.status === "busy").length,
    on_leave: technicians.filter((t) => t.status === "on_leave").length,
  };

  const selected = selectedTech
    ? technicians.find((t) => t.id === selectedTech)
    : null;

  const technicianUserIds = new Set(
    technicians.map((t) => t.userId).filter(Boolean)
  );
  const technicianEmails = new Set(technicians.map((t) => t.email.toLowerCase()));
  const availableTechnicianUsers = users.filter(
    (u) =>
      u.role === "technician" &&
      !technicianUserIds.has(u.id) &&
      !technicianEmails.has(u.email.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Technicians</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage technician profiles and assignments
          </p>
        </div>
        <Button icon={Plus} onClick={() => setShowAddModal(true)}>
          Add Technician
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["all", "available", "busy", "on_leave"] as const).map((status) => (
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
                : status === "on_leave"
                ? "On Leave"
                : status.charAt(0).toUpperCase() + status.slice(1)}{" "}
              <span className="ml-1 opacity-75">{statusCounts[status]}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search technicians..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-56 rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredTechs.map((tech) => (
          <button
            key={tech.id}
            onClick={() =>
              setSelectedTech(selectedTech === tech.id ? null : tech.id)
            }
            className={`rounded-xl border bg-white p-5 text-left transition-all hover:shadow-md ${
              selectedTech === tech.id
                ? "border-brand ring-1 ring-brand/20"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                {tech.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {tech.name}
                  </p>
                  <StatusBadge status={tech.status} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{tech.specialization}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="text-center rounded-lg bg-slate-50 py-2">
                <p className="text-lg font-bold text-slate-900">{tech.projectsCompleted}</p>
                <p className="text-[10px] text-slate-500">Completed</p>
              </div>
              <div className="text-center rounded-lg bg-slate-50 py-2">
                <p className="text-lg font-bold text-slate-900">{tech.activeProjects}</p>
                <p className="text-[10px] text-slate-500">Active</p>
              </div>
              <div className="text-center rounded-lg bg-slate-50 py-2">
                <div className="flex items-center justify-center gap-0.5">
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  <p className="text-lg font-bold text-slate-900">{tech.rating}</p>
                </div>
                <p className="text-[10px] text-slate-500">Rating</p>
              </div>
            </div>

            <div className="mt-3 space-y-1.5 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">{tech.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Phone className="h-3.5 w-3.5" />
                <span>{tech.phone}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Technician Detail Panel */}
      {selected && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-lg font-bold text-brand">
              {selected.avatar}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900">{selected.name}</h2>
                <StatusBadge status={selected.status} size="md" />
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{selected.specialization}</p>

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-900 truncate">
                    {selected.email}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Phone className="h-3.5 w-3.5" />
                    Phone
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {selected.phone}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <FolderKanban className="h-3.5 w-3.5" />
                    Projects
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {selected.projectsCompleted} completed · {selected.activeProjects} active
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Briefcase className="h-3.5 w-3.5" />
                    Joined
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {new Date(selected.joinDate).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Performance Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-600">Performance Rating</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {selected.rating} / 5.0
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${(selected.rating / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Technician Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setAddUserId("");
          setAddError("");
        }}
        title="Add Technician"
        size="lg"
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!addUserId) {
              setAddError("Please select a user.");
              return;
            }
            try {
              setIsAdding(true);
              setAddError("");
              const response = await fetch("/api/technicians", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId: addUserId,
                  specialization: addSpecialization,
                }),
              });
              const payload = (await response.json()) as
                | Technician
                | { error?: string };
              if (!response.ok) {
                setAddError(
                  "error" in payload && payload.error
                    ? payload.error
                    : "Failed to add technician."
                );
                return;
              }
              const newTech = payload as Technician;
              setTechnicians((prev) => [...prev, newTech]);
              setShowAddModal(false);
              setAddUserId("");
            } catch {
              setAddError("Failed to add technician.");
            } finally {
              setIsAdding(false);
            }
          }}
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select User
            </label>
            <select
              value={addUserId}
              onChange={(e) => {
                setAddUserId(e.target.value);
                setAddError("");
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="">Choose a user with technician role...</option>
              {availableTechnicianUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {u.email ? ` (${u.email})` : ""}
                </option>
              ))}
            </select>
            {availableTechnicianUsers.length === 0 && (
              <p className="mt-1 text-xs text-slate-500">
                No users with technician role available. Assign technician role
                in User Management first, or all have technician profiles already.
              </p>
            )}
          </div>

          {addUserId && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <p className="text-xs font-medium text-slate-500">
                From User Management
              </p>
              {(() => {
                const u = users.find((x) => x.id === addUserId);
                if (!u) return null;
                return (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-slate-900">{u.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-slate-900">
                        {u.contactNumber
                          ? `+63 ${u.contactNumber}`
                          : "— No contact number"}
                      </span>
                    </div>
                    {!u.contactNumber && (
                      <p className="text-xs text-amber-600">
                        Add contact number in User Management first.
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Specialization
            </label>
            <select
              value={addSpecialization}
              onChange={(e) =>
                setAddSpecialization(
                  e.target.value as (typeof SPECIALIZATIONS)[number]
                )
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              {SPECIALIZATIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {addError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {addError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setAddUserId("");
                setAddError("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isAdding}>
              {isAdding ? "Adding..." : "Add Technician"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
