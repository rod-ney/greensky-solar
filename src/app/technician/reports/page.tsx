"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Send,
  FileText,
  CheckCircle2,
  Clock,
  Eye,
  Trash2,
  Pencil,
  CalendarRange,
  Info,
  ChevronDown,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { formatDate } from "@/lib/format";
import { getTodayInManila } from "@/lib/date-utils";
import { useSessionUser } from "@/lib/client-session";
import { toast } from "@/lib/toast";
import type { Project, Report, Technician } from "@/types";
import type { Booking } from "@/types/client";
import { downloadQuotationReportPdf } from "@/lib/pdf/quotation-report-pdf";

type TechReport = {
  id: string;
  title: string;
  type: "service" | "quotation" | "revenue";
  projectName: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  description: string;
  amount?: number;
  clientApprovalStatus?: Report["clientApprovalStatus"];
  attachment?: string;
};

type QuotationData = {
  clientName: string;
  bookingId?: string;
  location?: string;
  clientNumber?: string;
  technician?: string;
  adminComment?: string;
  clientComment?: string;
  materials: string;
  materialItems?: {
    description: string;
    qty: number;
    amt: number;
    total: number;
  }[];
  installationStartDate: string;
  installationEndDate: string;
};

type MaterialItem = {
  description: string;
  qty: number;
  amt: number;
  total: number;
};

const EMPTY_MATERIAL_ITEM: MaterialItem = {
  description: "",
  qty: 1,
  amt: 0,
  total: 0,
};

function normalizeQuotationMaterialItems(data: QuotationData): MaterialItem[] {
  if (Array.isArray(data.materialItems) && data.materialItems.length > 0) {
    return data.materialItems.map((item) => ({
      description: item.description ?? "",
      qty: Number(item.qty) || 0,
      amt: Number(item.amt) || 0,
      total: Number(item.total) || 0,
    }));
  }
  return data.materials
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((description) => ({
      description,
      qty: 1,
      amt: 0,
      total: 0,
    }));
}

function parseQuotationData(description: string): QuotationData | null {
  try {
    const parsed = JSON.parse(description) as Record<string, unknown>;
    if (typeof parsed.clientName === "string" && typeof parsed.materials === "string") {
      return parsed as unknown as QuotationData;
    }
    return null;
  } catch {
    return null;
  }
}

function formatQuotationTechniciansFromIds(
  ids: string[],
  options: { id: string; name: string }[]
): string {
  return ids
    .map((id) => options.find((t) => t.id === id)?.name)
    .filter(Boolean)
    .join(", ");
}

function parseTechnicianIdsFromQuotation(
  data: QuotationData,
  options: { id: string; name: string }[]
): string[] {
  const raw = data.technician?.trim();
  if (!raw) return [];
  const names = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const ids: string[] = [];
  for (const name of names) {
    const match = options.find((t) => t.name === name);
    if (match && !ids.includes(match.id)) ids.push(match.id);
  }
  return ids;
}

const typeLabels: Record<TechReport["type"], string> = {
  service: "Service Report",
  quotation: "Quotation",
  revenue: "Revenue Report",
};

const statusColors: Record<TechReport["status"], string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

