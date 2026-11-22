import { z } from "zod";

/**
 * Input shape for creating/editing a service provider. Lives here (not in a
 * route file) because Next.js route modules may only export HTTP handlers.
 * NestJS re-validates everything, including that each service code exists.
 */
export const providerSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(120),
  description: z.string().trim().max(1000).optional(),
  phone: z.string().trim().regex(/^[0-9+\-\s()]{7,20}$/, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").max(120).optional().or(z.literal("")),
  city: z.string().trim().min(1, "Enter a city").max(80),
  address: z.string().trim().max(300).optional(),
  services: z.array(z.string().regex(/^[A-Z][A-Z_]{1,30}$/)).min(1, "Choose at least one service").max(30),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});
