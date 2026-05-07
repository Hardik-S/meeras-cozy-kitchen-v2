import { z } from "zod";
import { isAtLeastMinimumNotice, isValidDateInput } from "./dates";
import { cakeSizes } from "./pricing";

const cakeSizeIds = cakeSizes.map((size) => size.id);

export function createInquirySchema(today = new Date()) {
  return z.object({
    name: z.string().trim().min(2, "Please enter your name."),
    email: z.email("Please enter a valid email."),
    phone: z.string().trim().min(7, "Please include a phone number."),
    eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a pickup date."),
    servings: z.coerce.number().int().min(1).max(120),
    productType: z.string().trim().min(1, "Please choose a product."),
    cakeSizeId: z.string().optional(),
    flavourId: z.string().optional(),
    addOnIds: z.array(z.string()).default([]),
    budget: z.string().trim().max(80).optional().default(""),
    message: z.string().trim().min(10, "Please share a few design details.").max(1200),
    acknowledgements: z.object({
      notice: z.literal(true, { error: "Please confirm the notice policy." }),
      allergens: z.literal(true, { error: "Please confirm the allergen note." }),
      address: z.literal(true, { error: "Please confirm pickup details are shared after booking." }),
      certification: z.literal(true, { error: "Please confirm the certification note." })
    }),
    website: z.string().max(0, "Spam check failed.").optional().default("")
  }).superRefine((value, context) => {
    if (!isValidDateInput(value.eventDate)) {
      context.addIssue({
        code: "custom",
        path: ["eventDate"],
        message: "Please choose a valid pickup date."
      });
      return;
    }

    if (!isAtLeastMinimumNotice(value.eventDate, today)) {
      context.addIssue({
        code: "custom",
        path: ["eventDate"],
        message: "Please choose a pickup date at least 7 days away."
      });
    }

    if (value.productType === "cake" && (!value.cakeSizeId || !cakeSizeIds.includes(value.cakeSizeId))) {
      context.addIssue({
        code: "custom",
        path: ["cakeSizeId"],
        message: "Please choose a cake size."
      });
    }

  });
}

export const inquirySchema = createInquirySchema();

export type InquiryInput = z.infer<typeof inquirySchema>;
