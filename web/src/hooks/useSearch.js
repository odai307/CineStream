import { useEffect, useState } from "react";
import { searchMulti } from "../lib/tmdb";

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
        const titles = await searchMulti(normalized);
        const filtered = titles.filter(
          (item) => item.media_type === "movie" || item.media_type === "tv"
        );
        setResults(filtered);
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
