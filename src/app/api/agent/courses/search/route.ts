import { NextResponse } from "next/server";
import { searchCoursesBySimilarity } from "@/lib/queries/searchCourses";
import { checkAgentAuth } from "@/lib/agent-auth";

/**
 * Endpoint consumido por el agente de voz (LiveKit, repo edyagent) vía
 * backend_client.search_courses — no por el navegador. Protegido con un
 * secreto compartido en vez de sesión de Supabase porque el caller es un
 * backend externo, no un usuario autenticado en la app.
 */
export async function GET(request: Request) {
  const authError = checkAgentAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Falta el parámetro q" }, { status: 400 });
  }

  const courses = await searchCoursesBySimilarity(query, 10);

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
