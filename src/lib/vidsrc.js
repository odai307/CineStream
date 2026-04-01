export const getEmbedUrl = (tmdbId) =>
  `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`;

export const getFallbackUrls = (tmdbId) => [
  `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`,
  `https://vidsrc.to/embed/movie/${tmdbId}`,
  `https://www.2embed.cc/embed/${tmdbId}`,
  `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1`,
];
