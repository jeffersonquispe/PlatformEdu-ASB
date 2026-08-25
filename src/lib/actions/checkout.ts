"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";

export async function createCheckoutSessionAction(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/checkout/${courseId}`);

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, price, thumbnail_url, status, slug")
    .eq("id", courseId)
    .single();

  if (!course || course.status !== "published") return { error: "Este curso no está disponible" };
  if (Number(course.price) <= 0) return { error: "Este curso es gratuito, inscríbete directamente" };

  const { data: existingEnrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", user!.id)
    .eq("course_id", courseId)
    .maybeSingle();
  if (existingEnrollment) redirect(`/cursos/${course.slug}`);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  let sessionUrl: string | null = null;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: course.title,
              images: course.thumbnail_url ? [course.thumbnail_url] : undefined,
            },
            unit_amount: Math.round(Number(course.price) * 100),
          },
          quantity: 1,
        },
      ],
      customer_email: user!.email ?? undefined,
      metadata: { courseId: course.id, studentId: user!.id },
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cursos/${course.slug}`,
    });
    sessionUrl = session.url;
  } catch (err) {
    console.error("Stripe checkout session error", err);
    return { error: "No se pudo conectar con Stripe. Verifica la configuración de pagos." };
  }

  if (!sessionUrl) return { error: "No se pudo iniciar el pago" };
  redirect(sessionUrl);
}
