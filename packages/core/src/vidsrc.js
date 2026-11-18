// Embed sources for the player. The first entry is the default; the rest are fallbacks.

export const getFallbackUrls = (tmdbId, mediaType = "movie", season = 1, episode = 1) => {
  if (mediaType === "tv") {
    return [
      `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
      `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`,
      `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`,
      `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`,
    ];
  }
  return [
    `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`,
    `https://vidsrc.to/embed/movie/${tmdbId}`,
    `https://www.2embed.cc/embed/${tmdbId}`,
    `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`,
  ];
};

export const getEmbedUrl = (tmdbId, mediaType = "movie", season = 1, episode = 1) =>
  getFallbackUrls(tmdbId, mediaType, season, episode)[0];

// Verified active download / direct-stream sources by TMDB ID.
export const getDownloadSources = (tmdbId, mediaType = "movie", season = 1, episode = 1) => {
  if (mediaType === "tv") {
    return [
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
    ];
  }
  return [
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
  ];
};

export const getDownloadUrls = (tmdbId, mediaType = "movie", season = 1, episode = 1) =>
  getDownloadSources(tmdbId, mediaType, season, episode).map((s) => s.url);

export const getDownloadUrl = (tmdbId, mediaType = "movie", season = 1, episode = 1) =>
  getDownloadUrls(tmdbId, mediaType, season, episode)[0];
