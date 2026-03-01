import { z } from "zod";

const userRole = z.enum(["admin", "technician", "client"]);

export const updateUserSchema = z
  .object({
    role: userRole.optional(),
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
  })
  .refine((d) => d.role !== undefined || d.contactNumber !== undefined, {
    message: "Provide role and/or contact number",
  });
