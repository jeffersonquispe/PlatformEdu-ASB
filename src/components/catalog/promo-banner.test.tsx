import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PromoBanner } from "./promo-banner";

const STORAGE_KEY = "promo-banner-dismissed";

afterEach(() => {
  sessionStorage.clear();
});

describe("PromoBanner", () => {
  it("muestra el mensaje de la oferta cuando no fue descartado", async () => {
    render(<PromoBanner />);
    expect(await screen.findByText(/Oferta por tiempo limitado/i)).toBeInTheDocument();
  });

  it("no se renderiza si ya fue descartado en la sesión", () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    render(<PromoBanner />);
    expect(screen.queryByRole("region", { name: "Promoción" })).not.toBeInTheDocument();
  });

  it("se oculta y marca la sesión al hacer click en Descartar", async () => {
    render(<PromoBanner />);

    const button = await screen.findByRole("button", { name: "Descartar promoción" });
    fireEvent.click(button);

    expect(screen.queryByRole("region", { name: "Promoción" })).not.toBeInTheDocument();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe("1");
  });

  it("acepta copy personalizado por props", async () => {
    render(<PromoBanner title="Black Friday" detail="Todo al 50%." />);
    expect(await screen.findByText(/Black Friday/)).toBeInTheDocument();
    expect(screen.getByText(/Todo al 50%/)).toBeInTheDocument();
  });
});
