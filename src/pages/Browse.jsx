import { useEffect, useMemo, useState } from "react";
import GenreFilter from "../components/GenreFilter";
import MovieCard from "../components/MovieCard";
import AdBanner from "../components/AdBanner";
import LoadingSpinner from "../components/LoadingSpinner";
import { getByGenre, getGenres } from "../lib/tmdb";

const sorters = {
  popularity: (a, b) => b.popularity - a.popularity,
  rating: (a, b) => b.vote_average - a.vote_average,
  release: (a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0),
};

function Browse() {
  const [genres, setGenres] = useState([]);
  const [activeGenre, setActiveGenre] = useState(null);
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("popularity");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const sortedMovies = useMemo(() => {
    const cloned = [...movies];
    return cloned.sort(sorters[sortBy]);
  }, [movies, sortBy]);

  useEffect(() => {
    const loadGenres = async () => {
      try {
        setLoading(true);
        setError(null);
        const genreList = await getGenres();
        setGenres(genreList);
        const first = genreList[0]?.id;
        setActiveGenre(first || null);
      } catch (err) {
        setError(err.message || "Failed to load genres.");
      } finally {
        setLoading(false);
      }
    };

    loadGenres();
  }, []);

  useEffect(() => {
    if (!activeGenre) return;

    const loadMovies = async () => {
      try {
        setLoading(true);
        setError(null);
        const list = await getByGenre(activeGenre, 1);
        setMovies(list);
        setPage(1);
      } catch (err) {
        setError(err.message || "Failed to load genre movies.");
      } finally {
        setLoading(false);
      }
    };

    loadMovies();
  }, [activeGenre]);

  const loadMore = async () => {
    if (!activeGenre) return;
    try {
      setLoadingMore(true);
      setError(null);
      const nextPage = page + 1;
      const list = await getByGenre(activeGenre, nextPage);
      setMovies((prev) => [...prev, ...list]);
      setPage(nextPage);
    } catch (err) {
      setError(err.message || "Failed to load more movies.");
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading && movies.length === 0) return <LoadingSpinner />;
  if (error && movies.length === 0)
    return <p className="px-4 py-16 text-center text-red-400">{error}</p>;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <h1 className="brand-font mb-4 text-4xl font-black">Browse All</h1>
      <p className="mb-8 max-w-2xl text-gray-400">
        Explore the catalog by genre and sort by your favorite criteria.
      </p>

      <div className="mb-6">
        <GenreFilter genres={genres} activeGenre={activeGenre} onSelect={setActiveGenre} />
      </div>

      <div className="mb-8 flex justify-end">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-md border border-gray-700 bg-[#141414] px-4 py-2 text-sm text-white focus:border-red-600 focus:outline-none"
        >
          <option value="popularity">Popularity</option>
          <option value="rating">Rating</option>
          <option value="release">Release Date</option>
        </select>
      </div>

      {error && <p className="mb-4 text-center text-red-400">{error}</p>}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 justify-items-center">
        {sortedMovies.map((movie, index) => (
          <div key={`${movie.id}-${index}`} className="contents">
            <div className="w-full max-w-[220px]">
              <MovieCard movie={movie} />
            </div>

            {index === 1 && (
              <div className="col-span-full mt-2 w-full sm:hidden">
                <AdBanner size="leaderboard" />
              </div>
            )}
            {index === 3 && (
              <div className="col-span-full mt-2 hidden w-full sm:block lg:hidden">
                <AdBanner size="leaderboard" />
              </div>
            )}
            {index === 7 && (
              <div className="col-span-full mt-2 hidden w-full lg:block">
                <AdBanner size="leaderboard" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="rounded-md bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-60 transition-all duration-200"
        >
          {loadingMore ? "Loading..." : "Load More"}
        </button>
      </div>
      {loadingMore && <LoadingSpinner />}
    </div>
  );
}

export default Browse;
