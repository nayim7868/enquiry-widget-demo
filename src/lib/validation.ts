import { z } from "zod";

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

export const CreateEnquirySchema = z
  .object({
    mode: EnquiryModeSchema,
    type: EnquiryTypeSchema,

    name: z.string().min(1, "Name is required").max(100),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    phone: z.string().min(6, "Phone looks too short").max(30).optional().or(z.literal("")),
    message: z.string().min(1, "Message is required").max(2000),

    // Optional context (auto-captured)
    pageUrl: z.string().url().optional(),
    referrer: z.string().optional(),
    utmSource: z.string().optional(),
    utmMedium: z.string().optional(),
    utmCampaign: z.string().optional(),
    device: z.string().optional(),

    // Part-ex fields (only required in part-ex mode)
    reg: z.string().optional(),
    mileage: z.coerce.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    const hasEmail = !!data.email && data.email.trim() !== "";
    const hasPhone = !!data.phone && data.phone.trim() !== "";

    if (!hasEmail && !hasPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please provide an email or a phone number.",
        path: ["email"],
      });
    }

    const needsPartEx =
      data.mode === "PART_EX" || data.type === "PART_EXCHANGE";

    if (needsPartEx) {
      if (!data.reg || data.reg.trim().length < 2) {
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
