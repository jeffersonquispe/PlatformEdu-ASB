import { test } from '@playwright/test';

const BASE = 'http://localhost:3000';
const dir = 'test-results/rutas';

const rutas: [string, string][] = [
  ['/cursos', 'catalogo-publico'],
  ['/instructor/cursos/nuevo', 'instructor-crear-curso'],
  ['/estudiante', 'panel-estudiante'],
];

for (const [ruta, nombre] of rutas) {
  test(`evidencia ${ruta}`, async ({ page }) => {
    await page.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle' });
    console.log(`${ruta} -> ${page.url()} | title="${await page.title()}"`);
    await page.screenshot({ path: `${dir}/${nombre}.png`, fullPage: true });
  });
}
