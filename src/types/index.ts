// ===== GreenSky Solar - Type Definitions =====

export type ProjectStatus = "ongoing" | "completed" | "pending" | "cancelled";
export type TaskStatus = "todo" | "in_progress" | "completed" | "cancelled";
export type Priority = "low" | "medium" | "high" | "urgent";
// System roles: admin (full access), technician (internal staff), client (external/homeowner)
export type UserRole = "admin" | "technician" | "client";
export type ReportStatus = "pending" | "approved" | "rejected";

export interface Project {
  id: string;
  name: string;
  client: string;
  location: string;
  status: ProjectStatus;
  priority: Priority;
  startDate: string;
  endDate: string;
  budget: number;
  progress: number;
  description: string;
  assignedTechnicians: string[];
  projectLead?: string;
  userId?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  tasks: Task[];
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignedTo: string;
  dueDate: string;
  createdAt: string;
}

export interface Technician {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  specialization: string;
  rating: number;
  projectsCompleted: number;
  activeProjects: number;
  status: "available" | "busy" | "on_leave";
  joinDate: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  contactNumber?: string | null;
  role: UserRole;
  avatar: string;
  status: "active" | "inactive";
  lastLogin: string;
  createdAt: string;
}

export type ClientApprovalStatus = "pending" | "approved" | "rejected";

export interface Report {
  id: string;
  title: string;
  type: "service" | "quotation" | "revenue";
  status: ReportStatus;
  submittedBy: string;
  submittedAt: string;
  projectId?: string;
  projectName?: string;
  amount?: number;
  description: string;
  /** Client approval status when quotation/report was sent to client (from linked document) */
  clientApprovalStatus?: ClientApprovalStatus | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: "installation" | "inspection" | "maintenance_repair" | "cleaning" | "inverter_battery_setup";
  projectId?: string;
  projectName?: string;
  color: string;
}

export interface DashboardStats {
  totalProjects: number;
  ongoingProjects: number;
  completedProjects: number;
  pendingProjects: number;
  totalRevenue: number;
  monthlyRevenue: number;
  activeTechnicians: number;
  totalTechnicians: number;
}

// ===== Inventory =====
export type InventoryCategory =
  | "solar_panels"
  | "inverters"
  | "batteries"
  | "mounting"
  | "wiring"
  | "tools"
  | "accessories";

export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: InventoryCategory;
  quantity: number;
  minStock: number;
  unit: string;
  unitPrice: number;
  location: string;
  supplier: string;
  status: InventoryStatus;
  lastRestocked: string;
  description: string;
}

// ===== Inventory Movements =====
export type InventoryMovementType = "deduction" | "return" | "adjustment";

export interface ProjectInventoryItem {
  id: string;
  projectId: string;
  inventoryItemId: string;
  itemName: string;
  itemSku: string;
  itemCategory: InventoryCategory;
  quantity: number;
  unitPrice: number;
  unit: string;
  notes: string;
  allocatedBy: string;
  allocatedByName: string;
  createdAt: string;
}

export interface InventoryMovement {
  id: string;
  inventoryItemId: string;
  itemName: string;
  itemSku: string;
  projectId: string | null;
  projectName: string | null;
  movementType: InventoryMovementType;
  quantity: number;
  reason: string;
  performedBy: string | null;
  performedByName: string | null;
  createdAt: string;
}

// ===== Support Tickets (After Sales) =====
export type TicketStatus = "open" | "in_progress" | "resolved";

export interface SupportTicket {
  id: string;
  projectId?: string;
  projectName?: string;
  clientName: string;
  clientEmail: string;
  subject: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
}
