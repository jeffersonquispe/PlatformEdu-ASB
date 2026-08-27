import path from "path";
import dotenv from "dotenv";
import react from "@vitejs/plugin-react";
import { defaultExclude, defineConfig } from "vitest/config";

// Los tests de integración leen credenciales reales de .env.local.
dotenv.config({ path: ".env.local", quiet: true });

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // defaultExclude trae node_modules/dist/etc.; e2e/ es de Playwright,
    // que comparte la extension .spec.ts pero necesita su propio runner.
    exclude: [...defaultExclude, "**/.next/**", "e2e/**", ".qa_agent_tests/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
