// Mobile entry point for the shared TMDB client in packages/core.
import { configureTmdb } from "@cinestream/core";

configureTmdb({
  getApiKey: () => process.env.EXPO_PUBLIC_TMDB_KEY,
  keyHint: "EXPO_PUBLIC_TMDB_KEY in mobile/.env",
});

export * from "@cinestream/core";
