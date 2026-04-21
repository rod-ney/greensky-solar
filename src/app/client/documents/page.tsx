"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  FileText,
  FileCheck,
  FileWarning,
  FileClock,
  Shield,
  Download,
  Eye,
  LayoutGrid,
  List,
  Check,
  X,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { formatCurrency, formatDate, formatQuotationNumberFromReportId } from "@/lib/format";
import { toast } from "@/lib/toast";
import type { DocumentType, Document } from "@/types/client";
import type { Report } from "@/types";
import { downloadQuotationReportPdf } from "@/lib/pdf/quotation-report-pdf";

const typeConfig: Record<
  DocumentType,
  { icon: React.ReactNode; bg: string; label: string }
> = {
  contract: {
    icon: <FileCheck className="h-5 w-5" />,
    bg: "bg-brand-50 text-brand",
    label: "Contract",
  },
  invoice: {
    icon: <FileText className="h-5 w-5" />,
    bg: "bg-blue-50 text-blue-600",
    label: "Invoice",
  },
  warranty: {
    icon: <Shield className="h-5 w-5" />,
    bg: "bg-purple-50 text-purple-600",
    label: "Warranty",
  },
  permit: {
    icon: <FileClock className="h-5 w-5" />,
    bg: "bg-amber-50 text-amber-600",
    label: "Permit",
  },
  report: {
    icon: <FileWarning className="h-5 w-5" />,
    bg: "bg-teal-50 text-teal-600",
    label: "Report",
  },
};

const docStatusStyles: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  expired: "bg-red-50 text-red-600 border-red-200",
  draft: "bg-slate-50 text-slate-500 border-slate-200",
};

const approvalStatusStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

type ViewMode = "grid" | "list";

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
  materials?: string;
  materialItems?: QuotationMaterialItem[];
  clientComment?: string;
};

function parseQuotationPayload(desc: string): QuotationPayload | null {
  try {
    const parsed = JSON.parse(desc) as Record<string, unknown>;
    if (typeof parsed.clientName !== "string") return null;
    return parsed as QuotationPayload;
  } catch {
    return null;
  }
}

