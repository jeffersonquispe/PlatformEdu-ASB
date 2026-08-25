import { NextResponse } from "next/server";
import { checkAgentAuth } from "@/lib/agent-auth";
import { searchCourses } from "@/lib/queries/courses";

/**
 * Lista el catálogo publicado para el agente de voz Edy, con filtro opcional
 * por categoría. Wrapper delgado sobre searchCourses (misma query que usa
 * /cursos), sin lógica de Supabase propia.
 */
export async function GET(request: Request) {
  const authError = checkAgentAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;

  const { courses } = await searchCourses({ category, pageSize: 50 });

  return NextResponse.json(
    courses.map((course) => ({
      id: course.id,
      title: course.title,
      slug: course.slug,
      short_description: course.short_description,
      category: course.category,
      level: course.level,
      price: course.price,
      rating_average: course.rating_average,
      student_count: course.student_count,
      url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/cursos/${course.slug}`,
    })),
  );
}
