import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export type WarrantyStatus = "in_warranty" | "expiring_soon" | "expired";

const statusConfig: Record<
  WarrantyStatus,
  { icon: React.ReactNode; bg: string; text: string; label: string }
> = {
  in_warranty: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    bg: "bg-green-50 border-green-200",
    text: "text-green-700",
    label: "In Warranty",
  },
  expiring_soon: {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    label: "Expiring Soon",
  },
  expired: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    bg: "bg-red-50 border-red-200",
    text: "text-red-700",
    label: "Expired",
  },
};

export function getWarrantyStatus(daysRemaining: number): WarrantyStatus {
  if (daysRemaining < 0) return "expired";
  if (daysRemaining <= 30) return "expiring_soon";
  return "in_warranty";
}

export default function WarrantyStatusBadge({ status }: { status: WarrantyStatus | null }) {
  if (status == null) return null;
  const config = statusConfig[status];
  if (!config) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
