export const getEmbedUrl = (
  tmdbId,
  mediaType = "movie",
  season = 1,
  episode = 1
) => {
  if (mediaType === "tv") {
    return `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
  }

  return `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`;
};
