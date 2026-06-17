import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { defaultPublicCatalog } from "@/lib/catalog";
import { MenuContent } from "./menu-content";

describe("MenuContent", () => {
  it("shows Sheet-driven product and add-on ranges in ascending order", () => {
    render(
      <MenuContent
        initialCatalog={{
          ...defaultPublicCatalog,
          products: [
            ...defaultPublicCatalog.products,
            {
              id: "mini-cheesecake-box",
              label: "Mini cheesecake box",
              low: 52,
              high: 42,
              enabled: true,
              sortOrder: 4
            }
          ],
          addOns: [
            {
              id: "rush-finish",
              productId: "all",
              category: "add-on",
              label: "Rush finish",
              low: 15,
              high: 10,
              servings: "",
              enabled: true,
              sortOrder: 1
            }
          ]
        }}
      />
    );

    expect(screen.getByText("Mini cheesecake box")).toBeInTheDocument();
    expect(screen.getAllByText("$42-$52").length).toBeGreaterThan(0);
    expect(screen.getByText("Rush finish")).toBeInTheDocument();
    expect(screen.getByText("$10-$15")).toBeInTheDocument();
    expect(screen.queryByText("$52-$42")).not.toBeInTheDocument();
    expect(screen.queryByText("$15-$10")).not.toBeInTheDocument();
  });
});
