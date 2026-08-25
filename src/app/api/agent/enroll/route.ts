import { NextResponse } from "next/server";
import { checkAgentAuth, isUuid } from "@/lib/agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { decideEnrollmentAction } from "@/lib/actions/enrollment";

/**
 * Inscripción disparada por el agente de voz Edy: sin cookie de sesión, el
 * estudiante llega como studentId explícito en el body. La decisión de qué
 * hacer (inscribir vs. mandar a pagar) es lógica pura en
 * `decideEnrollmentAction`; aquí solo se escribe en la base según el resultado.
 *
 * `confirmed` es la confirmación verbal del estudiante: sin ella no se escribe
 * nada, solo se devuelve la decisión para que el agente la lea en voz alta.
 */
/**
 * Primera lección del curso. Igual que `getFirstLessonId`, pero con el cliente
 * admin: esta ruta la llama el agente sin cookie de sesión, así que el cliente
 * cookie-based de `@/lib/supabase/server` no aplica aquí.
 */
async function firstLessonId(
  admin: ReturnType<typeof createAdminClient>,
  courseId: string,
): Promise<string | null> {
  const { data: sections } = await admin
    .from("sections")
    .select("id, position, lessons(id, position)")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  for (const section of sections ?? []) {
    const lessons = [
      ...(((section as unknown as { lessons: { id: string; position: number }[] }).lessons) ?? []),
    ].sort((a, b) => a.position - b.position);
    if (lessons.length > 0) return lessons[0].id;
  }
  return null;
}

export async function POST(request: Request) {
  const authError = checkAgentAuth(request);
  if (authError) return authError;

  let body: { courseId?: string; studentId?: string; confirmed?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const { courseId, studentId, confirmed } = body;
  if (!courseId || !studentId) {
    return NextResponse.json({ error: "Faltan courseId y/o studentId" }, { status: 400 });
  }
  if (!isUuid(studentId)) {
    return NextResponse.json({ error: "studentId inválido" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
  }

  const { data: course } = await admin
    .from("courses")
    .select("id, title, price, thumbnail_url, status, slug")
    .eq("id", courseId)
    .maybeSingle();

  if (!course || course.status !== "published") {
    return NextResponse.json({ error: "Este curso no está disponible" }, { status: 404 });
  }

  const decision = decideEnrollmentAction(course);

  // Curso de pago: nunca se escribe en enrollments, solo se devuelve el link.
  if (decision.type === "checkout") {
    return NextResponse.json({ enrolled: false, checkoutUrl: decision.url });
  }

  if (!confirmed) {
    return NextResponse.json({ enrolled: false, requiresConfirmation: true });
  }

  const { data: existingEnrollment } = await admin
    .from("enrollments")
    .select("id")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existingEnrollment) {
    const lessonId = await firstLessonId(admin, courseId);
    return NextResponse.json({
      enrolled: true,
      alreadyEnrolled: true,
      learnUrl: lessonId ? `/aprender/${courseId}/${lessonId}` : null,
      courseUrl: `/cursos/${course.slug}`,
    });
  }

  const { error } = await admin.from("enrollments").upsert(
    { student_id: studentId, course_id: courseId, amount_paid: 0 },
    { onConflict: "student_id,course_id", ignoreDuplicates: true },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const lessonId = await firstLessonId(admin, courseId);
  return NextResponse.json({
    enrolled: true,
    learnUrl: lessonId ? `/aprender/${courseId}/${lessonId}` : null,
  });
}
