import { chromium, type FullConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const AUTH_DIR = path.join(__dirname, '.auth');

interface Cuenta {
  nombre: string;
  email: string;
  password: string;
  /** Ruta a la que signInAction redirige segun el rol del perfil. */
  destino: string;
}

const cuentas: Cuenta[] = [
  {
    nombre: 'instructor',
    email: process.env.E2E_INSTRUCTOR_EMAIL ?? 'jeffersonquispep@gmail.com',
    password: process.env.E2E_INSTRUCTOR_PASSWORD ?? '12345678',
    destino: '/instructor',
  },
  {
    nombre: 'estudiante',
    email: process.env.E2E_ESTUDIANTE_EMAIL ?? 'magis.ai.good@gmail.com',
    password: process.env.E2E_ESTUDIANTE_PASSWORD ?? '12345678',
    destino: '/estudiante',
  },
];

async function iniciarSesion(cuenta: Cuenta) {
  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}/login`);
    await page.getByLabel('Email').fill(cuenta.email);
    await page.getByLabel('Contraseña').fill(cuenta.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    // signInAction redirige fuera de /login solo si las credenciales son validas.
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });

    const destinoReal = new URL(page.url()).pathname;
    if (destinoReal === '/onboarding') {
      throw new Error(
        `La cuenta ${cuenta.email} no ha completado el onboarding; ` +
          `terminalo manualmente una vez para que tenga rol asignado.`,
      );
    }
    if (destinoReal !== cuenta.destino) {
      throw new Error(
        `Se esperaba que ${cuenta.email} aterrizara en ${cuenta.destino} pero cayo en ${destinoReal}. ` +
          `Revisa el rol del perfil en Supabase.`,
      );
    }

    const archivo = path.join(AUTH_DIR, `${cuenta.nombre}.json`);
    await context.storageState({ path: archivo });
    console.log(`[global-setup] sesion de ${cuenta.nombre} guardada -> ${destinoReal}`);
  } catch (error) {
    const mensaje = await page
      .locator('p.text-destructive')
      .first()
      .textContent()
      .catch(() => null);
    throw new Error(
      `No se pudo iniciar sesion como ${cuenta.nombre} (${cuenta.email})` +
        (mensaje ? `: "${mensaje.trim()}"` : '') +
        `\n${(error as Error).message}`,
    );
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(_config: FullConfig) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  for (const cuenta of cuentas) {
    await iniciarSesion(cuenta);
  }
}
