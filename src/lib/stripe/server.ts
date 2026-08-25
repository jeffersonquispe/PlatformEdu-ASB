import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2026-07-29.dahlia",
  typescript: true,
});

/** Comisión de plataforma configurable vía env var (por defecto 20%). */
export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? "20");

export function calculateCommission(amount: number) {
  const platformFee = Math.round(amount * (PLATFORM_FEE_PERCENT / 100) * 100) / 100;
  const instructorEarnings = Math.round((amount - platformFee) * 100) / 100;
  return { platformFee, instructorEarnings };
}
