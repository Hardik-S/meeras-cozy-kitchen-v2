import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { defaultPublicCatalog } from "@/lib/catalog";
import { MenuContent } from "./menu-content";

describe("MenuContent", () => {
  it("shows the cake-only menu with visible fixed prices", () => {
    render(<MenuContent initialCatalog={defaultPublicCatalog} />);

    expect(screen.getByText("4-inch cake")).toBeInTheDocument();
    expect(screen.getByText("Starting at $35")).toBeInTheDocument();
    expect(screen.getByText("Starting at $60")).toBeInTheDocument();
    expect(screen.getByText("Starting at $75")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cake Flavours" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Frosting Flavours" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Fillings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Toppings" })).toBeInTheDocument();
    expect(screen.getByText("Oreo Crunch")).toBeInTheDocument();
    expect(screen.getAllByText("Included")).toHaveLength(10);
    expect(screen.queryByText("+$0")).not.toBeInTheDocument();
    expect(screen.getByText("Apricot")).toBeInTheDocument();
    expect(screen.getByText("Chopped Pistachio")).toBeInTheDocument();
    expect(screen.getAllByText("+$5").length).toBeGreaterThan(0);
    expect(screen.queryByText(/cupcake/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/dessert box/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/showing saved cake menu/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/showing recently refreshed menu/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/live menu refreshed/i)).not.toBeInTheDocument();
  });
});
