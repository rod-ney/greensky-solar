// ===== Client Portal - Type Definitions =====

export type BookingStatus = "confirmed" | "pending" | "completed" | "cancelled" | "in_progress";
export type ServiceType =
  | "site_inspection"
  | "solar_panel_installation"
  | "inverter_battery_setup"
  | "maintenance_repair"
  | "commissioning"
  | "cleaning";
export type PaymentStatus = "paid" | "pending" | "overdue" | "refunded";
export type PaymentMethod = "gcash" | "bank_transfer" | "credit_card" | "cash";
export type DocumentType = "contract" | "invoice" | "warranty" | "permit" | "report";

export interface Booking {
  id: string;
  referenceNo: string;
  clientName?: string;
  clientContactNumber?: string;
  serviceType: ServiceType;
  /** Service window start (YYYY-MM-DD). */
  date: string;
  /** Service window end; omit or same as `date` for a single day. */
  endDate?: string;
  time: string;
  status: BookingStatus;
  technician: string;
  projectLead?: string;
  address: string;
  notes: string;
  amount: number;
  userId?: string;
  lat?: number;
  lng?: number;
  addressId?: string;
  /** Average monthly Meralco bill (PHP) from the linked saved address, when the booking used one. */
  addressMonthlyBill?: number;
  /** Appliances on file for the linked saved address. */
  addressAppliances?: Appliance[];
  projectId?: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface CalendarDay {
  date: string;
  hasBooking: boolean;
  bookingCount: number;
  isAvailable: boolean;
}

export interface SavedAddress {
  id: string;
  label: string;
  fullAddress: string;
  city: string;
  province: string;
  zipCode: string;
  lat: number;
  lng: number;
  isDefault: boolean;
  appliances: Appliance[];
  monthlyBill: number;
}

export interface Appliance {
  id: string;
  name: string;
  quantity: number;
  wattage: number;
}

export interface Payment {
  id: string;
  referenceNo: string;
  bookingRef: string;
  description: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  date: string;
  dueDate?: string;
  serviceType?: string;
  paymentInstructions?: string;
}

// ===== Client Project Detail Types =====

export type ClientTaskStatus = "todo" | "in_progress" | "completed" | "cancelled";
export type ClientTaskPriority = "low" | "medium" | "high" | "urgent";
export type ClientProjectStatus = "ongoing" | "completed" | "pending" | "cancelled";

export interface ClientTask {
  id: string;
  title: string;
  status: ClientTaskStatus;
  priority: ClientTaskPriority;
  dueDate: string;
  createdAt: string;
  assignedToName: string;
}

export interface ClientProjectDetail {
  id: string;
  name: string;
  location: string;
  status: ClientProjectStatus;
  priority: ClientTaskPriority;
  startDate: string;
  endDate: string;
  progress: number;
  description: string;
  projectLeadName: string;
  assignedTechnicianNames: string[];
  tasks: ClientTask[];
}

export type DocumentApprovalStatus = "pending" | "approved" | "rejected";

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  fileSize: string;
  uploadedAt: string;
  projectName?: string;
  status: "active" | "expired" | "draft";
  approvalStatus?: DocumentApprovalStatus;
  reportId?: string;
  /** Linked report row type when this document was created from a report (e.g. sent quotation). */
  linkedReportType?: "service" | "quotation" | "revenue";
}
