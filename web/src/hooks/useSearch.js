import { useEffect, useState } from "react";
import { searchMulti } from "../lib/tmdb";

const useSearch = (query, delay = 350) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const normalized = query?.trim();

    if (!normalized) {
      setResults([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    let alive = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        setError(null);
        const titles = await searchMulti(normalized);
        if (alive) setResults(titles.filter((t) => t.backdrop_path || t.poster_path));
      } catch (err) {
        if (alive) setError(err.message || "Search failed. Please try again.");
      } finally {
        if (alive) setLoading(false);
      }
    }, delay);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, delay]);

  return { results, loading, error };
};

export default useSearch;
