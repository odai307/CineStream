import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import MovieCard from "../components/MovieCard";
import { getBackdropUrl, getByGenre, getGenres } from "../lib/tmdb";

const sorters = {
  popularity: (a, b) => b.popularity - a.popularity,
  rating: (a, b) => b.vote_average - a.vote_average,
  release: (a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0),
};

function Genre() {
  const { name } = useParams();
  const [genres, setGenres] = useState([]);
  const [genreId, setGenreId] = useState(null);
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("popularity");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const sortedMovies = useMemo(() => {
    const copy = [...movies];
    return copy.sort(sorters[sortBy]);
  }, [movies, sortBy]);

  useEffect(() => {
    const loadGenres = async () => {
      try {
        setLoading(true);
        setError(null);
        const list = await getGenres();
        setGenres(list);

        const normalized = decodeURIComponent(name || "").toLowerCase();
        const matched = list.find((g) => g.name.toLowerCase() === normalized);
        if (!matched) {
          setError("Genre not found.");
          setLoading(false);
          return;
        }

        setGenreId(matched.id);
      } catch (err) {
        setError(err.message || "Failed to load genre info.");
        setLoading(false);
      }
    };

    loadGenres();
  }, [name]);

  useEffect(() => {
    if (!genreId) return;

    const loadMovies = async () => {
      try {
        setLoading(true);
        setError(null);
        const list = await getByGenre(genreId, 1);
        setMovies(list);
        setPage(1);
      } catch (err) {
        setError(err.message || "Failed to load movies for this genre.");
      } finally {
        setLoading(false);
      }
    };

    loadMovies();
  }, [genreId]);

  const loadMore = async () => {
    if (!genreId) return;
    try {
      setLoadingMore(true);
      const next = page + 1;
      const list = await getByGenre(genreId, next);
      setMovies((prev) => [...prev, ...list]);
      setPage(next);
    } catch (err) {
      setError(err.message || "Failed to load more movies.");
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading && movies.length === 0) return <LoadingSpinner />;
  if (error && movies.length === 0)
    return <p className="px-4 py-16 text-center text-red-400">{error}</p>;

  const displayName =
    genres.find((g) => g.id === genreId)?.name || decodeURIComponent(name || "");
  const heroBackdrop = movies[0]?.backdrop_path;

  return (
    <div className="pb-16">
      <section className="relative h-[320px] overflow-hidden sm:h-[380px]">
        {heroBackdrop ? (
          <img
            src={getBackdropUrl(heroBackdrop)}
            alt={displayName}
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-sm"
          />
        ) : (
          <div className="absolute inset-0 bg-[#141414]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-black/60" />
        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-end px-4 pb-10 sm:px-6 lg:px-8">
          <h1 className="brand-font text-5xl font-black uppercase sm:text-6xl">{displayName}</h1>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
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

        <div className="grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {sortedMovies.map((movie) => (
            <div key={movie.id} className="w-full max-w-[220px]">
              <MovieCard movie={movie} />
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
      </section>
    </div>
  );
}

export default Genre;
