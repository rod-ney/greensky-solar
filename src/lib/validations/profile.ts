import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  contactNumber: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const digits = String(v).replace(/\D/g, "");
      if (digits.length === 0) return null;
      if (digits.length === 10) return digits;
      throw new Error("Contact must be exactly 10 digits");
    }),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  twoFactorEnabled: z.boolean().optional(),
});
