interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

const statusStyles: Record<string, string> = {
  // Project / Booking statuses
  ongoing: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  // Task statuses
  todo: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  // Technician statuses
  available: "bg-green-50 text-green-700 border-green-200",
  busy: "bg-amber-50 text-amber-700 border-amber-200",
  on_leave: "bg-slate-50 text-slate-600 border-slate-200",
  // Report statuses
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  // User statuses
  active: "bg-green-50 text-green-700 border-green-200",
  inactive: "bg-slate-50 text-slate-600 border-slate-200",
  // Priorities
  low: "bg-slate-50 text-slate-600 border-slate-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  urgent: "bg-red-50 text-red-700 border-red-200",
};

const statusLabels: Record<string, string> = {
  ongoing: "Ongoing",
  completed: "Completed",
  confirmed: "Confirmed",
  pending: "Pending",
  cancelled: "Cancelled",
  todo: "To Do",
  in_progress: "In Progress",
  available: "Available",
  busy: "Busy",
  on_leave: "On Leave",
  approved: "Approved",
  rejected: "Rejected",
  active: "Active",
  inactive: "Inactive",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const style = statusStyles[status] ?? "bg-slate-50 text-slate-600 border-slate-200";
  const label = statusLabels[status] ?? status;

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${style} ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
    >
      {label}
    </span>
  );
}
