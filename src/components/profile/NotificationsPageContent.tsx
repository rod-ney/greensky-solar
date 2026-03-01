"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import type { NotificationType } from "@/lib/server/notifications-repository";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  booking_submitted: "Booking",
  booking_cancelled: "Booking",
  booking_confirmed: "Booking",
  booking_completed: "Booking",
  task_assigned: "Task",
  task_rescheduled: "Task",
  task_completed: "Task",
  report_submitted: "Report",
  report_approved: "Report",
  report_rejected: "Report",
  payment_received: "Payment",
  payment_confirmed: "Payment",
  document_available: "Document",
  system_alert: "System",
};

type FilterCategory = "all" | "booking" | "task" | "report" | "payment" | "document" | "system";

const CATEGORY_TYPES: Record<FilterCategory, NotificationType[]> = {
  all: [],
  booking: ["booking_submitted", "booking_cancelled", "booking_confirmed", "booking_completed"],
  task: ["task_assigned", "task_rescheduled", "task_completed"],
  report: ["report_submitted", "report_approved", "report_rejected"],
  payment: ["payment_received", "payment_confirmed"],
  document: ["document_available"],
  system: ["system_alert"],
};

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  all: "All",
  booking: "Booking",
  task: "Task",
  report: "Report",
  payment: "Payment",
  document: "Document",
  system: "System",
};

type Props = {
  /** Base URL for notification API, e.g. /api/notifications */
  notificationsApiBase: string;
  /** Filter categories to show. Defaults to all. Use to hide task/report for clients. */
  visibleCategories?: FilterCategory[];
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Manila",
    });
  } catch {
    return iso;
  }
}

const DEFAULT_CATEGORIES: FilterCategory[] = [
  "all",
  "booking",
  "task",
  "report",
  "payment",
  "document",
  "system",
];

export default function NotificationsPageContent({
  notificationsApiBase,
  visibleCategories = DEFAULT_CATEGORIES,
}: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [markingAll, setMarkingAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=50", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as Notification[];
        setNotifications(data);
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredNotifications =
    filter === "all"
      ? notifications
      : notifications.filter((n) => CATEGORY_TYPES[filter].includes(n.type));

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
      );
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const clearAll = async () => {
    setClearingAll(true);
    try {
      await fetch("/api/notifications/clear-all", { method: "POST" });
      setNotifications([]);
    } catch {
      // ignore
    } finally {
      setClearingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {visibleCategories.map(
            (category) => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === category
                    ? "bg-brand text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {CATEGORY_LABELS[category]}
              </button>
            )
          )}
        </div>
        <div className="flex gap-2">
          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              disabled={clearingAll}
              className="text-red-500 border-red-200"
            >
              {clearingAll ? "Clearing…" : "Clear all"}
            </Button>
          )}
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              disabled={markingAll}
            >
              {markingAll ? "Marking…" : "Mark all as read"}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="space-y-2 p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <p className="p-8 text-center text-slate-500">No notifications.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredNotifications.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.link ?? "#"}
                  onClick={async () => {
                    if (!n.readAt) {
                      try {
                        await fetch(`${notificationsApiBase}/${n.id}/read`, {
                          method: "PATCH",
                        });
                        setNotifications((prev) =>
                          prev.map((item) =>
                            item.id === n.id
                              ? { ...item, readAt: new Date().toISOString() }
                              : item
                          )
                        );
                      } catch {
                        // ignore
                      }
                    }
                  }}
                  className={`block px-6 py-4 hover:bg-slate-50 transition-colors ${!n.readAt ? "bg-brand/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-medium text-slate-400">
                        {TYPE_LABELS[n.type] ?? n.type}
                      </span>
                      <p className="mt-0.5 font-medium text-slate-900">{n.title}</p>
                      {n.message && (
                        <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                      )}
                      <p className="mt-2 text-xs text-slate-400">
                        {formatDate(n.createdAt)}
                      </p>
                    </div>
                    {!n.readAt && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-brand mt-2" />
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
