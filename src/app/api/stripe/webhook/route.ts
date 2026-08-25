import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { calculateCommission, stripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Falta la firma de Stripe" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET || "");
  } catch (err) {
    console.error("Firma de webhook inválida", err);
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    await fulfillCheckout(event.data.object as Stripe.Checkout.Session);
  }

  return NextResponse.json({ received: true });
}

async function fulfillCheckout(session: Stripe.Checkout.Session) {
  const courseId = session.metadata?.courseId;
  const studentId = session.metadata?.studentId;
  if (!courseId || !studentId) return;

  const admin = createAdminClient();

  const { data: course } = await admin
    .from("courses")
    .select("id, instructor_id")
    .eq("id", courseId)
    .single();
  if (!course) return;

  const amountPaid = (session.amount_total ?? 0) / 100;
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  if (paymentIntentId) {
    const { data: existingTransaction } = await admin
      .from("transactions")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();
    // Evita duplicar la inscripción/transacción si Stripe reintenta el webhook.
    if (existingTransaction) return;
  }

  await admin.from("enrollments").upsert(
    {
      student_id: studentId,
      course_id: courseId,
      amount_paid: amountPaid,
      stripe_checkout_session_id: session.id,
    },
    { onConflict: "student_id,course_id", ignoreDuplicates: true },
  );

  const { data: enrollment } = await admin
    .from("enrollments")
    .select("id")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .maybeSingle();

  const { platformFee, instructorEarnings } = calculateCommission(amountPaid);

  await admin.from("transactions").insert({
    instructor_id: course.instructor_id,
    student_id: studentId,
    course_id: courseId,
    enrollment_id: enrollment?.id ?? null,
    amount: amountPaid,
    platform_fee: platformFee,
    instructor_earnings: instructorEarnings,
    status: "completed",
    stripe_payment_intent_id: paymentIntentId ?? null,
  });

  await admin.rpc("increment_instructor_balance", {
    p_instructor_id: course.instructor_id,
    p_amount: instructorEarnings,
  });
}
