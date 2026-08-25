import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

/**
 * Curso efimero compartido por los tres flujos. El sufijo aleatorio evita
 * colisiones entre corridas y hace que la busqueda del estudiante devuelva
 * exactamente este curso.
 */
const MARCA = `E2E${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
/**
 * El buscador del catalogo se renderiza dos veces (variante desktop y
 * variante mobile); solo una es visible segun el viewport.
 */
function buscador(page: Page) {
  return page.getByTestId('catalog-search').locator('visible=true');
}

const CURSO = {
  titulo: `Curso Gratis ${MARCA}`,
  descripcionCorta: `Curso de prueba automatizada ${MARCA}`,
  descripcion:
    'Curso creado por la suite E2E de Playwright para validar el flujo completo ' +
    'de creacion, publicacion e inscripcion gratuita. Puede eliminarse sin riesgo.',
  nivel: 'Principiante',
  precio: '0',
  seccion: 'Modulo unico',
  leccion: 'Leccion de bienvenida',
};

/** Se rellena en el flujo 2 y lo consume el flujo 3. */
let cursoSlug: string | null = null;

/** Selecciona una opcion en un Select de Base UI (no es un <select> nativo). */
async function elegirEnSelect(page: Page, triggerId: string, opcion: string) {
  await page.locator(`#${triggerId}`).click();
  await page.getByRole('option', { name: opcion, exact: true }).click();
}

// Los flujos comparten estado (el curso creado), asi que deben correr en orden.
test.describe.configure({ mode: 'serial' });

// ---------------------------------------------------------------------------
// Flujo 1 - Visitante sin sesion
// ---------------------------------------------------------------------------
test.describe('Flujo 1: visitante sin sesion', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('navega el catalogo y encuentra el widget de voz de Edy', async ({ page }) => {
    await page.goto(BASE);

    // Navegar al catalogo desde la landing, como lo haria un visitante.
    await page.getByRole('link', { name: 'Explorar cursos', exact: true }).first().click();
    await page.waitForURL(/\/cursos(\?|$)/);
    await expect(page.getByRole('heading', { name: 'Explorar cursos' })).toBeVisible();
    await expect(buscador(page)).toBeVisible();

    // El launcher de Edy vive en el layout (main) y debe estar sin sesion.
    const launcher = page.getByTestId('edy-launcher');
    await expect(launcher).toBeVisible();

    // Abrirlo monta el <iframe> a /agente-edy, que es donde vive el custom
    // element. No se simula ninguna conversacion de voz: solo se comprueba
    // que <edy-voice-widget> esta presente en el DOM.
    await launcher.click();
    const iframe = page.getByTestId('edy-iframe');
    await expect(iframe).toBeVisible();

    const widget = page.frameLocator('[data-testid="edy-iframe"]').locator('edy-voice-widget');
    await expect(widget).toBeAttached();
    await expect(widget).toHaveAttribute('token-endpoint', '/api/agent/token');
  });
});

