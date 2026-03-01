import { z } from "zod";
import { dateStringSchema, latSchema, lngSchema, nonNegativeNumber, optionalString } from "./common";

const serviceType = z.enum([
  "site_inspection",
  "solar_panel_installation",
  "inverter_battery_setup",
  "maintenance_repair",
  "commissioning",
  "cleaning",
]);

const bookingStatus = z.enum(["confirmed", "pending", "completed", "cancelled", "in_progress"]);

export const createBookingSchema = z.object({
  serviceType,
  date: dateStringSchema,
  time: z.string().min(1, "Time is required").regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),
  address: z.string().min(1, "Address is required").max(500).trim(),
  notes: optionalString,
  technician: z.string().optional(),
  amount: nonNegativeNumber,
  lat: z.number().optional(),
  lng: z.number().optional(),
  addressId: z.string().optional(),
});

/** Accepts HH:MM, H:MM, or "HH:MM AM/PM" (e.g. 09:00, 9:00, 09:00 AM, 01:00 PM) */
const timeFormat = z.string().refine(
  (s) => !s || /^\d{1,2}:\d{2}(\s*(?:AM|PM))?$/i.test(s.trim()),
  "Invalid time format"
);

export const updateBookingSchema = z.object({
  serviceType: serviceType.optional(),
  date: dateStringSchema.optional(),
  time: timeFormat.optional(),
  status: bookingStatus.optional(),
  technician: z.string().optional(),
  address: z.string().max(500).trim().optional(),
  notes: optionalString.optional(),
  amount: nonNegativeNumber.optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  addressId: z.string().optional(),
});

export const createAddressSchema = z.object({
  label: z.string().min(1, "Label is required").max(100).trim(),
  fullAddress: z.string().min(1, "Full address is required").max(500).trim(),
  city: z.string().min(1, "City is required").max(100).trim(),
  province: z.string().min(1, "Province is required").max(100).trim(),
  zipCode: z.string().max(20).trim(),
  lat: latSchema,
  lng: lngSchema,
  isDefault: z.boolean().optional(),
  monthlyBill: nonNegativeNumber.optional(),
  appliances: z.array(z.object({
    name: z.string(),
    quantity: z.number().int().min(0),
    wattage: z.number().min(0),
  })).optional(),
});

export const updateAddressSchema = z.object({
  isDefault: z.literal(true),
});

const documentType = z.enum(["contract", "invoice", "warranty", "permit", "report"]);
const documentApprovalStatus = z.enum(["pending", "approved", "rejected"]);

export const createDocumentSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).trim(),
  type: documentType,
  fileSize: z.string().min(1, "File size is required").max(50),
  uploadedAt: z.string().min(1, "Upload date is required"),
  status: z.enum(["active", "expired", "draft"]).default("active"),
});

export const updateDocumentSchema = z.object({
  approvalStatus: documentApprovalStatus,
});
