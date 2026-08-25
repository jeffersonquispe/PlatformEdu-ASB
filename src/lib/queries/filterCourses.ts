import type { CourseWithInstructor } from "@/types/database";

export interface CourseFilterCriteria {
  category?: string;
  level?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
}

/**
 * Filtra un array de cursos ya cargado en memoria. Función pura, sin red:
 * la fuente de verdad para "solo cursos publicados" es RLS (ver
 * supabase/migrations/0002_rls.sql), no esta función.
 */
export function filterCourses<T extends CourseWithInstructor>(
  courses: T[],
  filters: CourseFilterCriteria,
): T[] {
  return courses.filter((course) => {
    if (filters.category && course.category !== filters.category) return false;
    if (filters.level && course.level !== filters.level) return false;
    if (filters.minPrice !== undefined && course.price < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && course.price > filters.maxPrice) return false;
    if (filters.minRating !== undefined && course.rating_average < filters.minRating) return false;
    if (filters.search) {
      const term = filters.search.trim().toLowerCase();
      const haystack = `${course.title} ${course.short_description ?? ""}`.toLowerCase();
      if (term && !haystack.includes(term)) return false;
    }
    return true;
  });
}
