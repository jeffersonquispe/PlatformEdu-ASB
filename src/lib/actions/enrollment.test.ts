import { describe, expect, it } from "vitest";
import { decideEnrollmentAction } from "./enrollment";

describe("decideEnrollmentAction", () => {
  it("dado un curso con price = 0, entonces la decisión es inscribir directo", () => {
    const decision = decideEnrollmentAction({ id: "curso-gratis", price: 0 });

    expect(decision).toEqual({ type: "enroll" });
  });

  it("dado un curso con price > 0, entonces devuelve checkout simulado y no inscribe", () => {
    const decision = decideEnrollmentAction({ id: "curso-pago", price: 49.9 });

    expect(decision.type).toBe("checkout");
    expect(decision).toEqual({ type: "checkout", url: "/checkout/curso-pago" });
  });

  it("dado un precio nulo o inválido, entonces se trata como gratis (inscribir directo)", () => {
    expect(decideEnrollmentAction({ id: "x", price: null as unknown as number })).toEqual({ type: "enroll" });
    expect(decideEnrollmentAction({ id: "x", price: NaN })).toEqual({ type: "enroll" });
  });
});
