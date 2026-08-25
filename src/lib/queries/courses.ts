import { createClient } from "@/lib/supabase/server";
import { filterCourses } from "@/lib/queries/filterCourses";
import type { Course, CourseWithInstructor, Lesson, Section } from "@/types/database";

export interface CourseFilters {
  category?: string;
  level?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: "popular" | "newest" | "price_asc" | "price_desc" | "rating";
  page?: number;
  pageSize?: number;
}

export const COURSE_WITH_INSTRUCTOR_SELECT = "*, instructor:profiles(id, full_name, avatar_url, headline)";

export async function getFeaturedCourses(limit = 8) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select(COURSE_WITH_INSTRUCTOR_SELECT)
    .eq("status", "published")
    .order("student_count", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as CourseWithInstructor[];
}

/**
 * Primeros cursos publicados en orden alfabetico, para la seccion de
 * destacados de "Quienes somos". Se ordena por titulo (y no por
 * student_count como getFeaturedCourses) para que la seleccion sea estable:
 * no cambia cada vez que alguien se matricula.
 */
export async function getHighlightedCourses(limit = 3) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, slug, title, level, price")
    .eq("status", "published")
    .order("title", { ascending: true })
    .limit(limit);
  return (data ?? []) as Pick<Course, "id" | "slug" | "title" | "level" | "price">[];
}

export async function getCategoriesWithCounts() {
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("category").eq("status", "published");

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export async function searchCourses(filters: CourseFilters) {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 12;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("courses")
    .select(COURSE_WITH_INSTRUCTOR_SELECT, { count: "exact" })
    .eq("status", "published");

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.level) query = query.eq("level", filters.level);
  if (filters.search) {
    const term = filters.search.replace(/[%,]/g, "");
    query = query.or(`title.ilike.%${term}%,short_description.ilike.%${term}%`);
  }
  if (filters.minPrice !== undefined) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte("price", filters.maxPrice);
  if (filters.minRating !== undefined) query = query.gte("rating_average", filters.minRating);

  switch (filters.sort) {
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "price_asc":
      query = query.order("price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false });
      break;
    case "rating":
      query = query.order("rating_average", { ascending: false });
      break;
    default:
      query = query.order("student_count", { ascending: false });
  }

  const { data, count } = await query.range(from, to);
  return {
    courses: (data ?? []) as unknown as CourseWithInstructor[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getCourseBySlug(slug: string) {
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("*, instructor:profiles(id, full_name, avatar_url, headline, bio)")
    .eq("slug", slug)
    .maybeSingle();

  if (!course) return null;

  const { data: sectionsRaw } = await supabase
    .from("sections")
    .select("*, lessons(*)")
    .eq("course_id", course.id)
    .order("position", { ascending: true });

  const sections = (sectionsRaw ?? []).map((section) => ({
    ...(section as Section),
    lessons: [...(((section as unknown as { lessons: Lesson[] }).lessons) ?? [])].sort(
      (a, b) => a.position - b.position,
    ),
  }));

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*, student:profiles(full_name, avatar_url)")
    .eq("course_id", course.id)
    .order("created_at", { ascending: false })
    .limit(20);

  let isEnrolled = false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("course_id", course.id)
      .eq("student_id", user.id)
      .maybeSingle();
    isEnrolled = Boolean(enrollment);
  }

  return {
    course: course as unknown as CourseWithInstructor,
    sections,
    reviews: reviews ?? [],
    isEnrolled,
  };
}

export async function getPublishedCourseById(courseId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select(COURSE_WITH_INSTRUCTOR_SELECT)
    .eq("id", courseId)
    .eq("status", "published")
    .maybeSingle();
  return data as unknown as CourseWithInstructor | null;
}

export async function getFirstLessonId(courseId: string) {
  const supabase = await createClient();
  const { data: sectionsRaw } = await supabase
    .from("sections")
    .select("id, position, lessons(id, position)")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  for (const section of sectionsRaw ?? []) {
    const lessons = [
      ...(((section as unknown as { lessons: { id: string; position: number }[] }).lessons) ?? []),
    ].sort((a, b) => a.position - b.position);
    if (lessons.length > 0) return lessons[0].id;
  }
  return null;
}
