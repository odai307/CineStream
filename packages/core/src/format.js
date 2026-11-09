// Small display helpers shared by both apps.

export const getTitle = (item) => item?.title || item?.name || item?.original_title || "Untitled";

export const getReleaseDate = (item) => item?.release_date || item?.first_air_date || "";

export const getYear = (item) => {
  const date = getReleaseDate(item);
  return date ? new Date(date).getFullYear() : null;
};

export const formatRuntime = (minutes) => {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};

export const formatRating = (vote) => (vote ? vote.toFixed(1) : "N/A");

export const truncate = (text = "", max = 150) =>
  text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

export const isNewRelease = (item, days = 45) => {
  const date = getReleaseDate(item);
  if (!date) return false;
  const diff = Date.now() - new Date(date).getTime();
  return diff >= 0 && diff < days * 24 * 60 * 60 * 1000;
};
