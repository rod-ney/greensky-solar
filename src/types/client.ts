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
  serviceType: ServiceType;
  date: string;
  time: string;
  status: BookingStatus;
  technician: string;
  projectLead?: string;
  address: string;
  notes: string;
  amount: number;
  lat?: number;
  lng?: number;
  addressId?: string;
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
}
