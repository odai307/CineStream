import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import streamHandler from "./api/stream.js";

const apiStreamPlugin = () => ({
  name: "cinestream-api-stream",
  configureServer(server) {
    server.middlewares.use("/api/stream", (req, res) => {
      streamHandler(req, res);
    });
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), apiStreamPlugin()],
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
