"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  FileUp,
  Home,
  Info,
  ListChecks,
  Loader2,
  MapPin,
  Upload,
  X,
} from "lucide-react";
import type {
  ComplianceItemStatus,
  ComplianceTimelineItem,
  UserCompliancePreferences,
} from "@/types/client";
import { toast } from "@/lib/toast";
import {
  COMPLIANCE_ATTACHMENT_ALLOWED_TYPES,
  validateUploadFileSize,
} from "@/lib/upload-constraints";

type ProjectSummary = {
  id: string;
  name: string;
  location: string;
};

type ComplianceResponse = {
  preferences: UserCompliancePreferences;
  items: ComplianceTimelineItem[];
  projects: ProjectSummary[];
};

type TimelineFilterKey = "all" | "pending" | "overdue" | "done";

function manilaToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }).slice(0, 10);
}

function timelineDateParts(iso: string): { dayLine: string; year: string } {
  const s = iso.slice(0, 10);
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  const dayLine = date.toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
  });
  const year = date.toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
  });
  return { dayLine, year };
}

function complianceFileBadgeLabel(item: ComplianceTimelineItem): string {
  if (item.documentTitle?.trim()) return item.documentTitle.trim();
  try {
    const seg = item.fileUrl?.split("/").filter(Boolean).pop() ?? "";
    return decodeURIComponent(seg) || "Uploaded file";
  } catch {
    return "Uploaded file";
  }
}

function isRequirementDone(status: ComplianceItemStatus): boolean {
  return status === "approved" || status === "waived";
}

function isPendingLane(status: ComplianceItemStatus): boolean {
  return status === "pending" || status === "submitted" || status === "rejected";
}