// ---------------------------------------------------------------------------
// Flujo 2 - Instructor: crea un curso gratis y lo publica
// ---------------------------------------------------------------------------
test.describe('Flujo 2: instructor crea y publica un curso gratis', () => {
  test.use({ storageState: 'e2e/.auth/instructor.json' });

  test('crea el curso, arma el temario, publica y aparece en el catalogo', async ({ page }) => {
    await page.goto(`${BASE}/instructor`);
    await expect(page).toHaveURL(/\/instructor$/);

    // --- Crear el curso (nace en estado draft) ---
    await page.goto(`${BASE}/instructor/cursos/nuevo`);
    await page.getByLabel('Título del curso').fill(CURSO.titulo);
    await page.getByLabel('Descripción corta').fill(CURSO.descripcionCorta);
    await page.getByLabel('Descripción completa').fill(CURSO.descripcion);
    await page.locator('#category').click();
    await page.getByRole('option').first().click();
    await elegirEnSelect(page, 'level', CURSO.nivel);
    await page.getByLabel('Precio (USD, 0 = gratis)').fill(CURSO.precio);

    // createCourseAction redirige al curriculum del curso recien creado.
    await page.getByRole('button', { name: 'Crear curso y continuar' }).click();
    await page.waitForURL(/\/instructor\/cursos\/[^/]+\/curriculum$/);
    await expect(page.getByRole('heading', { name: CURSO.titulo })).toBeVisible();
    await expect(page.getByText('Borrador', { exact: true })).toBeVisible();

    // --- Temario: publishCourseAction exige >=1 seccion y >=1 leccion ---
    await page.getByPlaceholder('Título de la nueva sección').fill(CURSO.seccion);
    await page.getByRole('button', { name: 'Agregar sección' }).click();
    await expect(page.getByText('0 lecciones')).toBeVisible();

    await page.getByRole('button', { name: 'Lección' }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    await dialogo.getByLabel('Título').fill(CURSO.leccion);
    await elegirEnSelect(page, 'lesson-type', 'Texto');
    await dialogo.getByLabel('Contenido', { exact: true }).fill(
      'Contenido de prueba para la leccion E2E.',
    );
    await dialogo.getByRole('button', { name: 'Guardar lección' }).click();
    await expect(dialogo).toBeHidden();
    await expect(page.getByText(CURSO.leccion)).toBeVisible();

    // --- Publicar ---
    await page.getByRole('button', { name: 'Publicar', exact: true }).click();
    await expect(page.getByText('Publicado', { exact: true })).toBeVisible();

    // --- Verificar que ya es visible en el catalogo publico ---
    await page.goto(`${BASE}/cursos?search=${encodeURIComponent(MARCA)}`);
    const tarjeta = page.getByTestId('course-card').filter({ hasText: CURSO.titulo });
    await expect(tarjeta).toBeVisible();

    cursoSlug = await tarjeta.getAttribute('data-course-slug');
    expect(cursoSlug).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Flujo 3 - Estudiante: busca el curso, se inscribe gratis y lo ve en su panel
// ---------------------------------------------------------------------------
test.describe('Flujo 3: estudiante se inscribe al curso gratis', () => {
  test.use({ storageState: 'e2e/.auth/estudiante.json' });

  test('busca el curso, se inscribe y aparece en su panel', async ({ page }) => {
    expect(cursoSlug, 'el flujo 2 debe haber publicado el curso primero').toBeTruthy();

    // --- Buscar ESE curso escribiendo en el buscador del catalogo ---
    await page.goto(`${BASE}/cursos`);
    await buscador(page).fill(MARCA);

    // El buscador hace debounce de 350ms y empuja ?search= a la URL.
    await page.waitForURL(new RegExp(`search=${MARCA}`));

    const tarjeta = page.getByTestId('course-card').filter({ hasText: CURSO.titulo });
    await expect(tarjeta).toBeVisible();
    await tarjeta.click();
    await page.waitForURL(`**/cursos/${cursoSlug}`);

    // --- Inscripcion directa por ser gratis (sin pasar por Stripe) ---
    const boton = page.getByTestId('enroll-free');
    await expect(boton).toBeVisible();
    await expect(boton).toHaveText('Inscribirme gratis');
    await boton.click();

    // enrollFreeCourseAction redirige a la primera leccion del curso.
    await page.waitForURL(/\/aprender\/[^/]+\/[^/]+$/, { timeout: 20_000 });

    // Al volver al detalle, el CTA ya refleja la inscripcion.
    await page.goto(`${BASE}/cursos/${cursoSlug}`);
    await expect(page.getByText('Continuar aprendiendo')).toBeVisible();
    await expect(page.getByTestId('enroll-free')).toHaveCount(0);

    // --- Verificar que aparece en su panel de cursos inscritos ---
    await page.goto(`${BASE}/estudiante`);
    await expect(page.getByRole('heading', { name: 'Mi aprendizaje' })).toBeVisible();

    const inscrito = page
      .getByTestId('cursos-en-progreso')
      .getByTestId('enrolled-course')
      .filter({ hasText: CURSO.titulo });
    await expect(inscrito).toBeVisible();
    await expect(inscrito).toHaveAttribute('data-course-slug', cursoSlug!);
  });
});
