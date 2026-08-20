import type { Metadata } from "next";
import { ReviewsContent } from "@/components/reviews-content";

export const metadata: Metadata = {
  title: "Reviews",
  description: "Read approved customer reviews or share your experience with Meera's Cozy Kitchen."
};

export default function ReviewsPage() {
  return <ReviewsContent />;
}
