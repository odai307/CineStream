export const watchPath = (item, { season, episode } = {}) => {
  const type = item.media_type === "tv" ? "tv" : "movie";
  if (type !== "tv") return `/watch/movie/${item.id}`;
  return `/watch/tv/${item.id}?s=${season || 1}&e=${episode || 1}`;
};

// Resume where the viewer left off (episode-aware for series).
export const resumePath = (item, progress) =>
  watchPath(item, progress ? { season: progress.season, episode: progress.episode } : {});

export const genrePath = (genre, mediaType = "movie") =>
  `/genre/${encodeURIComponent(genre.name.toLowerCase())}?type=${mediaType === "tv" ? "tv" : "movie"}`;
