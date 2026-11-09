// Stable fetchers for rows (module-level so React effects don't refetch).
import {
  discover,
  getAiringToday,
  getNowPlaying,
  getPopular,
  getTopRated,
  getTrending,
  getUpcoming,
} from "./tmdb";

const today = () => new Date().toISOString().slice(0, 10);
const byGenre = (type, genre, extra = {}) => () =>
  discover(type, { with_genres: genre, "vote_count.gte": 150, ...extra }).then((r) => r.results);

export const fetchers = {
  trendingAll: () => getTrending("all"),
  trendingMoviesDay: () => getTrending("movie", 1, "day"),
  trendingMoviesWeek: () => getTrending("movie"),
  trendingTVDay: () => getTrending("tv", 1, "day"),
  trendingTVWeek: () => getTrending("tv"),
  nowPlaying: () => getNowPlaying(),
  upcoming: () =>
    getUpcoming().then((list) => list.filter((m) => !m.release_date || m.release_date >= today())),
  airingToday: () => getAiringToday(),
  popularMovies: () => getPopular("movie"),
  popularTV: () => getPopular("tv"),
  topRatedMovies: () => getTopRated("movie"),
  topRatedTV: () => getTopRated("tv"),
  action: byGenre("movie", 28),
  comedy: byGenre("movie", 35),
  horror: byGenre("movie", 27),
  scifi: byGenre("movie", 878),
  thriller: byGenre("movie", 53),
  romance: byGenre("movie", 10749),
  animationMovies: byGenre("movie", 16),
  documentaries: byGenre("movie", 99, { "vote_count.gte": 50 }),
  family: byGenre("movie", 10751),
  crimeTV: byGenre("tv", 80),
  dramaTV: byGenre("tv", 18),
  scifiTV: byGenre("tv", 10765),
  comedyTV: byGenre("tv", 35),
  anime: byGenre("tv", 16, { with_original_language: "ja", "vote_count.gte": 50 }),
  kdrama: byGenre("tv", 18, { with_original_language: "ko", "vote_count.gte": 30 }),
  realityTV: byGenre("tv", 10764, { "vote_count.gte": 10 }),
  newSeries: () =>
    discover("tv", {
      "first_air_date.gte": new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10),
      "first_air_date.lte": today(),
      "vote_count.gte": 20,
    }).then((r) => r.results),
  bingeWorthy: () =>
    discover("tv", { sort_by: "vote_average.desc", "vote_count.gte": 2000 }).then((r) => r.results),
};
