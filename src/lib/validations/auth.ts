import { z } from "zod";
import { emailSchema, passwordSchema } from "./common";

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).trim(),
  email: emailSchema,
  password: z.string().min(6, "Password must be at least 6 characters"),
  contactNumber: z
    .string()
    .transform((s) => s.replace(/\D/g, ""))
    .refine((s) => s.length === 10, "Contact must be exactly 10 digits"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});
