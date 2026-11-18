// Web entry point for the shared TMDB client in packages/core.
import * as core from "@cinestream/core";

core.configureTmdb({
  getApiKey: () => import.meta.env.TMDB_KEY || import.meta.env.VITE_TMDB_KEY,
  keyHint: "TMDB_KEY in the .env file at the repo root",
});

export * from "@cinestream/core";

export const getDownloadUrls =
  core.getDownloadUrls ||
  ((tmdbId, mediaType = "movie", season = 1, episode = 1) =>
    mediaType === "tv"
      ? [
          `https://dl.vidsrc.vip/tv/${tmdbId}/${season}/${episode}`,
          `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`,
        ]
      : [
          `https://dl.vidsrc.vip/movie/${tmdbId}`,
          `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1`,
        ]);

export const getDownloadUrl =
  core.getDownloadUrl ||
  ((tmdbId, mediaType = "movie", season = 1, episode = 1) =>
    getDownloadUrls(tmdbId, mediaType, season, episode)[0]);
