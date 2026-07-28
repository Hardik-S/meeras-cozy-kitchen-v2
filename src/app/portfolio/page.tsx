import { permanentRedirect } from "next/navigation";

export default function PortfolioRedirect() {
  permanentRedirect("/photos");
}
