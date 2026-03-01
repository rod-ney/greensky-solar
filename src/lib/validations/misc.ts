import { z } from "zod";
import { dateStringSchema, idSchema, nonNegativeNumber, optionalString } from "./common";

export const createTechnicianSchema = z.object({
  userId: idSchema,
  specialization: z.string().min(1, "Specialization is required").max(200).trim(),
});

export const createInvoiceSchema = z.object({
  serviceType: z.string().optional(),
  amount: nonNegativeNumber.optional(),
  dueDate: dateStringSchema.optional(),
  paymentInstructions: optionalString.optional(),
  clientUserId: z.string().optional(),
});

export const updateInvoiceSchema = z.object({
  serviceType: z.string().optional(),
  amount: nonNegativeNumber.optional(),
  dueDate: dateStringSchema.optional(),
  paymentInstructions: optionalString.optional(),
  clientUserId: z.string().nullable().optional(),
  status: z.enum(["paid", "pending", "overdue", "refunded"]).optional(),
});

export const createTicketSchema = z.object({
  projectId: z.string().optional(),
  clientName: z.string().min(1, "Client name is required").max(200).trim(),
  clientEmail: z.string().email("Invalid email"),
  subject: z.string().min(1, "Subject is required").max(200).trim(),
  description: optionalString.optional(),
});

export const updateTicketSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]),
});

export const createReportSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).trim(),
  type: z.enum(["service", "quotation", "revenue"]),
  submittedBy: z.string().min(1, "Submitted by is required"),
  description: z.string().min(1, "Description is required").max(5000).trim(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  submittedAt: z.string().optional(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  amount: nonNegativeNumber.optional(),
});

export const updateReportSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});

export const sendReportSchema = z.object({
  reportId: idSchema,
  recipientId: idSchema,
});
