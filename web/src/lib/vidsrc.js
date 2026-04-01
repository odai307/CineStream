export const getEmbedUrl = (tmdbId, mediaType = "movie", season = 1, episode = 1) => {
  if (mediaType === "tv") {
    return `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
  }
  return `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`;
};

export const getFallbackUrls = (tmdbId, mediaType = "movie", season = 1, episode = 1) => {
  if (mediaType === "tv") {
    return [
      `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
    ];
  }
  return [
    `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`,
    `https://vidsrc.to/embed/movie/${tmdbId}`,
    `https://www.2embed.cc/embed/${tmdbId}`,
    `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1`,
  ];
};
