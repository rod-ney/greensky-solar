import { z } from "zod";

/** UUID or cuid-style ID */
export const idSchema = z.string().min(1, "ID is required");

/** Email with basic format validation */
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format")
  .transform((s) => s.trim().toLowerCase());

/** Password: min 8 chars */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

/** Non-empty string, trimmed */
export const nonEmptyString = z
  .string()
  .min(1, "This field is required")
  .transform((s) => s.trim());

/** Optional string, trimmed */
export const optionalString = z.string().optional().transform((s) => s?.trim() ?? "");

/** Date string YYYY-MM-DD */
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)");

/** Positive number */
export const positiveNumber = z.number().positive("Must be positive");

/** Non-negative number */
export const nonNegativeNumber = z.number().min(0, "Must be non-negative");

/** Lat/lng bounds */
export const latSchema = z.number().min(-90).max(90);
export const lngSchema = z.number().min(-180).max(180);
