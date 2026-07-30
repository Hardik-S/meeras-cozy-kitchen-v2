import { z } from "zod";
import { isAtLeastMinimumNotice, isValidDateInput } from "./dates";

export const pickupTimeOptions = [
  { value: "08:00-10:00", label: "8am-10am" },
  { value: "10:00-12:00", label: "10am-12pm" },
  { value: "12:00-14:00", label: "12pm-2pm" },
  { value: "14:00-16:00", label: "2pm-4pm" },
  { value: "16:00-18:00", label: "4pm-6pm" },
  { value: "18:00-20:00", label: "6pm-8pm" },
  { value: "20:00-22:00", label: "8pm-10pm" }
] as const;

export type PickupTime = typeof pickupTimeOptions[number]["value"];

function catalogId(message: string) {
  return z.string().trim().min(1, message).transform((value) => value.toLowerCase());
}

function catalogIds(message: string) {
  return z.array(catalogId(message))
    .max(20, "Please choose fewer options.")
    .default([])
    .transform((ids) => [...new Set(ids)]);
}

const singleLineText = z.string()
  .trim()
  .transform((value) => value.replace(/\s+/g, " "));

export function pickupTimeLabel(value: string) {
  return pickupTimeOptions.find((option) => option.value === value)?.label ?? value;
}

export function createInquirySchema(today = new Date()) {
  return z.strictObject({
    name: singleLineText.pipe(z.string().min(2, "Please enter your name.")),
    email: z.string().trim().pipe(z.email("Please enter a valid email.")),
    phone: singleLineText.pipe(z.string().min(7, "Please include a phone number.")),
    eventDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a pickup date."),
    pickupTime: z.enum(
      pickupTimeOptions.map((option) => option.value) as [PickupTime, ...PickupTime[]],
      { error: "Please choose a pickup time." }
    ),
    cakeSizeId: catalogId("Please choose a cake size."),
    flavourId: catalogId("Please choose a cake flavour."),
    frostingId: catalogId("Please choose a frosting flavour."),
    fillingIds: catalogIds("Please choose a filling."),
    toppingIds: catalogIds("Please choose a topping."),
    message: z.string().trim().min(10, "Please share a few design details.").max(1200),
    acknowledgements: z.object({
      notice: z.literal(true, { error: "Please confirm the notice policy." }),
      allergens: z.literal(true, { error: "Please confirm the allergen note." }),
      address: z.literal(true, { error: "Please confirm pickup details are shared after booking." }),
      certification: z.literal(true, { error: "Please confirm the certification note." }),
      inspiration: z.literal(true, { error: "Please confirm that inspiration photos may require slight adjustments." }),
      payment: z.literal(true, { error: "Please confirm the payment policy." })
    }),
    website: z.string().trim().max(0, "Spam check failed.").optional().default("")
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
  });
}

export const inquirySchema = createInquirySchema();

export type InquiryInput = z.infer<typeof inquirySchema>;
