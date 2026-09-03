import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PhotosPage from "./page";

const portfolioItems = [
  {
    filename: "rainbow-sprinkle-overload-cake-spinning.mp4",
    caption: "Rainbow sprinkle overload cake",
    kind: "video",
    alt: "Rainbow sprinkle overload cake spinning on display"
  },
  {
    filename: "death-by-chocolate-cake-top-view.jpeg",
    caption: "Death by chocolate cake",
    kind: "image",
    alt: "Top view of a death by chocolate cake with chocolate frosting and piped rosettes"
  },
  {
    filename: "lemon-poppyseed-cake-close-up.jpeg",
    caption: "Lemon poppyseed cake",
    kind: "image",
    alt: "Close-up of a lemon poppyseed cake with lemon decorations"
  },
  {
    filename: "custom-cake-shooters-front-view.jpeg",
    caption: "Custom cake shooters",
    kind: "image",
    alt: "Custom cake shooters arranged on a serving tray"
  },
  {
    filename: "sunset-birthday-cake-front-view.jpeg",
    caption: "Sunset birthday cake",
    kind: "image",
    alt: "Sunset birthday cake with orange frosting, mauve piping, gold pearls, and pink ribbons"
  },
  {
    filename: "lemon-raspberry-cake-spinning.mp4",
    caption: "Lemon raspberry cake",
    kind: "video",
    alt: "Lemon raspberry cake spinning on display"
  }
] as const;

describe("PhotosPage", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ships all replacement portfolio media and brand assets", () => {
    for (const item of portfolioItems) {
      expect(statSync(join(process.cwd(), "public", "portfolio", item.filename)).size).toBeGreaterThan(0);
    }
    expect(statSync(join(process.cwd(), "public", "meeras-logo-2.png")).size).toBeGreaterThan(0);
  });

  it("renders the stable shuffled order with exact captions", () => {
    render(<PhotosPage />);

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(6);
    expect(cards.map((card) => card.querySelector("h2")?.textContent)).toEqual(
      portfolioItems.map((item) => item.caption)
    );
  });

  it("renders four descriptive images and two video sources", () => {
    render(<PhotosPage />);

    expect(screen.getAllByRole("img")).toHaveLength(4);
    for (const item of portfolioItems.filter((item) => item.kind === "image")) {
      expect(screen.getByAltText(item.alt)).toHaveAttribute("src", expect.stringContaining(item.filename));
    }

    const videos = document.querySelectorAll("video");
    expect(videos).toHaveLength(2);
    expect(Array.from(videos, (video) => video.querySelector("source")?.getAttribute("src"))).toEqual(
      portfolioItems.filter((item) => item.kind === "video").map((item) => item.filename).map((filename) => `/portfolio/${filename}`)
    );
  });

  it("keeps the inspiration-photo adjustment disclaimer", () => {
    render(<PhotosPage />);

    expect(screen.getByText(/slight adjustments may be made compared to an inspiration photo/i)).toBeInTheDocument();
  });
});
