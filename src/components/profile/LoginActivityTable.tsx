"use client";

import { useEffect, useState } from "react";
import type { LoginActivity } from "@/lib/server/profile-repository";

export default function LoginActivityTable() {
  const [activity, setActivity] = useState<LoginActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/profile/login-activity?limit=20", {
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as LoginActivity[];
          setActivity(data);
        }
      } catch {
        setActivity([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <p className="text-sm text-slate-500">No login history recorded yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="pb-2 text-left font-medium text-slate-600">Date</th>
            <th className="pb-2 text-left font-medium text-slate-600">IP</th>
            <th className="pb-2 text-left font-medium text-slate-600">Device</th>
          </tr>
        </thead>
        <tbody>
          {activity.map((row) => (
            <tr key={row.id} className="border-b border-slate-100">
              <td className="py-2 text-slate-700">{row.createdAt}</td>
              <td className="py-2 text-slate-700">{row.ipAddress ?? "—"}</td>
              <td className="max-w-md truncate py-2 text-slate-700" title={row.userAgent ?? undefined}>
                {row.userAgent ? row.userAgent.slice(0, 60) + (row.userAgent.length > 60 ? "…" : "") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
