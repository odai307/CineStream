import { useEffect, useState } from "react";
import HeroBanner from "../components/HeroBanner";
import MovieRow from "../components/MovieRow";
import AdBanner from "../components/AdBanner";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  getGenres,
  getNowPlaying,
  getPopular,
  getTopRated,
  getTrending,
} from "../lib/tmdb";

function Home() {
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [popular, setPopular] = useState([]);
  const [nowPlaying, setNowPlaying] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadHome = async () => {
      try {
        setLoading(true);
        setError(null);

        const [trendingMovies, topRatedMovies, popularMovies, nowPlayingMovies, genres] =
          await Promise.all([
            getTrending(),
            getTopRated(),
            getPopular(),
            getNowPlaying(),
            getGenres(),
          ]);

        const genreMap = Object.fromEntries(genres.map((g) => [g.id, g.name]));
        const withGenreNames = trendingMovies.map((movie) => ({
          ...movie,
          genre_names: (movie.genre_ids || []).map((id) => genreMap[id]).filter(Boolean),
        }));

        setTrending(withGenreNames);
        setTopRated(topRatedMovies);
        setPopular(popularMovies);
        setNowPlaying(nowPlayingMovies);
      } catch (err) {
        setError(err.message || "Failed to load home feed.");
      } finally {
        setLoading(false);
      }
    };

    loadHome();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="px-4 py-16 text-center text-red-400">{error}</p>;

  return (
    <div className="pb-16">
      <HeroBanner movie={trending[0]} />

      <div className="mx-auto max-w-7xl space-y-12 px-4 pt-8 sm:px-6 lg:px-8">
        <AdBanner size="leaderboard" />
        <MovieRow title="Trending Now" movies={trending} />
        <MovieRow title="Top Rated" movies={topRated} />
        <MovieRow title="New Releases" movies={nowPlaying} />
        <MovieRow title="Popular" movies={popular} />
      </div>
    </div>
  );
}

export default Home;
