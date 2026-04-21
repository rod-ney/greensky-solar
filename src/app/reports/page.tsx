"use client";

import { useMemo, useState, useEffect } from "react";
import {
  FileText,
  FileCheck,
  DollarSign,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Send,
  Plus,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/format";
import { getTodayInManila } from "@/lib/date-utils";
import { toast } from "@/lib/toast";
import type { Project, Report, Technician } from "@/types";
import type { DocumentType } from "@/types/client";
import { downloadQuotationReportPdf } from "@/lib/pdf/quotation-report-pdf";

const createReportTypes: { value: DocumentType; label: string }[] = [
  { value: "warranty", label: "Warranty" },
  { value: "permit", label: "Permits" },
  { value: "contract", label: "Contracts" },
];

type ReportTab = "all" | "service" | "quotation" | "revenue";

const typeIcons: Record<string, React.ReactNode> = {
  service: <FileText className="h-4 w-4 text-blue-500" />,
  quotation: <FileCheck className="h-4 w-4 text-amber-500" />,
  revenue: <DollarSign className="h-4 w-4 text-green-500" />,
};

const typeLabels: Record<string, string> = {
  service: "Service Report",
  quotation: "Quotation",
  revenue: "Revenue Report",
};

const typeBgs: Record<string, string> = {
  service: "bg-blue-50",
  quotation: "bg-amber-50",
  revenue: "bg-green-50",
};

const clientApprovalStyles: Record<string, string> = {
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
};

function parseReportDescription(desc: string): {
  cleanText: string;
  techType?: string;
  attachment?: string;
} {
  let cleanText = desc;
  let techType: string | undefined;
  let attachment: string | undefined;
  const techMatch = desc.match(/\[techType:([^\]]+)\]/);
  if (techMatch) {
    techType = techMatch[1];
    cleanText = cleanText.replace(techMatch[0], "").trim();
  }
  const attachMatch = desc.match(/\[attachment:([^\]]+)\]/);
  if (attachMatch) {
    attachment = attachMatch[1];
    cleanText = cleanText.replace(attachMatch[0], "").trim();
  }
  cleanText = cleanText.replace(/\s+/g, " ").trim();
  return { cleanText, techType, attachment };
}

type QuotationMaterialItem = {
  description: string;
  qty: number;
  amt: number;
  total: number;
};

type QuotationPayload = {
  clientName?: string;
  location?: string;
  clientNumber?: string;
  technician?: string;
  adminComment?: string;
  clientComment?: string;
  installationStartDate?: string;
  installationEndDate?: string;
  materials?: string;
  materialItems?: QuotationMaterialItem[];
};

function parseQuotationPayload(desc: string): QuotationPayload | null {
  try {
    const parsed = JSON.parse(desc) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed == null) return null;
    if (typeof parsed.clientName !== "string") return null;
    return parsed as QuotationPayload;
  } catch {
    return null;
  }
}

function getQuotationPreview(desc: string): string {
  const q = parseQuotationPayload(desc);
  if (!q) return desc;
  const parts = [
    q.clientName ? `Client: ${q.clientName}` : null,
    q.location ? `Location: ${q.location}` : null,
    q.installationStartDate && q.installationEndDate
      ? `Installation: ${q.installationStartDate} to ${q.installationEndDate}`
      : null,
    q.technician ? `Technician: ${q.technician}` : null,
  ].filter(Boolean);
  return parts.join(" | ");
}

function safeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "").trim();
}

