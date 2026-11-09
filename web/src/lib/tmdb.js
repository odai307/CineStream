// Web entry point for the shared TMDB client in packages/core.
import { configureTmdb } from "@cinestream/core";

configureTmdb({
  getApiKey: () => import.meta.env.TMDB_KEY || import.meta.env.VITE_TMDB_KEY,
  keyHint: "TMDB_KEY in the .env file at the repo root",
});

export * from "@cinestream/core";
