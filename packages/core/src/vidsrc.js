// Embed sources for the player. The first entry is the default; the rest are fallbacks.

export const getFallbackUrls = (tmdbId, mediaType = "movie", season = 1, episode = 1) => {
  if (mediaType === "tv") {
    return [
      `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
      `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`,
      `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`,
      `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`,
    ];
  }
  return [
    `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`,
    `https://vidsrc.to/embed/movie/${tmdbId}`,
    `https://www.2embed.cc/embed/${tmdbId}`,
    `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1`,
  ];
};

export const getEmbedUrl = (tmdbId, mediaType = "movie", season = 1, episode = 1) =>
  getFallbackUrls(tmdbId, mediaType, season, episode)[0];
