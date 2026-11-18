import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // .env lives at the repo root so web and tooling share one file.
  envDir: "..",
  envPrefix: ["VITE_", "TMDB_"],
  optimizeDeps: {
    exclude: ["@cinestream/core"],
  },
  server: {
    // Allow serving the shared package from ../packages/core.
    fs: { allow: [".."] },
  },
});
