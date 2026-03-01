import { z } from "zod";
import { dateStringSchema, nonNegativeNumber, optionalString } from "./common";

const projectStatus = z.enum(["ongoing", "completed", "pending", "cancelled"]);
const priority = z.enum(["low", "medium", "high", "urgent"]);

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(200).trim(),
  client: z.string().min(1, "Client is required").max(200).trim(),
  location: z.string().max(500).trim(),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  budget: nonNegativeNumber,
  priority,
  description: z.string().max(5000).trim(),
  projectLead: optionalString,
  bookingId: z.string().optional(),
  userId: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(5000).trim().optional(),
  status: projectStatus.optional(),
  priority: priority.optional(),
  location: z.string().max(500).trim().optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  budget: nonNegativeNumber.optional(),
  progress: z.number().min(0).max(100).optional(),
  assignedTechnicians: z.array(z.string()).optional(),
  userId: z.string().optional(),
  warrantyStartDate: dateStringSchema.optional(),
  warrantyEndDate: dateStringSchema.optional(),
});
