import { z } from "zod";

/**
 * Input shape for creating/editing an insurance partner. Lives here (not in a
 * route file) because Next.js route modules may only export HTTP handlers.
 * NestJS re-validates everything.
 */
const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const partnerSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(120),
  description: z.preprocess(blank, z.string().trim().max(1000).optional()),
  contactName: z.preprocess(blank, z.string().trim().max(120).optional()),
  phone: z.string().trim().regex(/^[0-9+\-\s()]{7,20}$/, "Enter a valid phone number"),
  email: z.preprocess(blank, z.string().trim().email("Enter a valid email").max(120).optional()),
  website: z.preprocess(
    blank,
    z
      .string()
      .trim()
      .url("Enter a full web address, e.g. https://example.com")
      .refine((u) => /^https?:\/\//i.test(u), "Only http(s) addresses are allowed")
      .max(200)
      .optional(),
  ),
  products: z
    .array(z.enum(["NEW", "RENEWAL", "COMPREHENSIVE", "THIRD_PARTY", "ADD_ON"]))
    .min(1, "Choose at least one cover type")
    .max(5),
  cities: z.array(z.string().trim().min(1).max(80)).max(60).optional(),
  // Written by the business exactly as it should be disclosed to customers.
  licenceNote: z.preprocess(blank, z.string().trim().max(300).optional()),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});
