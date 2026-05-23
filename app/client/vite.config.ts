/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@/kit": fileURLToPath(new URL("./src/shared/kit", import.meta.url)),
      "@/widgets": fileURLToPath(
        new URL("./src/shared/widgets", import.meta.url),
      ),
      "@/lib": fileURLToPath(new URL("./src/shared/lib", import.meta.url)),
      "@/hooks": fileURLToPath(new URL("./src/shared/hooks", import.meta.url)),
      "@/model": fileURLToPath(new URL("./src/shared/model", import.meta.url)),
      "@/api/services": fileURLToPath(
        new URL("./src/shared/api/services", import.meta.url),
      ),
      "@/api": fileURLToPath(new URL("./src/shared/api", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
