import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

test.describe('Instructor', () => {
  test.use({ storageState: 'e2e/.auth/instructor.json' });

  test('accede al dashboard del instructor sin pasar por /login', async ({ page }) => {
    await page.goto(`${BASE}/instructor`);
    expect(new URL(page.url()).pathname).toBe('/instructor');
  });

  test('accede al formulario de crear curso', async ({ page }) => {
    await page.goto(`${BASE}/instructor/cursos/nuevo`);
    expect(new URL(page.url()).pathname).toBe('/instructor/cursos/nuevo');
  });
});

test.describe('Estudiante', () => {
  test.use({ storageState: 'e2e/.auth/estudiante.json' });

  test('accede a su panel de inscripciones sin pasar por /login', async ({ page }) => {
    await page.goto(`${BASE}/estudiante`);
    expect(new URL(page.url()).pathname).toBe('/estudiante');
  });

  test('el catalogo publico sigue accesible', async ({ page }) => {
    await page.goto(`${BASE}/cursos`);
    expect(new URL(page.url()).pathname).toBe('/cursos');
  });
});