function clientQuotationRef(doc: Document): string | null {
  if (doc.linkedReportType !== "quotation" || !doc.reportId) return null;
  return formatQuotationNumberFromReportId(doc.reportId);
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await fetch("/api/client/documents", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as Document[];
        setDocuments(data);
      } catch {
        setDocuments([]);
      }
    };
    void loadDocuments();
  }, []);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<DocumentType | "all">("all");
  const [view, setView] = useState<ViewMode>("grid");

  const [approveTarget, setApproveTarget] = useState<Document | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Document | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [viewTarget, setViewTarget] = useState<Document | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return documents.filter((d) => {
      const ref = clientQuotationRef(d);
      const matchSearch =
        d.title.toLowerCase().includes(q) ||
        (d.projectName ?? "").toLowerCase().includes(q) ||
        (ref != null && ref.toLowerCase().includes(q));
      const matchType = typeFilter === "all" || d.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [documents, search, typeFilter]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { all: documents.length };
    for (const t of Object.keys(typeConfig)) {
      c[t] = documents.filter((d) => d.type === t).length;
    }
    return c;
  }, [documents]);

  const handleApprove = async () => {
    if (!approveTarget) return;
    try {
      const res = await fetch(`/api/client/documents/${approveTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: "approved" }),
      });
      if (!res.ok) {
        toast.error("Failed to approve document.");
        return;
      }
      const updated = (await res.json()) as Document;
      setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setApproveTarget(null);
      toast.success("Document approved successfully!");
    } catch {
      toast.error("Failed to approve document.");
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    try {
      const res = await fetch(`/api/client/documents/${rejectTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalStatus: "rejected",
          rejectionComment: rejectComment.trim() || undefined,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to reject document.");
        return;
      }
      const updated = (await res.json()) as Document;
      setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setRejectTarget(null);
      setRejectComment("");
      toast.success("Document rejected.");
    } catch {
      toast.error("Failed to reject document.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/client/documents/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Failed to delete document.");
        return;
      }
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      if (viewTarget?.id === deleteTarget.id) setViewTarget(null);
      setDeleteTarget(null);
      toast.success("Document deleted.");
    } catch {
      toast.error("Failed to delete document.");
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`/api/client/documents/${doc.id}/report`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        toast.error(payload.error ?? "Failed to load report.");
        return;
      }
      const report = (await response.json()) as Report;
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
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ unit: "mm", format: "a4" });
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(15);
        pdf.text("GreenSky Solar - Report", 14, 18);
        pdf.setLineWidth(0.3);
        pdf.line(14, 23, 196, 23);
        pdf.setFontSize(10.5);
        pdf.setFont("helvetica", "bold");
        pdf.text("Title:", 14, 33);
        pdf.setFont("helvetica", "normal");
        pdf.text(report.title, 48, 33);
        pdf.setFont("helvetica", "bold");
        pdf.text("Type:", 14, 40);
        pdf.setFont("helvetica", "normal");
        pdf.text(report.type, 48, 40);
        pdf.setFont("helvetica", "bold");
        pdf.text("Status:", 14, 47);
        pdf.setFont("helvetica", "normal");
        pdf.text(report.status, 48, 47);
        pdf.setFont("helvetica", "bold");
        pdf.text("Submitted By:", 14, 54);
        pdf.setFont("helvetica", "normal");
        pdf.text(report.submittedBy, 48, 54);
        pdf.setFont("helvetica", "bold");
        pdf.text("Submitted Date:", 14, 61);
        pdf.setFont("helvetica", "normal");
        pdf.text(formatDate(report.submittedAt), 48, 61);
        pdf.setFont("helvetica", "bold");
        pdf.text("Amount:", 14, 68);
        pdf.setFont("helvetica", "normal");
        pdf.text(
          report.amount != null ? formatCurrency(report.amount) : "-",
          48,
          68
        );
        pdf.setFont("helvetica", "bold");
        pdf.text("Description:", 14, 78);
        pdf.setFont("helvetica", "normal");
        const lines = pdf.splitTextToSize(report.description || "-", 182);
        pdf.text(lines, 14, 84);
        const safeTitle = report.title.replace(/[\\/:*?"<>|]/g, "").trim() || "Report";
        pdf.save(`${safeTitle}.pdf`);
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to download PDF.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Documents</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Access your contracts, warranties, permits, and reports
        </p>
      </div>

      {/* Type Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {(["all", ...Object.keys(typeConfig)] as const).map((t) => {
          const label = t === "all" ? "All" : typeConfig[t as DocumentType].label + "s";
          const count = typeCounts[t] ?? 0;
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t as DocumentType | "all")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all ${
                typeFilter === t
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {label}{" "}
              <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Search + View Toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="flex rounded-xl border border-slate-200 bg-white">
          <button
            onClick={() => setView("grid")}
            className={`flex h-10 w-10 items-center justify-center rounded-l-xl ${
              view === "grid" ? "bg-brand text-white" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex h-10 w-10 items-center justify-center rounded-r-xl border-l border-slate-200 ${
              view === "list" ? "bg-brand text-white" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Documents */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No documents found</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => {
            const tc = typeConfig[doc.type];
            const quotationRef = clientQuotationRef(doc);
            return (
              <div
                key={doc.id}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tc.bg}`}>
                    {tc.icon}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${docStatusStyles[doc.status]}`}
                    >
                      {doc.status}
                    </span>
                    {doc.approvalStatus && (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${approvalStatusStyles[doc.approvalStatus]}`}
                      >
                        {doc.approvalStatus}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="mt-3 text-sm font-semibold text-slate-900 line-clamp-2 group-hover:text-brand transition-colors">
                  {doc.title}
                </h3>
                {quotationRef && (
                  <p className="mt-1 text-xs font-semibold tracking-wide text-brand">{quotationRef}</p>
                )}

                <div className="mt-2 space-y-1">
                  {doc.projectName && (
                    <p className="text-xs text-slate-500">{doc.projectName}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{doc.fileSize}</span>
                    <span>{formatDate(doc.uploadedAt)}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  {doc.approvalStatus === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        icon={Check}
                        onClick={() => setApproveTarget(doc)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs text-red-600 hover:bg-red-50 hover:border-red-200"
                        icon={X}
                        onClick={() => {
                          setRejectTarget(doc);
                          setRejectComment("");
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewTarget(doc)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                    <button
                      onClick={() => {
                        void handleDownload(doc);
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                    <button
                      onClick={() => setDeleteTarget(doc)}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-5 py-3.5 text-left text-xs font-medium text-slate-500">
                  Document
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-slate-500 hidden md:table-cell">
                  Type
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-slate-500 hidden lg:table-cell">
                  Project
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-slate-500 hidden sm:table-cell">
                  Size
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-slate-500">
                  Date
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-slate-500">
                  Status
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-medium text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((doc) => {
                const tc = typeConfig[doc.type];
                const quotationRef = clientQuotationRef(doc);
                return (
                  <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tc.bg}`}>
                          {tc.icon}
                        </div>
                        <div className="min-w-0 max-w-[220px]">
                          <span className="block text-sm font-medium text-slate-900 truncate">
                            {doc.title}
                          </span>
                          {quotationRef && (
                            <span className="mt-0.5 block text-xs font-semibold tracking-wide text-brand truncate">
                              {quotationRef}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="text-xs font-medium text-slate-500">{tc.label}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 hidden lg:table-cell">
                      {doc.projectName ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 hidden sm:table-cell">
                      {doc.fileSize}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {formatDate(doc.uploadedAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-1">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${docStatusStyles[doc.status]}`}
                        >
                          {doc.status}
                        </span>
                        {doc.approvalStatus && (
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${approvalStatusStyles[doc.approvalStatus]}`}
                          >
                            {doc.approvalStatus}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-1">
                        {doc.approvalStatus === "pending" && (
                          <>
                            <button
                              onClick={() => setApproveTarget(doc)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-green-600 hover:bg-green-50"
                              title="Approve"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setRejectTarget(doc);
                                setRejectComment("");
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                              title="Reject"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setViewTarget(doc)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          title="View details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            void handleDownload(doc);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(doc)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      <Modal
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title="Approve Document"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to approve{" "}
            <span className="font-semibold text-slate-900">{approveTarget?.title}</span>? This
            confirms the service and quotation details.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setApproveTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleApprove}>
              Approve
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Document Details Modal */}
      <Modal
        isOpen={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title={viewTarget?.title ?? "Document Details"}
        size="md"
      >
        {viewTarget &&
          (() => {
            const viewQuotationRef = clientQuotationRef(viewTarget);
            return (
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${typeConfig[viewTarget.type].bg}`}
                  >
                    {typeConfig[viewTarget.type].icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-slate-900">{viewTarget.title}</h3>
                    <p className="mt-0.5 text-sm text-slate-500">{typeConfig[viewTarget.type].label}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${docStatusStyles[viewTarget.status]}`}
                      >
                        {viewTarget.status}
                      </span>
                      {viewTarget.approvalStatus && (
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${approvalStatusStyles[viewTarget.approvalStatus]}`}
                        >
                          {viewTarget.approvalStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Type</span>
                    <span className="font-medium text-slate-900">{typeConfig[viewTarget.type].label}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">File Size</span>
                    <span className="font-medium text-slate-900">{viewTarget.fileSize}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Uploaded</span>
                    <span className="font-medium text-slate-900">{formatDate(viewTarget.uploadedAt)}</span>
                  </div>
                  {viewTarget.projectName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Project</span>
                      <span className="font-medium text-slate-900">{viewTarget.projectName}</span>
                    </div>
                  )}
                  {viewQuotationRef && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Quotation no.</span>
                      <span className="font-medium text-slate-900">{viewQuotationRef}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setViewTarget(null)}>
                    Close
                  </Button>
                  <Button
                    icon={Download}
                    onClick={() => {
                      void handleDownload(viewTarget);
                    }}
                  >
                    Download
                  </Button>
                </div>
              </div>
            );
          })()}
      </Modal>

      {/* Reject Confirmation Modal */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={() => {
          setRejectTarget(null);
          setRejectComment("");
        }}
        title="Reject Document"
        size="sm"
      >
        <div className="space-y-4">
          {rejectTarget?.linkedReportType === "quotation" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Comment for Admin/Technician (optional)
              </label>
              <textarea
                rows={3}
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Tell us why this quotation is rejected..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                maxLength={500}
              />
            </div>
          )}
          <p className="text-sm text-slate-600">
            Are you sure you want to reject{" "}
            <span className="font-semibold text-slate-900">{rejectTarget?.title}</span>? This
            will decline the service and quotation report.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectComment("");
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject}>
              Reject
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Document"
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
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
