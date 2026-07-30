import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import PhotosPage from "./page";

const portfolioImages = [
  {
    filename: "raspberry-ring-cake-front.jpeg",
    alt: "Front view of a raspberry cake topped with raspberries arranged in a ring"
  },
  {
    filename: "raspberry-ring-cake-overhead.jpeg",
    alt: "Overhead view of a raspberry cake topped with raspberries arranged in a ring"
  },
  {
    filename: "raspberry-ring-cake-detail.jpeg",
    alt: "Detail view of the piped finish and raspberry ring on a raspberry cake"
  },
  {
    filename: "raspberry-dollop-cake-front.jpeg",
    alt: "Front view of a raspberry cake topped with raspberries and piped dollops"
  },
  {
    filename: "raspberry-dollop-cake-overhead.jpeg",
    alt: "Overhead view of a raspberry cake topped with raspberries and piped dollops"
  },
  {
    filename: "raspberry-dollop-cake-detail.jpeg",
    alt: "Detail view of the piped dollops and raspberries on a raspberry cake"
  }
];

describe("PhotosPage", () => {
  it("ships the complete local portfolio and brand assets", () => {
    for (const image of portfolioImages) {
      expect(statSync(join(process.cwd(), "public", "portfolio", image.filename)).size).toBeGreaterThan(0);
    }
    expect(statSync(join(process.cwd(), "public", "meeras-logo.jpg")).size).toBeGreaterThan(0);
  });

  it("renders all six local portfolio photographs with distinct descriptive alt text", () => {
    render(<PhotosPage />);

    expect(screen.getAllByRole("img")).toHaveLength(6);
    for (const image of portfolioImages) {
      expect(screen.getByAltText(image.alt)).toHaveAttribute("src", expect.stringContaining(image.filename));
    }
  });

  it("keeps the inspiration-photo adjustment disclaimer", () => {
    render(<PhotosPage />);

    expect(screen.getByText(/slight adjustments may be made compared to an inspiration photo/i)).toBeInTheDocument();
  });
});
