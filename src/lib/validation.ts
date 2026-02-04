import { z } from "zod";

/**
 * These enums match prisma/schema.prisma exactly.
 * Keeping them in sync avoids bugs.
 */
export const EnquiryModeSchema = z.enum([
  "GENERAL",
  "FLEET",
  "PARCEL",
  "PART_EX",
  "STOCK",
]);

export const EnquiryTypeSchema = z.enum([
  "QUICK_QUESTION",
  "QUOTE",
  "FLEET_ENQUIRY",
  "PART_EXCHANGE",
]);

/**
 * Input payload expected by POST /api/enquiries
 */
export const CreateEnquirySchema = z
  .object({
    mode: EnquiryModeSchema,
    type: EnquiryTypeSchema,

    name: z.string().trim().min(1, "Name is required").max(100),

    // Allow empty string from form inputs, but treat as "not provided"
    email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
    phone: z.string().trim().min(6, "Phone looks too short").max(30).optional().or(z.literal("")),

    message: z.string().trim().min(1, "Message is required").max(2000),

    // Auto-captured context (recommended)
    pageUrl: z.string().url().optional(),
    referrer: z.string().optional(),
    utmSource: z.string().optional(),
    utmMedium: z.string().optional(),
    utmCampaign: z.string().optional(),
    device: z.string().optional(),

    // Part exchange details (only required for PART_EX / PART_EXCHANGE)
    reg: z.string().trim().optional(),
    mileage: z.coerce.number().int().positive().optional(),

    // Fleet details (only required for FLEET / FLEET_ENQUIRY)
    companyName: z.string().trim().max(120).optional(),
    fleetSizeBand: z.string().trim().max(50).optional(),
    timeframe: z.string().trim().max(50).optional(),

  })
  .superRefine((data, ctx) => {
    const hasEmail = !!data.email && data.email.trim() !== "";
    const hasPhone = !!data.phone && data.phone.trim() !== "";
    const isFleet = data.mode === "FLEET" || data.type === "FLEET_ENQUIRY";

    if (isFleet) {
      // optional fields, but if present, ensure they're not empty strings
      if (data.companyName !== undefined && data.companyName.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Company name can't be empty if provided.",
          path: ["companyName"],
        });
      }
    }

    // Must have at least one contact method
    if (!hasEmail && !hasPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please provide an email or a phone number.",
        path: ["email"],
      });
    }

    const needsPartEx = data.mode === "PART_EX" || data.type === "PART_EXCHANGE";

    if (needsPartEx) {
      if (!data.reg || data.reg.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Vehicle registration is required for part exchange.",
          path: ["reg"],
        });
      }

      if (data.mileage === undefined || Number.isNaN(data.mileage)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mileage is required for part exchange.",
          path: ["mileage"],
        });
      }
    }
  });

export type CreateEnquiryInput = z.infer<typeof CreateEnquirySchema>;
