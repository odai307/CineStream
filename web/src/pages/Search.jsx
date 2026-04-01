import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdBanner from "../components/AdBanner";
import LoadingSpinner from "../components/LoadingSpinner";
import MovieCard from "../components/MovieCard";
import useSearch from "../hooks/useSearch";

function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = useMemo(() => searchParams.get("q") || "", [searchParams]);
  const [inputValue, setInputValue] = useState(query);
  const { results, loading, error } = useSearch(query);

  useEffect(() => {
    setInputValue(query);
  }, [query]);

  const submit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="brand-font text-4xl font-black">Search Movies & Series</h1>
        <div className="mx-auto mt-6 w-full max-w-2xl relative">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            type="text"
            placeholder="Search for a movie, series, or anime..."
            className="w-full rounded-xl border border-gray-700 bg-[#141414] px-6 py-5 text-center text-2xl font-semibold text-white placeholder:text-gray-500 focus:border-red-600 focus:outline-none transition-all duration-200"
          />
          <button
            onClick={submit}
            aria-label="Search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold hover:bg-red-500 transition-all duration-200"
          >
            Go
          </button>
        </div>
        <p className="mt-2 text-gray-300">Results for: <span className="font-semibold text-white">{query || "-"}</span></p>
      </div>

      <AdBanner size="leaderboard" />

      {loading && <LoadingSpinner />}
      {error && <p className="mt-6 text-center text-red-400">{error}</p>}

      {!loading && !error && results.length === 0 && query && (
        <p className="mt-10 text-center text-gray-400">No results found.</p>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="mt-8 grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {results.map((movie) => (
            <div key={movie.id} className="w-full max-w-[220px]">
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Search;
