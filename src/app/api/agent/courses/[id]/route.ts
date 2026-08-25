import { NextResponse } from "next/server";
import { checkAgentAuth } from "@/lib/agent-auth";
import { getPublishedCourseById } from "@/lib/queries/courses";

/**
 * Detalle de un curso publicado para el agente de voz Edy.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = checkAgentAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const course = await getPublishedCourseById(id);
  if (!course) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    short_description: course.short_description,
    category: course.category,
    level: course.level,
    price: course.price,
    rating_average: course.rating_average,
    student_count: course.student_count,
    instructor: course.instructor
      ? { full_name: course.instructor.full_name, headline: course.instructor.headline }
      : null,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/cursos/${course.slug}`,
  });
}
