import type { Course } from "@/types/database";

/**
 * Decisión pura de inscripción: dado un curso, decide si el estudiante puede
 * inscribirse directo (gratis) o si hay que mandarlo a pagar. No toca Supabase
 * ni Stripe — así se puede testear como lógica pura, sin red.
 */
export type EnrollmentDecision =
  | { type: "enroll" }
  | { type: "checkout"; url: string };

/** Curso mínimo necesario para decidir: solo id y precio. */
export type DecidableCourse = Pick<Course, "id" | "price">;

/**
 * URL de checkout simulada (no crea una sesión real de Stripe). El Route
 * Handler la devuelve tal cual al agente; el flujo de pago real vive en
 * `createCheckoutSessionAction`.
 */
export function simulatedCheckoutUrl(courseId: string): string {
  return `/checkout/${courseId}`;
}

export function decideEnrollmentAction(course: DecidableCourse): EnrollmentDecision {
  const price = Number(course.price);
  if (!Number.isFinite(price) || price <= 0) {
    return { type: "enroll" };
  }
  return { type: "checkout", url: simulatedCheckoutUrl(course.id) };
}
