import { describe, expect, it } from "vitest";
import { filterCourses } from "./filterCourses";
import type { CourseWithInstructor } from "@/types/database";

function makeCourse(overrides: Partial<CourseWithInstructor>): CourseWithInstructor {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    instructor_id: "instructor-1",
    title: "Curso genérico",
    slug: "curso-generico",
    description: null,
    short_description: null,
    thumbnail_url: null,
    category: "Desarrollo Web",
    level: "beginner",
    price: 0,
    status: "published",
    language: "es",
    rating_average: 0,
    rating_count: 0,
    student_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    instructor: null,
    ...overrides,
  };
}

describe("filterCourses", () => {
  it("dado el catálogo, cuando filtro por nivel 'beginner', entonces solo veo cursos de ese nivel", () => {
    const courses = [
      makeCourse({ id: "1", level: "beginner" }),
      makeCourse({ id: "2", level: "advanced" }),
      makeCourse({ id: "3", level: "beginner" }),
    ];

    const result = filterCourses(courses, { level: "beginner" });

    expect(result).toHaveLength(2);
    expect(result.every((c) => c.level === "beginner")).toBe(true);
  });

  it("dado un filtro de categoría + texto, cuando ambos aplican, entonces solo veo los que cumplen los dos", () => {
    const courses = [
      makeCourse({ id: "1", category: "Diseño", title: "React desde cero" }),
      makeCourse({ id: "2", category: "Desarrollo Web", title: "React desde cero" }),
      makeCourse({ id: "3", category: "Desarrollo Web", title: "Python para todos" }),
    ];

    const result = filterCourses(courses, { category: "Desarrollo Web", search: "react" });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("dado que ningún curso cumple, entonces la lista queda vacía", () => {
    const courses = [
      makeCourse({ id: "1", level: "beginner", category: "Desarrollo Web" }),
      makeCourse({ id: "2", level: "advanced", category: "Diseño" }),
    ];

    const result = filterCourses(courses, { level: "intermediate" });

    expect(result).toHaveLength(0);
  });

  it("filtra por rango de precio y rating mínimo", () => {
    const courses = [
      makeCourse({ id: "1", price: 10, rating_average: 4.5 }),
      makeCourse({ id: "2", price: 100, rating_average: 3 }),
      makeCourse({ id: "3", price: 50, rating_average: 4.8 }),
    ];

    const result = filterCourses(courses, { minPrice: 20, maxPrice: 80, minRating: 4 });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });
});
