import { Resend } from "resend";
import { buildInquirySummary } from "./inquiry-summary";
import type { InquiryInput } from "./validation";

export { buildInquirySummary } from "./inquiry-summary";

export type SendInquiryResult =
  | { status: "sent"; id?: string }
  | { status: "skipped"; reason: "missing-env" }
  | { status: "error"; message: string };

export async function sendInquiryEmail(inquiry: InquiryInput, summary = buildInquirySummary(inquiry)): Promise<SendInquiryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.ORDER_NOTIFY_EMAIL;

  if (!apiKey || !notifyEmail) {
    return { status: "skipped", reason: "missing-env" };
  }

  const resend = new Resend(apiKey);
  try {
    const response = await resend.emails.send({
      from: "Meera's Cozy Kitchen <orders@resend.dev>",
      to: notifyEmail,
      replyTo: inquiry.email,
      subject: `New bakery inquiry from ${inquiry.name}`,
      text: summary
    });

    return { status: "sent", id: response.data?.id };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Inquiry email failed."
    };
  }
}
