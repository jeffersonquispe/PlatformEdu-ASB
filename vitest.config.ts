import path from "path";
import dotenv from "dotenv";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Los tests de integración leen credenciales reales de .env.local.
dotenv.config({ path: ".env.local", quiet: true });

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["**/node_modules/**", "**/.next/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
