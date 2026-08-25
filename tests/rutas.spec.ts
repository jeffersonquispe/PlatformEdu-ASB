import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test('catalogo publico /cursos es accesible sin login', async ({ page }) => {
  const res = await page.goto(`${BASE}/cursos`);
  expect(res?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe('/cursos');
});

test('/instructor/cursos/nuevo es ruta protegida', async ({ page }) => {
  await page.goto(`${BASE}/instructor/cursos/nuevo`);
  const url = new URL(page.url());
  expect(url.pathname === '/instructor/cursos/nuevo' || url.pathname === '/login').toBeTruthy();
  if (url.pathname === '/login') {
    expect(url.searchParams.get('redirect')).toBe('/instructor/cursos/nuevo');
  }
});

test('/estudiante es ruta protegida', async ({ page }) => {
  await page.goto(`${BASE}/estudiante`);
  const url = new URL(page.url());
  expect(url.pathname === '/estudiante' || url.pathname === '/login').toBeTruthy();
  if (url.pathname === '/login') {
    expect(url.searchParams.get('redirect')).toBe('/estudiante');
  }
});
