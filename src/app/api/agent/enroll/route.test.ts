import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST } from "./route";

/**
 * Test de integración contra Supabase real (local vía `supabase start` o el
 * proyecto de NEXT_PUBLIC_SUPABASE_URL). Llama al Route Handler directamente
 * con una Request, así que además necesita AGENT_API_KEY.
 * Se saltea si faltan credenciales.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const agentApiKey = process.env.AGENT_API_KEY;

const hasCredentials = Boolean(supabaseUrl && serviceRoleKey && agentApiKey);

function enrollRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/agent/enroll", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${agentApiKey}`,
    },
    body: JSON.stringify(body),
  });
}

describe.skipIf(!hasCredentials)("POST /api/agent/enroll", () => {
  const admin = hasCredentials
    ? createSupabaseClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false } })
    : null;

  let instructorId: string;
  let studentId: string;
  let freeCourseId: string;
  let paidCourseId: string;

  /**
   * Crea un usuario de prueba en auth.users (el trigger `handle_new_user` le
   * crea el profile) y le fija el rol. Se borra en afterAll; el profile cae
   * solo por el `on delete cascade` de profiles.id.
   */
  async function seedUser(role: "instructor" | "student", suffix: number): Promise<string> {
    const { data, error } = await admin!.auth.admin.createUser({
      email: `test-${role}-${suffix}@example.test`,
      password: `test-pw-${suffix}`,
      email_confirm: true,
      user_metadata: { full_name: `Test ${role}` },
    });
    if (error || !data.user) throw new Error(`No se pudo crear el ${role} de prueba: ${error?.message}`);

    const { error: roleError } = await admin!
      .from("profiles")
      .update({ role, onboarded: true })
      .eq("id", data.user.id);
    if (roleError) throw new Error(`No se pudo fijar role='${role}': ${roleError.message}`);

    return data.user.id;
  }

  beforeAll(async () => {
    if (!admin) return;

    const suffix = Date.now();

    // Seed propio: usuarios creados por el test, no perfiles reales de la base.
    instructorId = await seedUser("instructor", suffix);
    studentId = await seedUser("student", suffix);

    const { data: free, error: freeError } = await admin
      .from("courses")
      .insert({
        instructor_id: instructorId,
        title: "Curso gratis de prueba (enroll)",
        slug: `curso-gratis-enroll-${suffix}`,
        category: "Desarrollo Web",
        level: "beginner",
        price: 0,
        status: "published",
      })
      .select("id")
      .single();
    if (freeError || !free) throw new Error(`No se pudo crear el curso gratis: ${freeError?.message}`);
    freeCourseId = free.id;

    const { data: paid, error: paidError } = await admin
      .from("courses")
      .insert({
        instructor_id: instructorId,
        title: "Curso de pago de prueba (enroll)",
        slug: `curso-pago-enroll-${suffix}`,
        category: "Desarrollo Web",
        level: "beginner",
        price: 49.9,
        status: "published",
      })
      .select("id")
      .single();
    if (paidError || !paid) throw new Error(`No se pudo crear el curso de pago: ${paidError?.message}`);
    paidCourseId = paid.id;
  });

  // Limpieza: enrollments -> courses -> usuarios (el orden respeta las FKs;
  // borrar el auth.user arrastra su profile por el cascade).
  afterAll(async () => {
    if (!admin) return;
    const courseIds = [freeCourseId, paidCourseId].filter(Boolean);
    if (courseIds.length) {
      await admin.from("enrollments").delete().in("course_id", courseIds);
      await admin.from("courses").delete().in("id", courseIds);
    }
    for (const id of [studentId, instructorId].filter(Boolean)) {
      await admin.auth.admin.deleteUser(id);
    }
  });

  it("dado un curso gratis y confirmed=true, entonces se crea la fila en enrollments", async () => {
    const response = await POST(enrollRequest({ courseId: freeCourseId, studentId, confirmed: true }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.enrolled).toBe(true);

    const { data: rows } = await admin!
      .from("enrollments")
      .select("id")
      .eq("student_id", studentId)
      .eq("course_id", freeCourseId);

    expect(rows).toHaveLength(1);
  });

  it("dado un curso ya inscrito, cuando reintento, entonces no se duplica la fila", async () => {
    await POST(enrollRequest({ courseId: freeCourseId, studentId, confirmed: true }));
    const response = await POST(enrollRequest({ courseId: freeCourseId, studentId, confirmed: true }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.enrolled).toBe(true);

    const { data: rows } = await admin!
      .from("enrollments")
      .select("id")
      .eq("student_id", studentId)
      .eq("course_id", freeCourseId);

    expect(rows).toHaveLength(1);
  });

  it("dado un curso de pago y confirmed=true, entonces no se crea fila y devuelve checkoutUrl simulado", async () => {
    const response = await POST(enrollRequest({ courseId: paidCourseId, studentId, confirmed: true }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.enrolled).toBe(false);
    expect(json.checkoutUrl).toBe(`/checkout/${paidCourseId}`);

    const { data: rows } = await admin!
      .from("enrollments")
      .select("id")
      .eq("student_id", studentId)
      .eq("course_id", paidCourseId);

    expect(rows ?? []).toHaveLength(0);
  });
});
