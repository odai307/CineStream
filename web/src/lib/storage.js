// localStorage that never throws (private mode, blocked storage, quota).

export const readJSON = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const writeJSON = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

// Keep only the fields the UI needs, so stored lists stay small.
export const slimTitle = (item) => ({
  id: item.id,
  media_type: item.media_type === "tv" ? "tv" : "movie",
  title: item.title,
  name: item.name,
  poster_path: item.poster_path,
  backdrop_path: item.backdrop_path,
  overview: item.overview,
  vote_average: item.vote_average,
  release_date: item.release_date,
  first_air_date: item.first_air_date,
  genre_ids: item.genre_ids || (item.genres || []).map((g) => g.id),
});

export const titleKey = (item) => `${item.media_type === "tv" ? "tv" : "movie"}-${item.id}`;
