import { useEffect, useState } from "react";
import { searchMovies } from "../lib/tmdb";

const useSearch = (query) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const normalized = query?.trim();

    if (!normalized) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const movies = await searchMovies(normalized);
        setResults(movies);
      } catch (err) {
        setError(err.message || "Search failed. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  return { results, loading, error };
};

export default useSearch;
