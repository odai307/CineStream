// Web entry point for the shared TMDB client in packages/core.
import * as core from "@cinestream/core";

core.configureTmdb({
  getApiKey: () => import.meta.env.TMDB_KEY || import.meta.env.VITE_TMDB_KEY,
  keyHint: "TMDB_KEY in the .env file at the repo root",
});

export * from "@cinestream/core";

export const getDownloadSources =
  core.getDownloadSources ||
  ((tmdbId, mediaType = "movie", season = 1, episode = 1) =>
    mediaType === "tv"
      ? [
          {
            name: "Server 1 · MultiEmbed Direct",
            quality: "1080p / 720p",
            url: `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`,
          },
          {
            name: "Server 2 · VidLink Pro",
            quality: "1080p HD",
            url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`,
          },
          {
            name: "Server 3 · VidSrc CC",
            quality: "1080p HD",
            url: `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`,
          },
          {
            name: "Server 4 · VidSrc ME",
            quality: "HD",
            url: `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
          },
        ]
      : [
          {
            name: "Server 1 · MultiEmbed Direct",
            quality: "1080p / 720p",
            url: `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1`,
          },
          {
            name: "Server 2 · VidLink Pro",
            quality: "1080p HD",
            url: `https://vidlink.pro/movie/${tmdbId}`,
          },
          {
            name: "Server 3 · VidSrc CC",
            quality: "1080p HD",
            url: `https://vidsrc.cc/v2/embed/movie/${tmdbId}`,
          },
          {
            name: "Server 4 · VidSrc ME",
            quality: "HD",
            url: `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`,
          },
        ]);

export const getDownloadUrls =
  core.getDownloadUrls ||
  ((tmdbId, mediaType = "movie", season = 1, episode = 1) =>
    getDownloadSources(tmdbId, mediaType, season, episode).map((s) => s.url));

export const getDownloadUrl =
  core.getDownloadUrl ||
  ((tmdbId, mediaType = "movie", season = 1, episode = 1) =>
    getDownloadUrls(tmdbId, mediaType, season, episode)[0]);
