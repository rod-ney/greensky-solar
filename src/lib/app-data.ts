import type {
  CalendarEvent,
  DashboardStats,
  InventoryItem,
  Project,
  Report,
  Technician,
  User,
} from "@/types";
import { formatCurrency, formatDate } from "@/lib/format";

// Transitional data module while pages are being migrated to API fetches.
export const dashboardStats: DashboardStats = {
  totalProjects: 0,
  ongoingProjects: 0,
  completedProjects: 0,
  pendingProjects: 0,
  totalRevenue: 0,
  monthlyRevenue: 0,
  activeTechnicians: 0,
  totalTechnicians: 0,
};

export const clientContacts: { id: string; name: string; company: string }[] = [];
export const clientsWithAddresses: { id: string; company: string; defaultAddress: string }[] = [];
export const monthlyRevenueData: { month: string; revenue: number }[] = [];
export const projects: Project[] = [];
export const technicians: Technician[] = [];
export const users: User[] = [];
export const reports: Report[] = [];
export const calendarEvents: CalendarEvent[] = [];
export const inventoryItems: InventoryItem[] = [];

export function getProjectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export function getTechnicianById(id: string): Technician | undefined {
  return technicians.find((t) => t.id === id);
}

export function getTechnicianName(id: string): string {
  return technicians.find((t) => t.id === id)?.name ?? "Unassigned";
}

export { formatCurrency, formatDate };
