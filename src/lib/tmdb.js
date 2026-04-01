import axios from "axios";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/original";

const client = axios.create({
  baseURL: TMDB_BASE_URL,
});

const request = async (url, params = {}) => {
  const apiKey = import.meta.env.TMDB_KEY;

  if (!apiKey || apiKey === "your_tmdb_api_key_here") {
    throw new Error(
      "TMDB API key is missing. Set TMDB_KEY in .env and restart the Vite dev server."
    );
  }

  try {
    const { data } = await client.get(url, {
      params: {
        api_key: apiKey,
        ...params,
      },
    });
    return data;
  } catch (error) {
    if (error?.response?.status === 401) {
      throw new Error(
        "TMDB rejected the API key (401 Unauthorized). Verify TMDB_KEY in .env and restart the dev server."
      );
    }
    throw error;
  }
};

export const getTrending = async (page = 1) => {
  const data = await request("/trending/movie/week", { page });
  return data.results;
};

export const getTopRated = async (page = 1) => {
  const data = await request("/movie/top_rated", { page });
  return data.results;
};

export const getPopular = async (page = 1) => {
  const data = await request("/movie/popular", { page });
  return data.results;
};

export const getNowPlaying = async (page = 1) => {
  const data = await request("/movie/now_playing", { page });
  return data.results;
};

export const getMovieDetails = async (id) => {
  return request(`/movie/${id}`);
};

export const getMovieCredits = async (id) => {
  return request(`/movie/${id}/credits`);
};

export const getSimilarMovies = async (id, page = 1) => {
  const data = await request(`/movie/${id}/similar`, { page });
  return data.results;
};

export const searchMovies = async (query, page = 1) => {
  const data = await request("/search/movie", { query, page });
  return data.results;
};

export const getByGenre = async (genreId, page = 1) => {
  const data = await request("/discover/movie", { with_genres: genreId, page });
  return data.results;
};

export const getGenres = async () => {
  const data = await request("/genre/movie/list");
  return data.genres;
};

export const getMovieVideos = async (id) => {
  const data = await request(`/movie/${id}/videos`);
  return data.results;
};

export const getPosterUrl = (path) => {
  if (!path) return "";
  return `${IMAGE_BASE_URL}${path}`;
};

export const getBackdropUrl = (path) => {
  if (!path) return "";
  return `${BACKDROP_BASE_URL}${path}`;
};
