import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("shows the business Instagram handle between the brand and Explore links", () => {
    render(<SiteFooter />);

    const instagram = screen.getByRole("link", { name: "@meerascozykitchen" });
    expect(instagram).toHaveAttribute("href", "https://www.instagram.com/meerascozykitchen/");
    expect(instagram.parentElement).toHaveClass("text-center");
    expect(screen.getByText("Instagram")).toBeInTheDocument();
    expect(screen.getByText("Explore")).toBeInTheDocument();
  });
});
