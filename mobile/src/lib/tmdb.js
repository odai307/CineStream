import axios from "axios";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

const client = axios.create({
  baseURL: TMDB_BASE_URL,
});

const request = async (url, params = {}) => {
  const apiKey = process.env.EXPO_PUBLIC_TMDB_KEY;

  if (!apiKey || apiKey === "your_tmdb_api_key_here") {
    throw new Error("TMDB key missing. Set EXPO_PUBLIC_TMDB_KEY in mobile/.env");
  }

  const { data } = await client.get(url, {
    params: {
      api_key: apiKey,
      ...params,
    },
  });

  return data;
};

export const getTrendingMovies = async () => {
  const data = await request("/trending/movie/week");
  return data.results;
};

export const getPopularMovies = async () => {
  const data = await request("/movie/popular");
  return data.results;
};

export const searchMulti = async (query) => {
  const data = await request("/search/multi", { query });
  return data.results.filter(
    (item) => item.media_type === "movie" || item.media_type === "tv"
  );
};

export const getDetailsByType = async (id, mediaType = "movie") => {
  const type = mediaType === "tv" ? "tv" : "movie";
  return request(`/${type}/${id}`);
};

export const getTVSeasons = async (id) => {
  const data = await request(`/tv/${id}`);
  return (data.seasons || []).filter((season) => season.season_number > 0);
};

export const getTVEpisodes = async (id, seasonNumber) => {
  const data = await request(`/tv/${id}/season/${seasonNumber}`);
  return data.episodes || [];
};

export const getPosterUrl = (path) =>
  path ? `${IMAGE_BASE_URL}${path}` : null;