type ClientOption = { id: string; name: string; email?: string };

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tab, setTab] = useState<ReportTab>("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [sendReportTarget, setSendReportTarget] = useState<Report | null>(null);
  const [recipientType, setRecipientType] = useState<"client" | "technician">("client");
  const [recipientId, setRecipientId] = useState("");

  const [showCreateReport, setShowCreateReport] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createType, setCreateType] = useState<DocumentType>("warranty");
  const [createProject, setCreateProject] = useState("");
  const [createAttachment, setCreateAttachment] = useState<File | null>(null);

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [pendingCloseAction, setPendingCloseAction] = useState<
    "detail" | "send" | "create" | null
  >(null);

  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  const loadReports = async () => {
    try {
      const res = await fetch("/api/reports", { cache: "no-store" });
      if (res.ok) setReports((await res.json()) as Report[]);
    } catch {
      setReports([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [reportsRes, techsRes, contactsRes, usersRes, projectsRes] = await Promise.all([
          fetch("/api/reports", { cache: "no-store" }),
          fetch("/api/technicians", { cache: "no-store" }),
          fetch("/api/clients/contacts", { cache: "no-store" }),
          fetch("/api/users", { cache: "no-store" }),
          fetch("/api/projects", { cache: "no-store" }),
        ]);
        setReports(reportsRes.ok ? ((await reportsRes.json()) as Report[]) : []);
        setTechnicians(techsRes.ok ? ((await techsRes.json()) as Technician[]) : []);
        const contacts = contactsRes.ok
          ? ((await contactsRes.json()) as { id: string; name: string; company: string }[])
          : [];
        const users = usersRes.ok
          ? ((await usersRes.json()) as { id: string; name: string; email: string; role: string }[])
          : [];
        const clientUsers = users
          .filter((u) => u.role === "client")
          .map((u) => ({ id: u.id, name: u.name, email: u.email }));
        setClientOptions(
          clientUsers.length > 0 ? clientUsers : contacts.map((c) => ({ id: c.id, name: c.name }))
        );
        setProjects(projectsRes.ok ? (((await projectsRes.json()) as { items: Project[] }).items ?? []) : []);
      } catch {
        setReports([]);
        setTechnicians([]);
        setClientOptions([]);
        setProjects([]);
      }
    };
    void load();
  }, []);

  const filteredReports =
    tab === "all" ? reports : reports.filter((r) => r.type === tab);

  const typeCounts = {
    all: reports.length,
    service: reports.filter((r) => r.type === "service").length,
    quotation: reports.filter((r) => r.type === "quotation").length,
    revenue: reports.filter((r) => r.type === "revenue").length,
  };

  const monthlyRevenueData = useMemo(() => {
    const grouped = new Map<string, number>();
    reports
      .filter((r) => r.type === "revenue" && typeof r.amount === "number")
      .forEach((report) => {
        const month = new Date(report.submittedAt).toLocaleDateString("en-US", {
          month: "short",
        });
        grouped.set(month, (grouped.get(month) ?? 0) + (report.amount ?? 0));
      });
    return Array.from(grouped.entries()).map(([month, revenue]) => ({ month, revenue }));
  }, [reports]);

  const totalRevenue = monthlyRevenueData.reduce((sum, d) => sum + d.revenue, 0);
  const maxRevenue = Math.max(1, ...monthlyRevenueData.map((d) => d.revenue));
  const pendingQuotations = reports.filter(
    (r) => r.type === "quotation" && r.status === "pending"
  ).length;

  const openSendModal = (report: Report) => {
    setSendReportTarget(report);
    if (report.type === "quotation") {
      const q = parseQuotationPayload(report.description);
      const matchedClient = clientOptions.find(
        (c) =>
          c.name.trim().toLowerCase() === (q?.clientName ?? "").trim().toLowerCase()
      );
      setRecipientType("client");
      setRecipientId(matchedClient?.id ?? "");
      return;
    }
    setRecipientType("client");
    setRecipientId(clientOptions[0]?.id ?? "");
  };

  const closeSendModal = () => {
    setSendReportTarget(null);
    setRecipientId("");
  };

  const requestClose = (action: "detail" | "send" | "create") => {
    setPendingCloseAction(action);
    setShowCloseConfirm(true);
  };

  const handleCloseConfirm = () => {
    if (pendingCloseAction === "detail") {
      setShowDetailModal(false);
      setSelectedReport(null);
    } else if (pendingCloseAction === "send") {
      closeSendModal();
    } else if (pendingCloseAction === "create") {
      setShowCreateReport(false);
    }
    setShowCloseConfirm(false);
    setPendingCloseAction(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSendReport = async () => {
    if (!sendReportTarget || !recipientId) return;
    if (
      sendReportTarget.type === "quotation" &&
      (!quotationLockedClient ||
        recipientType !== "client" ||
        recipientId !== quotationLockedClient.id)
    ) {
      toast.error("You can only send this quotation to its selected client.");
      return;
    }
    const recipient =
      recipientType === "client"
        ? clientOptions.find((c) => c.id === recipientId)?.name
        : technicians.find((t) => t.id === recipientId)?.name;
    if (recipientType === "client") {
      try {
        const response = await fetch("/api/reports/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportId: sendReportTarget.id,
            recipientId,
          }),
        });
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          toast.error(payload.error ?? "Failed to send report.");
          return;
        }
      } catch {
        toast.error("Failed to send report.");
        return;
      }
    }
    toast.success(`Report sent to ${recipient ?? "recipient"}`);
    closeSendModal();
    setShowSendConfirm(false);
    if (recipientType === "client") void loadReports();
  };

  const handleCreateReportConfirm = async () => {
    if (!createTitle.trim()) return;
    const today = getTodayInManila();
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTitle.trim(),
          type: "service",
          submittedBy: "Admin",
          submittedAt: today,
          amount: undefined,
          projectName: createProject || undefined,
          status: "pending",
          description: `${createType.toUpperCase()} report${createAttachment ? ` - ${createAttachment.name} (${formatFileSize(createAttachment.size)})` : ""}`,
        }),
      });
      if (!response.ok) {
        toast.error("Failed to create report.");
        return;
      }
      const created = (await response.json()) as Report;
      setReports((prev) => [created, ...prev]);
    } catch {
      toast.error("Failed to create report.");
      return;
    }
    setShowCreateReport(false);
    setShowCreateConfirm(false);
    toast.success("Report created successfully.");
  };

  const handleApproveConfirm = () => {
    const run = async () => {
      if (!selectedReport) return;
      try {
        const response = await fetch(`/api/reports/${selectedReport.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        });
        const payload = (await response.json()) as Report | { error?: string };
        if (!response.ok) {
          toast.error(
            "error" in payload && payload.error
              ? payload.error
              : "Failed to approve report."
          );
          return;
        }
        const updated = payload as Report;
        setReports((prev) =>
          prev.map((report) => (report.id === updated.id ? updated : report))
        );
        setShowDetailModal(false);
        setSelectedReport(null);
        setShowApproveConfirm(false);
        toast.success("Report approved.");
      } catch {
        toast.error("Failed to approve report.");
      }
    };
    void run();
  };

  const handleRejectConfirm = () => {
    const run = async () => {
      if (!selectedReport) return;
      try {
        if (selectedReport.type === "quotation") {
          const qData = parseQuotationPayload(selectedReport.description);
          if (qData) {
            const descriptionWithComment = JSON.stringify({
              ...qData,
              adminComment: rejectComment.trim() || undefined,
            });
            const putRes = await fetch(`/api/reports/${selectedReport.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: selectedReport.title,
                description: descriptionWithComment,
                amount: selectedReport.amount ?? null,
                projectName: selectedReport.projectName ?? null,
              }),
            });
            if (!putRes.ok) {
              const payload = (await putRes.json()) as { error?: string };
              toast.error(payload.error ?? "Failed to save rejection note.");
              return;
            }
          }
        }
        const response = await fetch(`/api/reports/${selectedReport.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "rejected" }),
        });
        const payload = (await response.json()) as Report | { error?: string };
        if (!response.ok) {
          toast.error(
            "error" in payload && payload.error
              ? payload.error
              : "Failed to reject report."
          );
          return;
        }
        const updated = payload as Report;
        setReports((prev) =>
          prev.map((report) => (report.id === updated.id ? updated : report))
        );
        setShowDetailModal(false);
        setSelectedReport(null);
        setShowRejectConfirm(false);
        setRejectComment("");
        toast.success("Report rejected.");
      } catch {
        toast.error("Failed to reject report.");
      }
    };
    void run();
  };

  const handleDeleteReport = () => {
    const run = async () => {
      if (!deleteTarget) return;
      try {
        const res = await fetch(`/api/reports/${deleteTarget.id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          toast.error(data.error ?? "Failed to delete report.");
          return;
        }
        setReports((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        if (selectedReport?.id === deleteTarget.id) {
          setSelectedReport(null);
          setShowDetailModal(false);
        }
        setDeleteTarget(null);
        toast.success("Report deleted.");
      } catch {
        toast.error("Failed to delete report.");
      }
    };
    void run();
  };

  const handleDownloadReportPdf = async (report: Report) => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      if (report.type === "quotation") {
        const q = parseQuotationPayload(report.description);
        if (!q) {
          toast.error("Quotation data is incomplete.");
          return;
        }
        const materialItems =
          Array.isArray(q.materialItems) && q.materialItems.length > 0
            ? q.materialItems
            : (q.materials ?? "")
                .split("\n")
                .map((entry) => entry.trim())
                .filter(Boolean)
                .map((entry) => ({
                  description: entry,
                  qty: 1,
                  amt: 0,
                  total: 0,
                }));
        await downloadQuotationReportPdf({
          reportId: report.id,
          submittedAt: report.submittedAt,
          submittedBy: report.submittedBy,
          amount: report.amount,
          clientName: q.clientName,
          location: q.location,
          clientNumber: q.clientNumber,
          technician: q.technician || report.submittedBy,
          materialItems,
          dpPercent: 50,
        });
      } else {
        const left = 14;
        const right = 196;
        let y = 18;
        const line = (label: string, value: string) => {
          doc.setFont("helvetica", "bold");
          doc.text(label, left, y);
          doc.setFont("helvetica", "normal");
          doc.text(value || "-", left + 34, y);
          y += 7;
        };
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text("GreenSky Solar - Report", left, y);
        y += 10;
        doc.setLineWidth(0.3);
        doc.line(left, y, right, y);
        y += 8;
        doc.setFontSize(10.5);
        line("Title:", report.title);
        line("Type:", typeLabels[report.type] ?? report.type);
        line("Status:", report.status);
        line("Submitted By:", report.submittedBy);
        line("Submitted Date:", formatDate(report.submittedAt));
        line("Project:", report.projectName ?? "-");
        line("Amount:", report.amount != null ? formatCurrency(report.amount) : "-");
        const { cleanText } = parseReportDescription(report.description);
        y += 2;
        doc.setFont("helvetica", "bold");
        doc.text("Description", left, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        const descriptionLines = doc.splitTextToSize(cleanText || "-", right - left);
        doc.text(descriptionLines, left, y);
        const baseName = `Report - ${safeFileName(report.title)}`;
        doc.save(`${baseName}.pdf`);
      }
    } catch {
      toast.error("Failed to download report PDF.");
    }
  };

  const canSend = recipientId && sendReportTarget;
  const quotationLockedClient =
    sendReportTarget?.type === "quotation"
      ? clientOptions.find(
          (c) =>
            c.name.trim().toLowerCase() ===
            (parseQuotationPayload(sendReportTarget.description)?.clientName ?? "")
              .trim()
              .toLowerCase()
        ) ?? null
      : null;
  const canSendSelectedQuotationClient =
    !sendReportTarget ||
    sendReportTarget.type !== "quotation" ||
    (recipientType === "client" &&
      !!quotationLockedClient &&
      recipientId === quotationLockedClient.id);

  const openCreateReport = () => {
    setShowCreateReport(true);
    setCreateTitle("");
    setCreateType("warranty");
    setCreateProject(projects[0]?.name ?? "");
    setCreateAttachment(null);
  };

  const canCreate = createTitle.trim() && createType && createAttachment;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Service reports, quotations, and revenue analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button icon={Plus} onClick={openCreateReport}>
            Create Report
          </Button>
          <Button icon={Download} variant="outline">
            Export Reports
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Revenue (8 mo.)</p>
              <p className="text-lg font-bold text-slate-900">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Pending Quotations</p>
              <p className="text-lg font-bold text-slate-900">
                {pendingQuotations}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Reports</p>
              <p className="text-lg font-bold text-slate-900">{reports.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Analytics Chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">
          Monthly Revenue Analytics
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Revenue trend over the last 8 months
        </p>
        <div className="flex items-end gap-3 h-48">
          {monthlyRevenueData.map((d) => (
            <div key={d.month} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[10px] font-medium text-slate-500">
                {formatCurrency(d.revenue)}
              </span>
              <div
                className="w-full rounded-t-md bg-brand/80 hover:bg-brand transition-colors cursor-default min-h-[4px]"
                style={{ height: `${(d.revenue / maxRevenue) * 140}px` }}
              />
              <span className="text-xs font-medium text-slate-500">{d.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {(["all", "service", "quotation", "revenue"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-[1px] ${
              tab === t
                ? "border-brand text-brand"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "all" ? "All Reports" : typeLabels[t]}
            <span className="ml-1.5 text-xs opacity-60">({typeCounts[t]})</span>
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {filteredReports.map((report) => (
          <div
            key={report.id}
            className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${typeBgs[report.type]}`}
              >
                {typeIcons[report.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {report.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Submitted by {report.submittedBy} · {report.submittedAt}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {report.amount && (
                      <span className="text-sm font-semibold text-slate-900">
                        {formatCurrency(report.amount)}
                      </span>
                    )}
                    {report.type === "quotation" && report.clientApprovalStatus && (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${clientApprovalStyles[report.clientApprovalStatus] ?? "bg-slate-50 text-slate-600"}`}
                        title="Client approval"
                      >
                        Client {report.clientApprovalStatus}
                      </span>
                    )}
                    <StatusBadge status={report.status} />
                  </div>
                </div>

                <p className="mt-2 text-xs text-slate-600 line-clamp-2">
                  {report.type === "quotation"
                    ? getQuotationPreview(report.description)
                    : report.description}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  {report.projectName && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      {report.projectName}
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 capitalize">
                    {report.type}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => openSendModal(report)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  title="Send to client or technician"
                >
                  <Send className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedReport(report);
                    setShowDetailModal(true);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    void handleDownloadReportPdf(report);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  title="Download PDF"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(report)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                  title="Delete report"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Approve / Reject Actions */}
            {report.status === "pending" && (
              <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedReport(report);
                    setShowApproveConfirm(true);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedReport(report);
                    setShowRejectConfirm(true);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Report Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => requestClose("detail")}
        title="Report Details"
        size="lg"
      >
        {selectedReport && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${typeBgs[selectedReport.type]}`}
              >
                {typeIcons[selectedReport.type]}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-900">
                  {selectedReport.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {typeLabels[selectedReport.type]}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedReport.type === "quotation" && selectedReport.clientApprovalStatus && (
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${clientApprovalStyles[selectedReport.clientApprovalStatus] ?? "bg-slate-50 text-slate-600"}`}
                    title="Client approval"
                  >
                    Client {selectedReport.clientApprovalStatus}
                  </span>
                )}
                <StatusBadge status={selectedReport.status} size="md" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Submitted By</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">
                  {selectedReport.submittedBy}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Date</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">
                  {selectedReport.submittedAt}
                </p>
              </div>
              {selectedReport.projectName && (
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Project</p>
                  <p className="text-sm font-medium text-slate-900 mt-0.5">
                    {selectedReport.projectName}
                  </p>
                </div>
              )}
              {selectedReport.amount && (
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Amount</p>
                  <p className="text-sm font-bold text-brand mt-0.5">
                    {formatCurrency(selectedReport.amount)}
                  </p>
                </div>
              )}
              {selectedReport.type === "quotation" && (
                <div className="rounded-lg bg-slate-50 p-3 col-span-2">
                  <p className="text-xs text-slate-500">Client Approval</p>
                  <p className="text-sm font-medium text-slate-900 mt-0.5">
                    {selectedReport.clientApprovalStatus ? (
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${clientApprovalStyles[selectedReport.clientApprovalStatus] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {selectedReport.clientApprovalStatus}
                      </span>
                    ) : (
                      <span className="text-slate-500">Not sent to client yet</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Description</p>
              {(() => {
                if (selectedReport.type === "quotation") {
                  const q = parseQuotationPayload(selectedReport.description);
                  if (q) {
                    const items =
                      Array.isArray(q.materialItems) && q.materialItems.length > 0
                        ? q.materialItems
                        : (q.materials ?? "")
                            .split("\n")
                            .map((line) => line.trim())
                            .filter(Boolean)
                            .map((line) => ({
                              description: line,
                              qty: 1,
                              amt: 0,
                              total: 0,
                            }));
                    return (
                      <div className="space-y-3 rounded-lg bg-slate-50 p-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <p><span className="text-slate-500">Client:</span> <span className="font-medium text-slate-900">{q.clientName ?? "-"}</span></p>
                          <p><span className="text-slate-500">Contact:</span> <span className="font-medium text-slate-900">{q.clientNumber ?? "-"}</span></p>
                          <p><span className="text-slate-500">Location:</span> <span className="font-medium text-slate-900">{q.location ?? "-"}</span></p>
                          <p><span className="text-slate-500">Technician:</span> <span className="font-medium text-slate-900">{q.technician ?? "-"}</span></p>
                          <p className="col-span-2">
                            <span className="text-slate-500">Installation:</span>{" "}
                            <span className="font-medium text-slate-900">
                              {q.installationStartDate && q.installationEndDate
                                ? `${q.installationStartDate} to ${q.installationEndDate}`
                                : "-"}
                            </span>
                          </p>
                          {q.adminComment && (
                            <p className="col-span-2">
                              <span className="text-slate-500">Admin Comment:</span>{" "}
                              <span className="font-medium text-red-700">{q.adminComment}</span>
                            </p>
                          )}
                          {q.clientComment && (
                            <p className="col-span-2">
                              <span className="text-slate-500">Client Comment:</span>{" "}
                              <span className="font-medium text-amber-700">{q.clientComment}</span>
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium text-slate-500">Materials</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-slate-500">
                                  <th className="pb-1">Description</th>
                                  <th className="pb-1">QTY</th>
                                  <th className="pb-1">AMT</th>
                                  <th className="pb-1">TOTAL</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.length > 0 ? (
                                  items.map((item, idx) => (
                                    <tr key={idx} className="border-t border-slate-200">
                                      <td className="py-1 text-slate-700">{item.description}</td>
                                      <td className="py-1 text-slate-700">{item.qty}</td>
                                      <td className="py-1 text-slate-700">{item.amt}</td>
                                      <td className="py-1 text-slate-700">{item.total}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={4} className="py-1 text-slate-500">
                                      No materials listed.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }
                }
                const { cleanText, techType, attachment } = parseReportDescription(
                  selectedReport.description
                );
                return (
                  <div className="space-y-2">
                    {(techType || attachment) && (
                      <div className="flex flex-wrap gap-1.5">
                        {techType && (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 capitalize">
                            {techType.replace(/_/g, " ")}
                          </span>
                        )}
                        {attachment && (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            📎 {attachment}
                          </span>
                        )}
                      </div>
                    )}
                    {cleanText ? (
                      <p className="text-sm text-slate-700 leading-relaxed">{cleanText}</p>
                    ) : null}
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                icon={Send}
                size="sm"
                onClick={() => {
                  if (selectedReport) {
                    setShowDetailModal(false);
                    openSendModal(selectedReport);
                  }
                }}
              >
                Send Report
              </Button>
              <Button
                variant="outline"
                icon={Download}
                size="sm"
                onClick={() => {
                  if (selectedReport) void handleDownloadReportPdf(selectedReport);
                }}
              >
                Download
              </Button>
              {selectedReport.type === "quotation" &&
                selectedReport.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRejectConfirm(true)}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowApproveConfirm(true)}
                    >
                      Approve
                    </Button>
                  </>
                )}
            </div>
          </div>
        )}
      </Modal>

      {/* Send Report Modal */}
      <Modal
        isOpen={!!sendReportTarget}
        onClose={() => requestClose("send")}
        title="Send Report"
        size="sm"
      >
        {sendReportTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Send <span className="font-semibold text-slate-900">{sendReportTarget.title}</span> to:
            </p>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Recipient Type
              </label>
              <select
                value={recipientType}
                onChange={(e) => {
                  if (sendReportTarget.type === "quotation") return;
                  const val = e.target.value as "client" | "technician";
                  setRecipientType(val);
                  setRecipientId(
                    val === "client"
                      ? clientOptions[0]?.id ?? ""
                      : technicians[0]?.id ?? ""
                  );
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                disabled={sendReportTarget.type === "quotation"}
              >
                <option value="client">Client</option>
                <option value="technician">Technician</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Recipient
              </label>
              <select
                value={recipientId}
                onChange={(e) => {
                  if (sendReportTarget.type === "quotation") return;
                  setRecipientId(e.target.value);
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                disabled={sendReportTarget.type === "quotation"}
              >
                <option value="">
                  — Select {recipientType === "client" ? "client" : "technician"} —
                </option>
                {recipientType === "client"
                  ? (sendReportTarget.type === "quotation" && quotationLockedClient
                      ? [quotationLockedClient]
                      : clientOptions
                    ).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  : technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
              </select>
            </div>
            {sendReportTarget.type === "quotation" && (
              <p className="text-xs text-slate-500">
                Recipient is locked to the client selected in this quotation.
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-2">
              <Button variant="outline" onClick={() => requestClose("send")}>
                Cancel
              </Button>
              <Button
                icon={Send}
                onClick={() => setShowSendConfirm(true)}
                disabled={!canSend || !canSendSelectedQuotationClient}
              >
                Send Report
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Report Modal */}
      <Modal
        isOpen={showCreateReport}
        onClose={() => requestClose("create")}
        title="Create Report"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Create a report that will appear in the client documents portal.
          </p>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              Title
            </label>
            <input
              type="text"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="e.g. Solar Panel Warranty Certificate"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              Type
            </label>
            <select
              value={createType}
              onChange={(e) => setCreateType(e.target.value as DocumentType)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              {createReportTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              Project (optional)
            </label>
            <select
              value={createProject}
              onChange={(e) => setCreateProject(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="">— Select project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              Attachment
            </label>
            <input
              type="file"
              onChange={(e) => setCreateAttachment(e.target.files?.[0] ?? null)}
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
            <Button variant="outline" onClick={() => requestClose("create")}>
              Cancel
            </Button>
            <Button
              icon={Plus}
              onClick={() => setShowCreateConfirm(true)}
              disabled={!canCreate}
            >
              Create Report
            </Button>
          </div>
        </div>
      </Modal>

      {/* Close Confirmation Modal */}
      <Modal
        isOpen={showCloseConfirm}
        onClose={() => {
          setShowCloseConfirm(false);
          setPendingCloseAction(null);
        }}
        title="Discard changes?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to close? Your changes may not be saved.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCloseConfirm(false);
                setPendingCloseAction(null);
              }}
            >
              Discard
            </Button>
            <Button variant="danger" onClick={handleCloseConfirm}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Send Report Confirmation */}
      <Modal
        isOpen={showSendConfirm}
        onClose={() => setShowSendConfirm(false)}
        title="Confirm Send"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to send this report to{" "}
            <span className="font-semibold text-slate-900">
              {recipientType === "client"
                ? clientOptions.find((c) => c.id === recipientId)?.name
                : technicians.find((t) => t.id === recipientId)?.name}
            </span>
            ?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSendConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendReport}>
              Confirm Send
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Report Confirmation */}
      <Modal
        isOpen={showCreateConfirm}
        onClose={() => setShowCreateConfirm(false)}
        title="Confirm Create"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to create this report? It will appear in the
            client documents portal.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateReportConfirm}>
              Confirm Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Approve Report Confirmation */}
      <Modal
        isOpen={showApproveConfirm}
        onClose={() => setShowApproveConfirm(false)}
        title="Confirm Approve"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to approve this report?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowApproveConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleApproveConfirm}>
              Confirm Approve
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Report Confirmation */}
      <Modal
        isOpen={showRejectConfirm}
        onClose={() => setShowRejectConfirm(false)}
        title="Confirm Reject"
        size="sm"
      >
        <div className="space-y-4">
          {selectedReport?.type === "quotation" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Note for Technician (optional)
              </label>
              <textarea
                rows={3}
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Add comment so technician knows what to revise..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          )}
          <p className="text-sm text-slate-600">
            Are you sure you want to reject this report?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRejectConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRejectConfirm}>
              Confirm Reject
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Report Confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Report"
        size="sm"
        zIndex={60}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-slate-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-900">{deleteTarget?.title}</span>? This action
            cannot be undone.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteReport}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
