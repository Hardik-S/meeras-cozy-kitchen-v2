import { permanentRedirect } from "next/navigation";

export default function FoodSafetyRedirect() {
  permanentRedirect("/faq#food-safety");
}