export default function ClientCompliancePage() {
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [data, setData] = useState<ComplianceResponse | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [prefsDraft, setPrefsDraft] = useState<UserCompliancePreferences>({
    inSubdivision: false,
    wantsNetMetering: false,
  });
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilterKey>("all");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/client/compliance", { cache: "no-store" });
      if (!res.ok) {
        toast.error("Could not load compliance timeline.");
        return;
      }
      const json = (await res.json()) as ComplianceResponse;
      setData(json);
      setPrefsDraft(json.preferences);
      setProjectId((prev) => {
        if (prev && json.projects.some((p) => p.id === prev)) return prev;
        return json.projects[0]?.id ?? null;
      });
    } catch {
      toast.error("Could not load compliance timeline.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    if (!projectId) return data.items;
    return data.items.filter((i) => i.projectId === projectId);
  }, [data, projectId]);

  const sortedItems = useMemo(
    () =>
      [...filteredItems].sort((a, b) =>
        a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.dueDate.localeCompare(b.dueDate)
      ),
    [filteredItems]
  );

  const complianceProgress = useMemo(() => {
    const total = sortedItems.length;
    if (total === 0) return { percent: 0, done: 0, total: 0 };
    const done = sortedItems.filter(
      (i) =>
        i.status === "approved" ||
        i.status === "waived" ||
        i.status === "submitted"
    ).length;
    return {
      percent: Math.round((done / total) * 100),
      done,
      total,
    };
  }, [sortedItems]);

  const timelineList = useMemo(() => {
    const today = manilaToday();
    return sortedItems.filter((item) => {
      const overdue =
        item.status !== "approved" &&
        item.status !== "waived" &&
        item.dueDate < today;
      if (timelineFilter === "all") return true;
      if (timelineFilter === "done") return isRequirementDone(item.status);
      if (timelineFilter === "overdue") return overdue;
      if (timelineFilter === "pending") return isPendingLane(item.status) && !isRequirementDone(item.status);
      return true;
    });
  }, [sortedItems, timelineFilter]);

  const activeStepIndex = useMemo(() => {
    return sortedItems.findIndex((item) => !isRequirementDone(item.status));
  }, [sortedItems]);

  const savePreferences = async () => {
    setSavingPrefs(true);
    try {
      const res = await fetch("/api/client/compliance/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inSubdivision: prefsDraft.inSubdivision,
          wantsNetMetering: prefsDraft.wantsNetMetering,
        }),
      });
      if (!res.ok) {
        toast.error("Could not save preferences.");
        return;
      }
      toast.success("Preferences saved. Timeline updated.");
      await refresh();
    } catch {
      toast.error("Could not save preferences.");
    } finally {
      setSavingPrefs(false);
    }
  };

  const uploadFile = async (itemId: string, file: File) => {
    const uploadError = validateUploadFileSize(
      file,
      COMPLIANCE_ATTACHMENT_ALLOWED_TYPES,
      "Invalid file type. Use PDF, JPEG, PNG, or WebP."
    );
    if (uploadError) {
      toast.error(uploadError);
      return;
    }

    setUploadingId(itemId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/client/compliance/items/${itemId}/upload`, {
        method: "POST",
        body: fd,
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(payload.error ?? "Upload failed.");
        return;
      }
      toast.success("File uploaded. Our team will review it.");
      await refresh();
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploadingId(null);
    }
  };

  const removeUploadedFile = async (itemId: string) => {
    setRemovingId(itemId);
    try {
      const res = await fetch(`/api/client/compliance/items/${itemId}/upload`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        toast.error(j.error ?? "Could not remove file.");
        return;
      }
      toast.success("File removed.");
      await refresh();
    } catch {
      toast.error("Could not remove file.");
    } finally {
      setRemovingId(null);
    }
  };

  const waiveItem = async (item: ComplianceTimelineItem) => {
    try {
      const res = await fetch(`/api/client/compliance/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "waived" }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        toast.error(j.error ?? "Could not update.");
        return;
      }
      toast.success("Marked as not applicable.");
      await refresh();
    } catch {
      toast.error("Could not update.");
    }
  };

  const onDrop = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    setDragOverId(null);
    const file = e.dataTransfer.files[0];
    if (file) void uploadFile(itemId, file);
  };

  const today = manilaToday();

  const FILTERS: { key: TimelineFilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "overdue", label: "Overdue" },
    { key: "done", label: "Done" },
  ];

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-36 rounded-2xl border border-slate-200 bg-white animate-pulse" />
        <div className="h-48 rounded-2xl border border-slate-200 bg-white animate-pulse" />
        <div className="h-64 rounded-2xl border border-slate-200 bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-slate-100/90 p-4 sm:p-6 text-slate-900 pb-16">
      {data && data.projects.length > 1 && (
        <div className="mb-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
          <label className="text-[11px] font-medium uppercase tracking-wider text-slate-400" htmlFor="project">
            Project
          </label>
          <select
            id="project"
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
            value={projectId ?? ""}
            onChange={(e) => setProjectId(e.target.value || null)}
          >
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.location}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Hero row — matches mock hero-left + hero-right */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px] lg:items-stretch mb-5">
        <div className="rounded-2xl border border-slate-200/80 bg-white px-7 py-7 shadow-sm">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
            Compliance tracker
          </p>
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-slate-900 mb-1">
            Permits & certificates
          </h1>
          <p className="text-[13px] text-slate-500 mb-6">
            Track each requirement by due date. Upload a PDF or image to submit.
          </p>

          <div className="mb-2.5 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300"
              style={{ width: `${sortedItems.length ? complianceProgress.percent : 0}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {sortedItems.length > 0
                ? `${complianceProgress.done} of ${sortedItems.length} complete`
                : "No requirements"}
            </span>
            <span className="text-[13px] font-medium tabular-nums text-slate-900">
              {sortedItems.length > 0 ? `${complianceProgress.percent}%` : "—"}
            </span>
          </div>

          {sortedItems.length > 0 && (
            <div className="mt-5 flex w-full flex-wrap items-start gap-y-4 sm:flex-nowrap">
              {sortedItems.map((item, idx) => {
                const done = item.status === "approved" || item.status === "waived";
                const active = idx === activeStepIndex && !done;
                const stepNum = idx + 1;
                return (
                  <Fragment key={item.id}>
                    <div className="flex min-w-[68px] max-w-[92px] flex-1 flex-col items-center gap-1">
                      <div
                        className={[
                          "flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold transition-colors",
                          done
                            ? "bg-brand text-white"
                            : active
                              ? "bg-sky-100 text-sky-800 outline outline-2 outline-offset-[3px] outline-sky-300"
                              : "bg-slate-200 text-slate-500",
                        ].join(" ")}
                      >
                        {done ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : stepNum}
                      </div>
                      <span className="line-clamp-2 w-full text-center text-[9px] leading-snug text-slate-500">
                        {item.title.replace(/\s+/g, " ")}
                      </span>
                    </div>
                    {idx < sortedItems.length - 1 && (
                      <div className="mx-1 hidden h-px flex-[1_1_12px] self-center bg-slate-300 sm:block sm:translate-y-[-22px]" />
                    )}
                  </Fragment>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-1 flex-col rounded-2xl border border-slate-200/80 bg-white px-5 py-[18px] shadow-sm">
            <p className="text-xs font-medium text-slate-900 mb-1">Your situation</p>
            <p className="text-[11px] text-slate-400 mb-3.5 leading-relaxed">
              Optional items appear based on your setup.
            </p>
            <div className="mb-4 space-y-2.5">
              <ToggleRow
                on={prefsDraft.inSubdivision}
                onToggle={() =>
                  setPrefsDraft((p) => ({ ...p, inSubdivision: !p.inSubdivision }))
                }
                title="I live in a subdivision"
                note="Shows HOA certificate"
              />
              <ToggleRow
                on={prefsDraft.wantsNetMetering}
                onToggle={() =>
                  setPrefsDraft((p) => ({ ...p, wantsNetMetering: !p.wantsNetMetering }))
                }
                title="I want net metering"
                note="Adds Meralco documents"
              />
            </div>
            <button
              type="button"
              disabled={savingPrefs}
              onClick={() => void savePreferences()}
              className="w-full rounded-lg bg-brand px-3 py-2.5 text-xs font-medium tracking-wide text-white transition hover:bg-brand-dark disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
            >
              {savingPrefs ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </span>
              ) : (
                "Save & refresh timeline"
              )}
            </button>
          </div>
        </div>
      </div>

      {data && data.projects.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
          <Home className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 px-4">
            No projects assigned yet. Once you have an active solar project, your compliance checklist will
            appear here.
          </p>
          <Link
            href="/client/book-now"
            className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
          >
            Book a service
          </Link>
        </div>
      )}

      {data && data.projects.length > 0 && sortedItems.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
          <ListChecks className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 px-4">
            No requirements for this project. Save preferences to refresh the checklist.
          </p>
        </div>
      )}

      {sortedItems.length > 0 && (
        <>
          <div className="mb-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Timeline</h2>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setTimelineFilter(f.key)}
                  className={[
                    "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                    timelineFilter === f.key
                      ? "border-brand bg-brand text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                  ].join(" ")}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            {timelineList.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 py-10 text-center text-sm text-slate-500">
                No items in this filter.
              </p>
            ) : (
              timelineList.map((item, listIdx) => {
                const overdue =
                  item.status !== "approved" &&
                  item.status !== "waived" &&
                  item.dueDate < today;
                const { dayLine, year } = timelineDateParts(item.dueDate);
                const isLast = listIdx === timelineList.length - 1;
                const isAdmin = item.suppliedBy === "admin";
                const isWaived = item.status === "waived";

                const nodeRing = timelineNodeClasses(item, overdue, isWaived, isAdmin);

                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[minmax(72px,90px)_20px_minmax(0,1fr)] gap-x-4 items-start"
                  >
                    <div className="pt-3.5 text-right text-[11px] leading-snug text-slate-500">
                      <span className="block text-base font-semibold tabular-nums text-slate-900">
                        {dayLine}
                      </span>
                      {year}
                    </div>
                    <div className="flex min-h-[40px] flex-col items-center self-stretch">
                      <div
                        className={`mt-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${nodeRing}`}
                      >
                        {overdue && !isWaived && !isRequirementDone(item.status) ? (
                          <span className="h-2 w-2 rounded-full bg-red-600" />
                        ) : isWaived ? (
                          <Check className="h-3 w-3 text-orange-700 stroke-[2.5]" />
                        ) : item.status === "approved" ? (
                          <Check className="h-3 w-3 text-emerald-700 stroke-[2.5]" />
                        ) : null}
                      </div>
                      {!isLast ? (
                        <div className="mt-1 w-[1.5px] min-h-4 flex-1 bg-slate-300 shrink-0" />
                      ) : null}
                    </div>

                    <div>
                      <div
                        className={[
                          "mb-4 mt-2 rounded-xl border bg-white px-4 py-3.5 shadow-sm",
                          overdue && item.status !== "waived"
                            ? "border-red-200"
                            : isWaived
                              ? "border-orange-200"
                              : "border-slate-200/90",
                        ].join(" ")}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                          <p className="text-[13px] font-medium text-slate-900 leading-snug">{item.title}</p>
                          <div className="flex flex-wrap justify-end gap-1">
                            <ComplianceBadges item={item} overdue={overdue} />
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed mb-3">{item.description}</p>

                        {isAdmin && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] text-slate-600">
                              <Info className="h-3 w-3 shrink-0 text-slate-400" />
                              GreenSky Solar will provide this
                              {item.fileUrl && (
                                <>
                                  {" "}
                                  ·{" "}
                                  <a
                                    href={item.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold text-brand underline"
                                  >
                                    Download
                                  </a>
                                </>
                              )}
                            </span>
                          </div>
                        )}

                        {isWaived && (
                          <div className="flex items-center gap-2 py-2">
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100">
                              <Check className="h-3 w-3 text-orange-800 stroke-[2.5]" />
                            </div>
                            <p className="text-[11px] leading-snug text-orange-950">
                              Marked as waived — won&apos;t affect your progress score
                            </p>
                          </div>
                        )}

                        {!isAdmin && !isWaived && item.status === "approved" && item.fileUrl && (
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={item.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-semibold text-brand underline"
                            >
                              View approved file ({complianceFileBadgeLabel(item)})
                            </a>
                          </div>
                        )}

                        {!isAdmin && !isWaived && item.status !== "approved" && (
                          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                            {item.fileUrl && (
                              <div className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-slate-50 pl-2.5 pr-0.5 py-0.5 text-xs text-slate-800">
                                <a
                                  href={item.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="min-w-0 flex-1 truncate font-medium text-brand hover:underline"
                                  title={complianceFileBadgeLabel(item)}
                                >
                                  {complianceFileBadgeLabel(item)}
                                </a>
                                <button
                                  type="button"
                                  title="Remove file"
                                  disabled={removingId === item.id}
                                  aria-label={`Remove ${complianceFileBadgeLabel(item)}`}
                                  onClick={() => void removeUploadedFile(item.id)}
                                  className="ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-40"
                                >
                                  {removingId === item.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                                  )}
                                </button>
                              </div>
                            )}

                            <div
                              role="presentation"
                              onDragEnter={() => setDragOverId(item.id)}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverId(item.id);
                              }}
                              onDragLeave={() => setDragOverId((id) => (id === item.id ? null : id))}
                              onDrop={(e) => onDrop(e, item.id)}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-lg border border-brand bg-brand px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                                disabled={uploadingId === item.id}
                                onClick={() => {
                                  document.getElementById(`upload-${item.id}`)?.click();
                                }}
                              >
                                {uploadingId === item.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Upload className="h-3.5 w-3.5 stroke-[2]" />
                                )}
                                {uploadingId === item.id ? "Uploading…" : "Upload file"}
                              </button>

                              <label className="inline-flex cursor-pointer">
                                <input
                                  id={`upload-${item.id}`}
                                  type="file"
                                  accept=".pdf,image/jpeg,image/png,image/webp,application/pdf"
                                  className="sr-only"
                                  disabled={uploadingId === item.id}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) void uploadFile(item.id, f);
                                    e.target.value = "";
                                  }}
                                />
                                <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-800 hover:bg-slate-50">
                                  <FileUp className="h-3.5 w-3.5 text-slate-500" />
                                  Choose file
                                </span>
                              </label>

                              {item.isOptional && !item.documentId && item.status === "pending" && (
                                <button
                                  type="button"
                                  onClick={() => void waiveItem(item)}
                                  className="text-[11px] text-slate-400 underline decoration-slate-300 hover:text-slate-700"
                                >
                                  Waive this
                                </button>
                              )}

                              {dragOverId === item.id ? (
                                <span className="ml-auto w-full text-center text-[10px] font-medium text-brand sm:w-auto">
                                  Drop to upload…
                                </span>
                              ) : (
                                <span className="ml-auto hidden text-[10px] text-slate-400 md:inline">
                                  or drag & drop PDF / image
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Project reminder under timeline */}
          {sortedItems[0] && (
            <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{sortedItems[0].projectName}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function timelineNodeClasses(
  item: ComplianceTimelineItem,
  overdue: boolean,
  isWaived: boolean,
  isAdmin: boolean
): string {
  if (isAdmin) return "border-slate-300 bg-slate-100 text-slate-400";
  if (isWaived) return "border-orange-500 bg-orange-50";
  if (item.status === "approved") return "border-emerald-500 bg-emerald-50";
  if (overdue && !isRequirementDone(item.status)) return "border-red-600 bg-red-50";
  if (item.status === "submitted") return "border-brand bg-white";
  if (item.status === "pending" || item.status === "rejected")
    return "border-brand bg-brand-50";
  return "border-slate-300 bg-slate-100";
}

function ToggleRow(props: {
  on: boolean;
  onToggle: () => void;
  title: string;
  note: string;
}) {
  const { on, onToggle, title, note } = props;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2.5 text-left cursor-pointer rounded-lg hover:bg-slate-50 py-1 -mx-1 px-1 transition-colors"
    >
      <span
        className={`relative inline-flex h-[18px] w-8 shrink-0 rounded-full transition-colors cursor-pointer ${on ? "bg-brand" : "bg-slate-200"
          }`}
        aria-hidden
      >
        <span
          className={`pointer-events-none absolute top-[3px] h-3 w-3 rounded-full bg-white shadow-sm transition-[left] ${on ? "left-[15px]" : "left-[3px]"
            }`}
        />
      </span>
      <span>
        <span className="block text-xs font-medium text-slate-900">{title}</span>
        <span className="block text-[11px] text-slate-400 mt-px">{note}</span>
      </span>
    </button>
  );
}

function ComplianceBadges(props: { item: ComplianceTimelineItem; overdue: boolean }) {
  const { item, overdue } = props;
  const chips: { key: string; cls: string; label: string }[] = [];
  if (item.isOptional) {
    chips.push({
      key: "opt",
      cls: "bg-slate-100 text-slate-600",
      label: "Optional",
    });
  }
  if (item.status === "waived") {
    chips.push({ key: "w", cls: "bg-orange-100 text-orange-900", label: "Waived" });
  } else if (item.status === "approved") {
    chips.push({ key: "a", cls: "bg-emerald-100 text-emerald-900", label: "Approved" });
  } else if (overdue) {
    chips.push({ key: "o", cls: "bg-red-100 text-red-900", label: "Overdue" });
  } else if (item.status === "rejected") {
    chips.push({ key: "r", cls: "bg-red-100 text-red-900", label: "Rejected" });
  } else if (item.status === "submitted") {
    chips.push({ key: "s", cls: "bg-sky-100 text-sky-900", label: "In review" });
  } else if (item.status === "pending") {
    chips.push({ key: "p", cls: "bg-amber-100 text-amber-900", label: "Pending" });
  }
  return (
    <>
      {chips.map((c) => (
        <span
          key={c.key}
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${c.cls}`}
        >
          {c.label}
        </span>
      ))}
    </>
  );
}