export default function TechnicianReportsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [techProfile, setTechProfile] = useState<Technician | null>(null);
  const [technicianOptions, setTechnicianOptions] = useState<Technician[]>([]);
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const sessionUser = useSessionUser();

  useEffect(() => {
    const load = async () => {
      try {
        const [projectsRes, techRes, reportsRes, bookingsRes, techListRes] = await Promise.all([
          fetch("/api/projects", { cache: "no-store" }),
          fetch("/api/profile/technician", { cache: "no-store" }),
          fetch("/api/reports", { cache: "no-store" }),
          fetch("/api/bookings", { cache: "no-store" }),
          fetch("/api/technicians", { cache: "no-store" }),
        ]);
        setProjects(projectsRes.ok ? (((await projectsRes.json()) as { items: Project[] }).items ?? []) : []);
        const techData = techRes.ok ? ((await techRes.json()) as Technician | null) : null;
        setTechProfile(techData);
        setTechnicianOptions(techListRes.ok ? ((await techListRes.json()) as Technician[]) : []);
        setAllReports(reportsRes.ok ? ((await reportsRes.json()) as Report[]) : []);
        setBookings(bookingsRes.ok ? ((await bookingsRes.json()) as Booking[]) : []);
      } catch {
        setProjects([]);
        setTechProfile(null);
        setTechnicianOptions([]);
        setAllReports([]);
        setBookings([]);
      }
    };
    void load();
  }, []);

  const myProjects = useMemo(
    () =>
      projects.filter((p) =>
        techProfile ? p.assignedTechnicians.includes(techProfile.id) : false
      ),
    [projects, techProfile]
  );

  const reports = useMemo<TechReport[]>(() => {
    const submittedByNames = new Set(
      [sessionUser.name, techProfile?.name].filter(Boolean) as string[]
    );

    return allReports
      .filter(
        (report) =>
          (report.type === "service" ||
            report.type === "quotation" ||
            report.type === "revenue") &&
          (submittedByNames.has(report.submittedBy) ||
            report.submittedBy === sessionUser.email)
      )
      .map((report) => ({
        id: report.id,
        title: report.title,
        type: report.type,
        projectName: report.projectName ?? "General",
        status: report.status,
        submittedAt: report.submittedAt,
        description: report.description ?? "",
        amount: report.amount,
        clientApprovalStatus: report.clientApprovalStatus ?? null,
      }));
  }, [allReports, sessionUser.email, sessionUser.name, techProfile?.name]);

  const completedSiteInspectionBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.status === "completed" &&
          booking.serviceType === "site_inspection"
      ),
    [bookings]
  );

  const [showCreate, setShowCreate] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [sendTarget, setSendTarget] = useState<"admin" | "client">("admin");
  const [selectedReport, setSelectedReport] = useState<TechReport | null>(null);
  const [viewTarget, setViewTarget] = useState<TechReport | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TechReport | null>(null);

  // Quotation form
  const [showQuotation, setShowQuotation] = useState(false);
  const [showQuotConfirm, setShowQuotConfirm] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<TechReport | null>(null);
  const [quotBookingId, setQuotBookingId] = useState("");
  const [quotClientName, setQuotClientName] = useState("");
  const [quotLocation, setQuotLocation] = useState("");
  const [quotClientNumber, setQuotClientNumber] = useState("");
  const [quotTechnicianIds, setQuotTechnicianIds] = useState<string[]>([]);
  const [showQuotTechniciansDropdown, setShowQuotTechniciansDropdown] = useState(false);
  const [quotMaterialItems, setQuotMaterialItems] = useState<MaterialItem[]>([
    { ...EMPTY_MATERIAL_ITEM },
  ]);
  const [quotTotal, setQuotTotal] = useState("");
  const [quotStartDate, setQuotStartDate] = useState("");
  const [quotEndDate, setQuotEndDate] = useState("");
  const [quotProject, setQuotProject] = useState("");
  const today = getTodayInManila();

  const serializedMaterials = useMemo(
    () =>
      quotMaterialItems
        .filter((item) => item.description.trim())
        .map(
          (item) =>
            `${item.description.trim()} | QTY: ${item.qty} | AMT: ${item.amt} | TOTAL: ${item.total}`
        )
        .join("\n"),
    [quotMaterialItems]
  );

  const canCreateQuotation =
    quotClientName.trim() &&
    serializedMaterials.trim() &&
    quotTotal &&
    quotStartDate &&
    quotEndDate;

  const resetQuotationForm = () => {
    setQuotBookingId("");
    setQuotClientName("");
    setQuotLocation("");
    setQuotClientNumber("");
    setQuotTechnicianIds(techProfile?.id ? [techProfile.id] : []);
    setShowQuotTechniciansDropdown(false);
    setQuotMaterialItems([{ ...EMPTY_MATERIAL_ITEM }]);
    setQuotTotal("");
    setQuotStartDate("");
    setQuotEndDate("");
    setQuotProject("");
    setEditingQuotation(null);
  };

  const openEditQuotation = (report: TechReport) => {
    const data = parseQuotationData(report.description);
    if (data) {
      setQuotClientName(data.clientName);
      setQuotBookingId(data.bookingId ?? "");
      setQuotLocation(data.location ?? "");
      setQuotClientNumber(data.clientNumber ?? "");
      const parsedIds = parseTechnicianIdsFromQuotation(data, technicianOptions);
      setQuotTechnicianIds(
        parsedIds.length > 0
          ? parsedIds
          : techProfile?.id
            ? [techProfile.id]
            : []
      );
      setShowQuotTechniciansDropdown(false);
      const parsedItems = normalizeQuotationMaterialItems(data);
      setQuotMaterialItems(
        parsedItems.length > 0 ? parsedItems : [{ ...EMPTY_MATERIAL_ITEM }]
      );
      setQuotTotal(report.amount?.toString() ?? "");
      setQuotStartDate(data.installationStartDate);
      setQuotEndDate(data.installationEndDate);
    } else {
      setQuotBookingId("");
      setQuotClientName("");
      setQuotLocation("");
      setQuotClientNumber("");
      setQuotTechnicianIds(techProfile?.id ? [techProfile.id] : []);
      setShowQuotTechniciansDropdown(false);
      setQuotMaterialItems([
        { ...EMPTY_MATERIAL_ITEM, description: report.description },
      ]);
      setQuotTotal(report.amount?.toString() ?? "");
      setQuotStartDate("");
      setQuotEndDate("");
    }
    setQuotProject("");
    setEditingQuotation(report);
    setShowQuotation(true);
  };

  const handleSelectQuotationBooking = (bookingId: string) => {
    setQuotBookingId(bookingId);
    const selectedBooking = completedSiteInspectionBookings.find((booking) => booking.id === bookingId);
    if (!selectedBooking) {
      setQuotClientName("");
      setQuotLocation("");
      setQuotClientNumber("");
      return;
    }
    setQuotClientName(selectedBooking.clientName?.trim() || "Unnamed client");
    setQuotLocation(selectedBooking.address);
    setQuotClientNumber(selectedBooking.clientContactNumber ?? "");
  };

  const updateMaterialItem = (
    index: number,
    key: keyof MaterialItem,
    value: string | number
  ) => {
    setQuotMaterialItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        if (key === "description") {
          return { ...item, description: String(value) };
        }
        const numValue = Math.max(0, Number(value) || 0);
        return { ...item, [key]: numValue };
      })
    );
  };

  const addMaterialItem = () => {
    setQuotMaterialItems((prev) => [...prev, { ...EMPTY_MATERIAL_ITEM }]);
  };

  const removeMaterialItem = (index: number) => {
    setQuotMaterialItems((prev) =>
      prev.length <= 1 ? [{ ...EMPTY_MATERIAL_ITEM }] : prev.filter((_, i) => i !== index)
    );
  };

  const handleSaveQuotation = () => {
    if (quotStartDate < today || quotEndDate < today) {
      toast.error("Past installation dates are not allowed.");
      return;
    }
    const proj = myProjects.find((p) => p.id === quotProject);
    const descriptionJson = JSON.stringify({
      clientName: quotClientName.trim(),
      bookingId: quotBookingId || undefined,
      location: quotLocation.trim(),
      clientNumber: quotClientNumber.trim(),
      technician: formatQuotationTechniciansFromIds(
        quotTechnicianIds,
        technicianOptions
      ).trim(),
      materials: serializedMaterials.trim(),
      materialItems: quotMaterialItems
        .filter((item) => item.description.trim())
        .map((item) => ({
          description: item.description.trim(),
          qty: item.qty,
          amt: item.amt,
          total: item.total,
        })),
      installationStartDate: quotStartDate,
      installationEndDate: quotEndDate,
    });
    const amount = parseFloat(quotTotal);

    const run = async () => {
      try {
        if (editingQuotation) {
          const response = await fetch(`/api/reports/${editingQuotation.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: `Quotation - ${quotClientName.trim()}`,
              description: descriptionJson,
              amount: isNaN(amount) ? undefined : amount,
              projectName: proj?.name ?? editingQuotation.projectName,
              projectId: quotProject || undefined,
            }),
          });
          const payload = (await response.json()) as Report | { error?: string };
          if (!response.ok) {
            toast.error("error" in payload && payload.error ? payload.error : "Failed to update quotation.");
            return;
          }
          const updated = payload as Report;
          setAllReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          setShowQuotation(false);
          setShowQuotConfirm(false);
          resetQuotationForm();
          toast.success("Quotation updated successfully.");
        } else {
          const response = await fetch("/api/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: `Quotation - ${quotClientName.trim()}`,
              type: "quotation",
              status: "pending",
              submittedBy: techProfile?.name ?? sessionUser.name,
              submittedAt: getTodayInManila(),
              projectName: proj?.name ?? "",
              amount: isNaN(amount) ? undefined : amount,
              description: descriptionJson,
            }),
          });
          const payload = (await response.json()) as Report | { error?: string };
          if (!response.ok) {
            toast.error("error" in payload && payload.error ? payload.error : "Failed to create quotation.");
            return;
          }
          const created = payload as Report;
          setAllReports((prev) => [created, ...prev]);
          setShowQuotation(false);
          setShowQuotConfirm(false);
          resetQuotationForm();
          toast.success("Quotation submitted to admin for review.");
        }
      } catch {
        toast.error("Failed to save quotation.");
      }
    };
    void run();
  };

  // Create form
  const [createTitle, setCreateTitle] = useState("");
  const [createType, setCreateType] = useState<TechReport["type"]>("service");
  const [createProject, setCreateProject] = useState("");
  const [createAttachment, setCreateAttachment] = useState<File | null>(null);
  const [createDescription, setCreateDescription] = useState("");

  const canCreate =
    createTitle.trim() && createProject && createType;

  const resetForm = () => {
    setCreateTitle("");
    setCreateType("service");
    setCreateProject("");
    setCreateAttachment(null);
    setCreateDescription("");
  };

  const handleCreate = () => {
    const proj = myProjects.find((p) => p.id === createProject);
    const run = async () => {
      try {
        const response = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: createTitle.trim(),
            type: createType,
            status: "pending",
              submittedBy: techProfile?.name ?? sessionUser.name,
            submittedAt: getTodayInManila(),
            projectName: proj?.name ?? "",
            description: `${createDescription.trim()}${createAttachment ? ` [attachment:${createAttachment.name}]` : ""}`.trim(),
          }),
        });
        const payload = (await response.json()) as Report | { error?: string };
        if (!response.ok) {
          toast.error(
            "error" in payload && payload.error
              ? payload.error
              : "Failed to submit report."
          );
          return;
        }
        const created = payload as Report;
        setAllReports((prev) => [created, ...prev]);
        setShowCreate(false);
        setShowConfirm(false);
        resetForm();
        toast.success("Report submitted to admin for review.");
      } catch {
        toast.error("Failed to submit report.");
      }
    };
    void run();
  };

  const handleSend = () => {
    if (!selectedReport) return;
    const selectedQuotationData =
      selectedReport.type === "quotation"
        ? parseQuotationData(selectedReport.description)
        : null;
    if (
      sendTarget === "client" &&
      selectedReport.type === "quotation" &&
      selectedReport.status !== "approved"
    ) {
      toast.error("You can only send a quotation to client after admin approval.");
      return;
    }
    if (
      sendTarget === "client" &&
      selectedReport.type === "quotation" &&
      !selectedQuotationData?.clientName?.trim()
    ) {
      toast.error("This quotation has no selected client.");
      return;
    }
    const run = async () => {
      if (selectedReport.type === "quotation" && sendTarget === "client") {
        const bookingId = selectedQuotationData?.bookingId?.trim();
        const booking = bookingId
          ? bookings.find((item) => item.id === bookingId)
          : undefined;
        const recipientId = booking?.userId?.trim();
        if (!recipientId) {
          toast.error("Selected quotation client is not linked to a user account.");
          return;
        }
        try {
          const response = await fetch("/api/reports/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reportId: selectedReport.id,
              recipientId,
            }),
          });
          if (!response.ok) {
            const payload = (await response.json()) as { error?: string };
            toast.error(payload.error ?? "Failed to send report to client.");
            return;
          }
        } catch {
          toast.error("Failed to send report to client.");
          return;
        }
      }

      setShowSendConfirm(false);
      setSelectedReport(null);
      toast.success(
        sendTarget === "admin"
          ? "Report sent to admin."
          : selectedReport.type === "quotation" && selectedQuotationData?.clientName
          ? `Report sent to ${selectedQuotationData.clientName}.`
          : "Report sent to client."
      );
    };
    void run();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/reports/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Failed to delete report.");
        return;
      }
      setAllReports((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Report deleted.");
    } catch {
      toast.error("Failed to delete report.");
    }
  };

  const handleDownloadQuotationPdf = async (report: TechReport) => {
    const qData = parseQuotationData(report.description);
    if (!qData) {
      toast.error("Quotation data is incomplete.");
      return;
    }
    try {
      await downloadQuotationReportPdf({
        reportId: report.id,
        submittedAt: report.submittedAt,
        submittedBy: techProfile?.name || sessionUser.name || "-",
        amount: report.amount,
        clientName: qData.clientName,
        location: qData.location,
        clientNumber: qData.clientNumber,
        technician: qData.technician || techProfile?.name || sessionUser.name,
        materialItems: normalizeQuotationMaterialItems(qData),
        dpPercent: 50,
      });
    } catch {
      toast.error("Failed to generate quotation PDF.");
    }
  };

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const approvedCount = reports.filter((r) => r.status === "approved").length;
  const canSendSelectedReportToClient =
    !selectedReport ||
    selectedReport.type !== "quotation" ||
    (selectedReport.status === "approved" &&
      !!parseQuotationData(selectedReport.description)?.clientName?.trim());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {reports.length} report{reports.length !== 1 ? "s" : ""} —{" "}
            {pendingCount} pending, {approvedCount} approved
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            icon={CalendarRange}
            onClick={() => {
              resetQuotationForm();
              setShowQuotation(true);
            }}
          >
            Create Quotation
          </Button>
          <Button
            icon={Plus}
            onClick={() => {
              resetForm();
              setShowCreate(true);
            }}
          >
            Submit Report
          </Button>
        </div>
      </div>

      {/* Reports List */}
      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {reports.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No reports submitted yet.
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex-shrink-0">
                {report.status === "approved" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {report.title}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[report.status]}`}
                  >
                    {report.status === "approved"
                      ? "Admin Approved"
                      : report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                  </span>
                  {report.clientApprovalStatus === "approved" && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                      Client Approved
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {typeLabels[report.type]} · {report.projectName}
                </p>
              </div>
              <span className="text-xs text-slate-400 hidden sm:block">
                {formatDate(report.submittedAt)}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setViewTarget(report)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  title="View"
                >
                  <Eye className="h-4 w-4" />
                </button>
                {report.type === "quotation" && (
                  <button
                    onClick={() => openEditQuotation(report)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                    title="Edit Quotation"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setDeleteTarget(report)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedReport(report);
                    setSendTarget("admin");
                    setShowSendConfirm(true);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <Send className="h-3 w-3" />
                  Send
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Report Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Submit Report"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Report Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              placeholder="e.g. Site Inspection - Phase 1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={createType}
                onChange={(e) =>
                  setCreateType(e.target.value as TechReport["type"])
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="service">Service Report</option>
                <option value="quotation">Quotation</option>
                <option value="revenue">Revenue Report</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={createProject}
                onChange={(e) => setCreateProject(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="">— Select project —</option>
                {myProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
              placeholder="Details about the report..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Attachment
            </label>
            <input
              type="file"
              onChange={(e) =>
                setCreateAttachment(e.target.files?.[0] ?? null)
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand hover:file:bg-brand-100"
              accept=".pdf,.jpg,.jpeg,.png"
            />
            {createAttachment && (
              <p className="mt-1.5 text-xs text-slate-500">
                {createAttachment.name}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button
              icon={FileText}
              onClick={() => setShowConfirm(true)}
              disabled={!canCreate}
            >
              Submit Report
            </Button>
          </div>
        </div>
      </Modal>

      {/* Submit Confirmation */}
      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirm Submission"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-slate-600">
            Are you sure you want to submit this report? It will be sent to
            admin for review.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate}>Confirm</Button>
          </div>
        </div>
      </Modal>

      {/* Quotation Modal (Create / Edit) — plain document */}
      <Modal
        isOpen={showQuotation}
        onClose={() => {
          setShowQuotation(false);
          resetQuotationForm();
        }}
        title={editingQuotation ? "Edit Quotation" : "Create Quotation"}
        size="lg"
      >
        <div className="space-y-4 pt-2">
          <div className="mt-1 w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <header className="mb-6 border-b border-slate-200 pb-4">
              <h2 className="text-xl font-semibold text-slate-900">Quotation</h2>
              <p className="mt-1 text-sm text-slate-600">
                Fill in the fields below. Dates and materials can be updated later if the client changes scope or schedule.
              </p>
            </header>

            <div className="space-y-5 text-sm">
                <div>
                  <p className="font-medium text-slate-700">
                    Date <span className="text-red-500">*</span>
                  </p>
                  <div className="mt-1.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs text-slate-500">Start</label>
                      <input
                        type="date"
                        value={quotStartDate}
                        onChange={(e) => setQuotStartDate(e.target.value)}
                        min={today}
                        className="mt-0.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">End</label>
                      <input
                        type="date"
                        value={quotEndDate}
                        onChange={(e) => setQuotEndDate(e.target.value)}
                        min={quotStartDate || today}
                        className="mt-0.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {quotStartDate && quotEndDate ? (
                      <>
                        <span className="text-slate-600">Period shown: </span>
                        {formatDate(quotStartDate)}
                        <span className="mx-1 text-slate-400">to</span>
                        {formatDate(quotEndDate)}
                        <span className="text-slate-500">
                          {" "}
                          — edit the fields above to change this range anytime before you save.
                        </span>
                      </>
                    ) : (
                      <>
                        Choose a start and end date above. The line below will show the range; you can change dates here or when editing the quotation later.
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <label className="block font-medium text-slate-700">
                    Client <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={quotBookingId}
                    onChange={(e) => handleSelectQuotationBooking(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  >
                    <option value="">— Select completed site inspection booking —</option>
                    {completedSiteInspectionBookings.map((booking) => {
                      const clientLabel = booking.clientName?.trim() || "Unnamed client";
                      return (
                        <option key={booking.id} value={booking.id}>
                          {booking.referenceNo} - {clientLabel}
                        </option>
                      );
                    })}
                    {quotClientName && !quotBookingId &&
                      !completedSiteInspectionBookings.some(
                        (booking) =>
                          (booking.clientName?.trim() || "Unnamed client") === quotClientName
                      ) && <option value="">{quotClientName}</option>}
                  </select>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Only completed site inspection bookings are available.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-medium text-slate-700">Location</label>
                    <input
                      type="text"
                      value={quotLocation}
                      readOnly
                      disabled
                      className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-80"
                      placeholder="Client Location"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700">Number</label>
                    <input
                      type="text"
                      value={quotClientNumber}
                      readOnly
                      disabled
                      className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-80"
                      placeholder="Client Contact Number"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700">Technicians</label>
                  <div className="relative mt-1.5">
                    <button
                      type="button"
                      onClick={() => setShowQuotTechniciansDropdown((prev) => !prev)}
                      className="flex min-h-[42px] w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-brand focus:ring-1 focus:ring-brand"
                    >
                      {quotTechnicianIds.length > 0 ? (
                        <span className="flex flex-wrap gap-1.5 pr-3">
                          {quotTechnicianIds.map((techId) => {
                            const label =
                              technicianOptions.find((tech) => tech.id === techId)?.name ??
                              techId;
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
                          showQuotTechniciansDropdown ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {showQuotTechniciansDropdown && (
                      <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                        <div className="grid grid-cols-1 gap-2">
                          {technicianOptions.map((tech) => {
                            const checked = quotTechnicianIds.includes(tech.id);
                            return (
                              <button
                                key={tech.id}
                                type="button"
                                onClick={() =>
                                  setQuotTechnicianIds((prev) =>
                                    checked
                                      ? prev.filter((id) => id !== tech.id)
                                      : [...prev, tech.id]
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

                </div>
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="block font-medium text-slate-700">
                      Subject: Items / Materials for <span className="text-red-500">*</span>
                    </label>
                    <Button type="button" variant="outline" onClick={addMaterialItem}>
                      Add Line
                    </Button>
                  </div>
                  <div className="mt-1.5 space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500">
                      <p className="col-span-5">Description</p>
                      <p className="col-span-2">QUANTITY</p>
                      <p className="col-span-2">AMOUNT</p>
                      <p className="col-span-2">TOTAL</p>
                    
                    </div>
                    {quotMaterialItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            updateMaterialItem(index, "description", e.target.value)
                          }
                          className="col-span-5 rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                          placeholder="Material description"
                        />
                        <div className="col-span-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateMaterialItem(index, "qty", item.qty - 1)}
                            className="h-9 w-9 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={item.qty}
                            onChange={(e) => updateMaterialItem(index, "qty", e.target.value)}
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-center text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                          />
                          <button
                            type="button"
                            onClick={() => updateMaterialItem(index, "qty", item.qty + 1)}
                            className="h-9 w-9 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            +
                          </button>
                        </div>
                        <div className="col-span-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateMaterialItem(index, "amt", item.amt - 1)}
                            className="h-9 w-9 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.amt}
                            onChange={(e) => updateMaterialItem(index, "amt", e.target.value)}
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-center text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                          />
                          <button
                            type="button"
                            onClick={() => updateMaterialItem(index, "amt", item.amt + 1)}
                            className="h-9 w-9 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            +
                          </button>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.total}
                          onChange={(e) => updateMaterialItem(index, "total", e.target.value)}
                          className="col-span-2 rounded-md border border-slate-200 bg-white px-2 py-2 text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                        />
                        <button
                          type="button"
                          onClick={() => removeMaterialItem(index)}
                          className="col-span-1 rounded-md border border-slate-200 px-2 py-2 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          -
                        </button>
                      </div>
                    ))}
                  </div>

                </div>
                <div>
                  <label className="block font-medium text-slate-700">
                    Total amount (PHP) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quotTotal}
                    onChange={(e) => setQuotTotal(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 tabular-nums text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                    placeholder="0.00"
                  />
                </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setShowQuotation(false);
                resetQuotationForm();
              }}
            >
              Cancel
            </Button>
            <Button
              icon={FileText}
              onClick={() => setShowQuotConfirm(true)}
              disabled={!canCreateQuotation}
            >
              {editingQuotation ? "Save Changes" : "Submit Quotation"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Quotation Confirmation */}
      <Modal
        isOpen={showQuotConfirm}
        onClose={() => setShowQuotConfirm(false)}
        title={editingQuotation ? "Confirm Changes" : "Confirm Quotation"}
        size="sm"
        zIndex={60}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-slate-600">
            {editingQuotation
              ? "Are you sure you want to save the changes to this quotation?"
              : "Are you sure you want to submit this quotation? It will be sent to admin for review."}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowQuotConfirm(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveQuotation}>Confirm</Button>
          </div>
        </div>
      </Modal>

      {/* View Report Details Modal */}
      <Modal
        isOpen={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title={viewTarget?.title ?? "Report Details"}
        size="md"
      >
        {viewTarget && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[viewTarget.status]}`}
              >
                {viewTarget.status === "approved"
                  ? "Admin Approved"
                  : viewTarget.status.charAt(0).toUpperCase() + viewTarget.status.slice(1)}
              </span>
              {viewTarget.clientApprovalStatus === "approved" && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  Client Approved
                </span>
              )}
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {typeLabels[viewTarget.type]}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Project</span>
                <span className="font-medium text-slate-900">
                  {viewTarget.projectName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Submitted</span>
                <span className="font-medium text-slate-900">
                  {formatDate(viewTarget.submittedAt)}
                </span>
              </div>
            </div>
            {viewTarget.type === "quotation" && (() => {
              const qData = parseQuotationData(viewTarget.description);
              if (!qData) return null;
              return (
                <div className="space-y-3 rounded-lg bg-slate-50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Client Name</span>
                    <span className="font-medium text-slate-900">{qData.clientName}</span>
                  </div>
                  {viewTarget.amount != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total Amount</span>
                      <span className="font-medium text-slate-900">
                        {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(viewTarget.amount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Installation Date</span>
                    <span className="font-medium text-slate-900">
                      {formatDate(qData.installationStartDate)} — {formatDate(qData.installationEndDate)}
                    </span>
                  </div>
                  {qData.adminComment && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-2">
                      <p className="text-xs font-medium text-red-700">Admin Rejection Note</p>
                      <p className="text-sm text-red-700">{qData.adminComment}</p>
                    </div>
                  )}
                  {qData.clientComment && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-2">
                      <p className="text-xs font-medium text-amber-700">Client Rejection Note</p>
                      <p className="text-sm text-amber-700">{qData.clientComment}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Materials Needed</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{qData.materials}</p>
                  </div>
                </div>
              );
            })()}
            {(viewTarget.type !== "quotation" || !parseQuotationData(viewTarget.description)) && viewTarget.description && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">
                  Description
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap rounded-lg bg-slate-50 p-3">
                  {viewTarget.description}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              {viewTarget.type === "quotation" && parseQuotationData(viewTarget.description) && (
                <Button
                  variant="primary"
                  onClick={() => {
                    void handleDownloadQuotationPdf(viewTarget);
                  }}
                >
                  Download PDF
                </Button>
              )}
              <Button variant="danger" onClick={() => setViewTarget(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Report"
        size="sm"
      >
        {deleteTarget && (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">
                &ldquo;{deleteTarget.title}&rdquo;
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Send Confirmation */}
      <Modal
        isOpen={showSendConfirm}
        onClose={() => setShowSendConfirm(false)}
        title="Send Report"
        size="sm"
      >
        {selectedReport && (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-slate-600">
              Send{" "}
              <span className="font-semibold text-slate-900">
                &ldquo;{selectedReport.title}&rdquo;
              </span>{" "}
              to:
            </p>
            <div className="flex gap-3">
              <label
                className={`flex-1 rounded-lg border p-3 text-center text-sm font-medium transition-colors ${
                  sendTarget === "admin"
                    ? "border-brand bg-brand/5 text-brand"
                    : "cursor-pointer border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="sendTarget"
                  value="admin"
                  checked={sendTarget === "admin"}
                  onChange={() => {
                    setSendTarget("admin");
                  }}
                  className="sr-only"
                />
                Admin
              </label>
              <label
                className={`flex-1 rounded-lg border p-3 text-center text-sm font-medium transition-colors ${
                  !canSendSelectedReportToClient
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                    : sendTarget === "client"
                    ? "border-brand bg-brand/5 text-brand"
                    : "cursor-pointer border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="sendTarget"
                  value="client"
                  checked={sendTarget === "client"}
                  onChange={() => {
                    if (!canSendSelectedReportToClient) return;
                    setSendTarget("client");
                  }}
                  disabled={!canSendSelectedReportToClient}
                  className="sr-only"
                />
                Client
              </label>
            </div>
            {!canSendSelectedReportToClient && (
              <p className="flex gap-2 text-xs text-amber-700">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                  aria-hidden
                />
                <span>
                This must be reviewed by the admin prior to enabling client unlock requests.
                </span>
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowSendConfirm(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSend}>
                Send
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
