import type { BookingStatus, ServiceType } from "@/types/client";

/** Single source of truth for service type labels */
export const SERVICE_LABELS: Record<ServiceType, string> = {
  site_inspection: "Site Inspection",
  solar_panel_installation: "Solar Panel Installation",
  inverter_battery_setup: "Inverter & Battery Setup",
  maintenance_repair: "Maintenance & Repair",
  commissioning: "Commissioning",
  cleaning: "Cleaning",
};

/** Booking status labels */
export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  completed: "Completed",
  cancelled: "Cancelled",
  in_progress: "In Progress",
};

/** Status filter options for admin bookings */
export const BOOKING_STATUS_OPTIONS: { value: BookingStatus | "all"; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

/** Service options for dropdowns (value + label) */
export const SERVICE_OPTIONS: { value: ServiceType; label: string }[] = (
  Object.entries(SERVICE_LABELS) as [ServiceType, string][]
).map(([value, label]) => ({ value, label }));

/** Project status labels */
export const PROJECT_STATUS_LABELS: Record<string, string> = {
  ongoing: "Ongoing",
  completed: "Completed",
  pending: "Pending",
  cancelled: "Cancelled",
};

/** Task status labels */
export const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Service type CSS classes for badges/chips */
export const SERVICE_ICONS: Record<ServiceType, string> = {
  site_inspection: "bg-purple-50 text-purple-600",
  solar_panel_installation: "bg-brand-50 text-brand",
  inverter_battery_setup: "bg-blue-50 text-blue-600",
  maintenance_repair: "bg-amber-50 text-amber-600",
  commissioning: "bg-emerald-50 text-emerald-600",
  cleaning: "bg-cyan-50 text-cyan-600",
};
