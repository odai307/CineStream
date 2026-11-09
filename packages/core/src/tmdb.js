// Platform-agnostic TMDB client. Uses global fetch (available in browsers and React Native),
// so this package has zero dependencies. Each app calls configureTmdb() once with its own
// way of reading the API key (Vite: import.meta.env, Expo: process.env).

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

let config = {
  getApiKey: () => undefined,
  keyHint: "your TMDB API key",
  language: "en-US",
  timeoutMs: 15000,
};

export const configureTmdb = (options = {}) => {
  config = { ...config, ...options };
};

const cache = new Map();
const MAX_CACHE_ENTRIES = 300;

const buildUrl = (path, params, apiKey, useBearer) => {
  const search = new URLSearchParams();
  if (!useBearer) search.set("api_key", apiKey);
  if (config.language) search.set("language", config.language);
  Object.entries(params).forEach(([key, value]) => {
    if (value === "") search.delete(key); // explicit "" removes a default (e.g. language)
    else if (value !== undefined && value !== null) search.set(key, String(value));
  });
  return `${TMDB_BASE_URL}${path}?${search.toString()}`;
};

export const request = async (path, params = {}, { cacheable = true } = {}) => {
  const apiKey = config.getApiKey();

  if (!apiKey || apiKey === "your_tmdb_api_key_here") {
    throw new Error(`TMDB API key is missing. Set ${config.keyHint} and restart the dev server.`);
  }

  // v4 "Read Access Tokens" are JWTs and must be sent as a bearer header.
  const useBearer = apiKey.startsWith("eyJ");
  const url = buildUrl(path, params, apiKey, useBearer);

  if (cacheable && cache.has(url)) return cache.get(url);

  const run = async () => {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), config.timeoutMs) : null;

    try {
      const response = await fetch(url, {
        headers: useBearer ? { Authorization: `Bearer ${apiKey}` } : undefined,
        signal: controller?.signal,
      });

      if (response.status === 401) {
        throw new Error(`TMDB rejected the API key (401). Check ${config.keyHint}.`);
      }
      if (!response.ok) {
        throw new Error(`TMDB request failed (${response.status}).`);
      }
      return await response.json();
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("TMDB request timed out.");
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const promise = run();
  if (cacheable) {
    if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
    cache.set(url, promise);
    // Never keep failures cached, so retries can succeed.
    promise.catch(() => cache.delete(url));
  }
  return promise;
};

export const normalizeType = (mediaType) => (mediaType === "tv" ? "tv" : "movie");

const tagType = (items = [], mediaType) =>
  items.map((item) => ({ ...item, media_type: item.media_type || mediaType }));

// ---------- Lists ----------

export const getTrending = async (mediaType = "movie", page = 1, window = "week") => {
  const type = mediaType === "all" ? "all" : normalizeType(mediaType);
  const data = await request(`/trending/${type}/${window}`, { page });
  return type === "all" ? data.results : tagType(data.results, type);
};

export const getTopRated = async (mediaType = "movie", page = 1) => {
  const type = normalizeType(mediaType);
  const data = await request(`/${type}/top_rated`, { page });
  return tagType(data.results, type);
};

export const getPopular = async (mediaType = "movie", page = 1) => {
  const type = normalizeType(mediaType);
  const data = await request(`/${type}/popular`, { page });
  return tagType(data.results, type);
};

export const getNowPlaying = async (page = 1) => {
  const data = await request("/movie/now_playing", { page });
  return tagType(data.results, "movie");
};

export const getUpcoming = async (page = 1) => {
  const data = await request("/movie/upcoming", { page });
  return tagType(data.results, "movie");
};

export const getAiringToday = async (page = 1) => {
  const data = await request("/tv/airing_today", { page });
  return tagType(data.results, "tv");
};

export const discover = async (mediaType = "movie", params = {}) => {
  const type = normalizeType(mediaType);
  const data = await request(`/discover/${type}`, { sort_by: "popularity.desc", ...params });
  return {
    results: tagType(data.results, type),
    page: data.page,
    totalPages: data.total_pages,
  };
};

export const getByGenre = async (genreId, page = 1, mediaType = "movie", sortBy) => {
  const { results } = await discover(mediaType, { with_genres: genreId, page, sort_by: sortBy });
  return results;
};

export const getGenres = async (mediaType = "movie") => {
  const data = await request(`/genre/${normalizeType(mediaType)}/list`);
  return data.genres || [];
};

// Combined movie + TV genre map, useful for labelling mixed lists.
export const getGenreMap = async () => {
  const [movie, tv] = await Promise.all([getGenres("movie"), getGenres("tv")]);
  return Object.fromEntries([...movie, ...tv].map((g) => [g.id, g.name]));
};

