import { NextResponse } from "next/server";
import { checkAgentAuth, isUuid } from "@/lib/agent-auth";
import { createClient } from "@/lib/supabase/server";
import type { Section, Lesson } from "@/types/database";

/**
 * Temario (secciones + lecciones) de un curso para el agente de voz Edy.
 * Usa el cliente con RLS: los títulos del temario son públicos para cursos
 * publicados, pero content_url/content_text solo se exponen si el
 * estudiante (studentId) está inscrito — ver notas de RLS en CLAUDE.md.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = checkAgentAuth(request);
  if (authError) return authError;

  const { id: courseId } = await params;
  const { searchParams } = new URL(request.url);
  const studentIdParam = searchParams.get("studentId");
  const studentId = studentIdParam && isUuid(studentIdParam) ? studentIdParam : null;

  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, status")
    .eq("id", courseId)
    .eq("status", "published")
    .maybeSingle();
  if (!course) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  let isEnrolled = false;
  if (studentId) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("course_id", courseId)
      .eq("student_id", studentId)
      .maybeSingle();
    isEnrolled = Boolean(enrollment);
  }

  const { data: sectionsRaw } = await supabase
    .from("sections")
    .select("*, lessons(*)")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  const sections = (sectionsRaw ?? []).map((section) => ({
    ...(section as Section),
    lessons: [...(((section as unknown as { lessons: Lesson[] }).lessons) ?? [])].sort(
      (a, b) => a.position - b.position,
    ),
  }));

  const lessons = sections.flatMap((section) =>
    section.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      section_title: section.title,
      type: lesson.type,
      duration_seconds: lesson.duration_seconds,
      is_free_preview: lesson.is_free_preview,
      content_url: isEnrolled || lesson.is_free_preview ? lesson.content_url : null,
      content_text: isEnrolled || lesson.is_free_preview ? lesson.content_text : null,
    })),
  );

  return NextResponse.json(lessons);
}
