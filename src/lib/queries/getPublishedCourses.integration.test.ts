import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Test de integración contra Supabase (local vía `supabase start` o el proyecto
 * de NEXT_PUBLIC_SUPABASE_URL en .env.local): requiere NEXT_PUBLIC_SUPABASE_URL,
 * NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY.
 * Se saltea automáticamente si no están presentes (p. ej. en CI sin secretos).
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KE10Y;

const hasCredentials = Boolean(supabaseUrl && anonKey && serviceRoleKey);

describe.skipIf(!hasCredentials)("catálogo público consultado como visitante anónimo", () => {
  const admin = hasCredentials
    ? createSupabaseClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false } })
    : null;
  // Mismo cliente que usa un visitante real de la app (solo la anon key, sin sesión).
  const anon = hasCredentials
    ? createSupabaseClient(supabaseUrl!, anonKey!, { auth: { persistSession: false } })
    : null;

  let instructorId: string;
  let publishedCourseId: string;
  let unpublishedCourseId: string;

  beforeAll(async () => {
    if (!admin) return;

    const { data: instructor, error: instructorError } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "instructor")
      .limit(1)
      .maybeSingle();
    if (instructorError || !instructor) {
      throw new Error("No hay ningún perfil con role='instructor' para usar en el test de integración");
    }
    instructorId = instructor.id;

    const suffix = Date.now();

    const { data: published, error: publishedError } = await admin
      .from("courses")
      .insert({
        instructor_id: instructorId,
        title: "Curso de prueba publicado",
        slug: `curso-prueba-publicado-${suffix}`,
        category: "Desarrollo Web",
        level: "beginner",
        price: 0,
        status: "published",
      })
      .select("id")
      .single();
    if (publishedError || !published) {
      throw new Error(`No se pudo crear el curso publicado de prueba: ${publishedError?.message}`);
    }
    publishedCourseId = published.id;

    const { data: unpublished, error: unpublishedError } = await admin
      .from("courses")
      .insert({
        instructor_id: instructorId,
        title: "Curso de prueba no publicado",
        slug: `curso-prueba-no-publicado-${suffix}`,
        category: "Desarrollo Web",
        level: "beginner",
        price: 0,
        status: "draft",
      })
      .select("id")
      .single();
    if (unpublishedError || !unpublished) {
      throw new Error(`No se pudo crear el curso no publicado de prueba: ${unpublishedError?.message}`);
    }
    unpublishedCourseId = unpublished.id;
  });

  afterAll(async () => {
    if (!admin) return;
    await admin.from("courses").delete().in("id", [publishedCourseId, unpublishedCourseId].filter(Boolean));
  });

  it("el catálogo consultado por un visitante anónimo incluye el curso publicado pero nunca el no publicado", async () => {
    const { data, error } = await anon!.from("courses").select("id, status");

    expect(error).toBeNull();
    const ids = (data ?? []).map((row) => row.id);

    expect(ids).toContain(publishedCourseId);
    expect(ids).not.toContain(unpublishedCourseId);
  });
});