export const searchMulti = async (query, page = 1) => {
  const data = await request("/search/multi", { query, page, include_adult: false });
  return (data.results || []).filter(
    (item) => item.media_type === "movie" || item.media_type === "tv"
  );
};

// ---------- Details ----------

export const getDetailsByType = async (id, mediaType = "movie", append = []) => {
  const type = normalizeType(mediaType);
  const data = await request(`/${type}/${id}`, {
    append_to_response: append.length ? append.join(",") : undefined,
    include_image_language: append.includes("images") ? "en,null" : undefined,
  });
  return { ...data, media_type: type };
};

// One request with everything a detail view needs.
export const getFullDetails = (id, mediaType = "movie") => {
  const type = normalizeType(mediaType);
  const append = ["videos", "images", "credits", "similar", "recommendations"];
  append.push(type === "tv" ? "content_ratings" : "release_dates");
  return getDetailsByType(id, type, append);
};

export const getCredits = async (id, mediaType = "movie") =>
  request(`/${normalizeType(mediaType)}/${id}/credits`);

export const getSimilarByType = async (id, mediaType = "movie", page = 1) => {
  const type = normalizeType(mediaType);
  const data = await request(`/${type}/${id}/similar`, { page });
  return tagType(data.results, type);
};

export const getVideos = async (id, mediaType = "movie") => {
  const data = await request(`/${normalizeType(mediaType)}/${id}/videos`, { language: "" });
  return data.results || [];
};

export const getImages = async (id, mediaType = "movie") =>
  request(`/${normalizeType(mediaType)}/${id}/images`, {
    include_image_language: "en,null",
    language: "",
  });

export const getTVSeasons = async (id) => {
  const data = await request(`/tv/${id}`);
  return (data.seasons || []).filter((season) => season.season_number > 0);
};

export const getTVEpisodes = async (id, seasonNumber) => {
  const data = await request(`/tv/${id}/season/${seasonNumber}`);
  return data.episodes || [];
};

// ---------- Derived helpers ----------

const TRAILER_PRIORITY = ["Trailer", "Teaser", "Clip", "Featurette"];

export const pickTrailer = (videos = []) => {
  const youtube = videos.filter((v) => v.site === "YouTube" && v.key);
  for (const type of TRAILER_PRIORITY) {
    const official = youtube.find((v) => v.type === type && v.official);
    if (official) return official;
    const any = youtube.find((v) => v.type === type);
    if (any) return any;
  }
  return youtube[0] || null;
};

export const getTrailerKey = async (id, mediaType = "movie") => {
  const videos = await getVideos(id, mediaType);
  return pickTrailer(videos)?.key || null;
};

export const pickLogo = (images) => {
  const logos = images?.logos || [];
  return logos.find((l) => l.iso_639_1 === "en") || logos.find((l) => !l.iso_639_1) || null;
};

export const getLogoPath = async (id, mediaType = "movie") => {
  const images = await getImages(id, mediaType);
  return pickLogo(images)?.file_path || null;
};

export const getCertification = (details) => {
  if (!details) return null;
  if (details.content_ratings?.results) {
    const us = details.content_ratings.results.find((r) => r.iso_3166_1 === "US");
    return us?.rating || null;
  }
  const us = details.release_dates?.results?.find((r) => r.iso_3166_1 === "US");
  return us?.release_dates?.find((d) => d.certification)?.certification || null;
};

// ---------- Images ----------

const imageUrl = (size) => (path) => (path ? `${IMAGE_BASE_URL}/${size}${path}` : "");

export const getPosterUrl = imageUrl("w500");
export const getSmallPosterUrl = imageUrl("w342");
export const getBackdropUrl = imageUrl("original");
export const getLargeBackdropUrl = imageUrl("w1280");
export const getCardBackdropUrl = imageUrl("w780");
export const getStillUrl = imageUrl("w300");
export const getProfileUrl = imageUrl("w185");
export const getLogoUrl = imageUrl("w500");

// ---------- Backwards-compatible names (used by the mobile app) ----------

export const getTrendingMovies = (page = 1) => getTrending("movie", page);
export const getPopularMovies = (page = 1) => getPopular("movie", page);
export const getMovieDetails = (id) => getDetailsByType(id, "movie");
export const getMovieCredits = (id) => getCredits(id, "movie");
export const getMovieVideos = (id) => getVideos(id, "movie");
export const getSimilarMovies = (id, page = 1) => getSimilarByType(id, "movie", page);
