import { z } from "zod";
import { dateStringSchema, optionalString } from "./common";

const taskStatus = z.enum(["todo", "in_progress", "completed", "cancelled"]);
const priority = z.enum(["low", "medium", "high", "urgent"]);

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).trim(),
  description: optionalString,
  priority,
  dueDate: dateStringSchema,
  assignedTo: z.string().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: optionalString.optional(),
  status: taskStatus.optional(),
  priority: priority.optional(),
  assignedTo: z.string().optional(),
  dueDate: dateStringSchema.optional(),
});
