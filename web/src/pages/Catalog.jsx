import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import TitleGrid, { GridSkeleton } from "../components/TitleGrid";
import { ChevronDownIcon } from "../components/ui/Icons";
import { discover, getBackdropUrl, getGenres } from "../lib/tmdb";

const SORTS = {
  popular: { label: "Most Popular", params: { sort_by: "popularity.desc" } },
  rated: { label: "Highest Rated", params: { sort_by: "vote_average.desc", "vote_count.gte": 300 } },
  newest: { label: "Newest", params: { sort_by: "__date__.desc", "vote_count.gte": 10 } },
  az: { label: "A–Z", params: { sort_by: "__title__.asc", "vote_count.gte": 50 } },
};

const buildParams = (type, sortKey) => {
  const today = new Date().toISOString().slice(0, 10);
  const base = { ...SORTS[sortKey].params };
  const dateField = type === "tv" ? "first_air_date" : "primary_release_date";
  base.sort_by = base.sort_by
    .replace("__date__", dateField)
    .replace("__title__", type === "tv" ? "name" : "title");
  if (sortKey === "newest") base[`${dateField}.lte`] = today;
  return base;
};

function Select({ value, onChange, children, label }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-md border border-white/20 bg-surface-2 py-2 pl-3.5 pr-9 text-sm font-medium text-white transition hover:border-white/40 focus:border-white focus:outline-none"
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 h-4 w-4 text-white/70" />
    </label>
  );
}

// /browse (all filters) and /genre/:name (genre fixed from the URL).
function Catalog({ mode = "browse" }) {
  const { name } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";
  const sortKey = SORTS[searchParams.get("sort")] ? searchParams.get("sort") : "popular";
  const genreParam = searchParams.get("genre");

  const [genres, setGenres] = useState([]);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const setParam = (key, value) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, value);
        if (key === "type") next.delete("genre");
        return next;
      },
      { replace: true }
    );

  useEffect(() => {
    getGenres(type).then(setGenres).catch((err) => setError(err.message));
  }, [type]);

  const genre = useMemo(() => {
    if (mode === "genre") {
      const wanted = decodeURIComponent(name || "").toLowerCase();
      return genres.find((g) => g.name.toLowerCase() === wanted) || null;
    }
    return genres.find((g) => String(g.id) === genreParam) || null;
  }, [mode, name, genres, genreParam]);

  const genreMissing = mode === "genre" && genres.length > 0 && !genre;
  const ready = mode === "browse" ? genres.length > 0 || error : Boolean(genre);
  const genreId = genre?.id;

  useEffect(() => {
    const label = mode === "genre" ? genre?.name : "Browse";
    if (label) document.title = `${label} · CineStream`;
  }, [mode, genre]);

  useEffect(() => {
    if (!ready || error) return undefined;
    let alive = true;
    setLoading(true);
    setItems([]);
    discover(type, { ...buildParams(type, sortKey), with_genres: genreId, page: 1 })
      .then(({ results, totalPages: total }) => {
        if (!alive) return;
        setItems(results);
        setPage(1);
        setTotalPages(Math.min(total || 1, 500));
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [ready, error, type, sortKey, genreId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const { results } = await discover(type, { ...buildParams(type, sortKey), with_genres: genreId, page: next });
      setItems((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        return [...prev, ...results.filter((t) => !seen.has(t.id))];
      });
      setPage(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, page, totalPages, type, sortKey, genreId]);

  const heroBackdrop = items.find((t) => t.backdrop_path)?.backdrop_path;
  const heading = mode === "genre" ? genre?.name || decodeURIComponent(name || "") : "Browse";

  return (
    <div className="pb-8">
      {mode === "genre" ? (
        <section className="relative h-[42vh] min-h-[300px] overflow-hidden">
          {heroBackdrop && (
            <img
              src={getBackdropUrl(heroBackdrop)}
              alt=""
              className="absolute inset-0 h-full w-full animate-fade-in object-cover object-top"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/80 to-transparent" />
          <div className="absolute bottom-8 left-0 gutter">
            <p className="mb-1 text-sm font-semibold uppercase tracking-[0.2em] text-brand-bright">
              {type === "tv" ? "Series" : "Movies"}
            </p>
            <h1 className="brand-font text-4xl font-extrabold text-shadow sm:text-6xl">{heading}</h1>
          </div>
        </section>
      ) : (
        <div className="gutter pt-24 md:pt-28">
          <h1 className="brand-font text-3xl font-extrabold md:text-4xl">{heading}</h1>
          <p className="mt-2 text-white/60">Every title, your way. Pick a format, a genre and how to sort.</p>
        </div>
      )}

      <div className="sticky top-16 z-30 mt-6 border-b border-white/[0.06] bg-ink/90 py-3 backdrop-blur-md md:top-[70px]">
        <div className="flex flex-wrap items-center gap-3 gutter">
          <div className="inline-flex rounded-md bg-surface-2 p-1" role="tablist" aria-label="Format">
            {[
              ["movie", "Movies"],
              ["tv", "Series"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={type === value}
                onClick={() => setParam("type", value)}
                className={`rounded px-4 py-1.5 text-sm font-semibold transition ${
                  type === value ? "bg-white text-black" : "text-white/70 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "browse" && (
            <Select label="Genre" value={genreParam || ""} onChange={(v) => setParam("genre", v)}>
              <option value="">All genres</option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          )}

          <Select label="Sort" value={sortKey} onChange={(v) => setParam("sort", v === "popular" ? null : v)}>
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-6 gutter">
        {genreMissing ? (
          <p className="py-20 text-center text-white/60">
            “{heading}” isn’t a {type === "tv" ? "series" : "movie"} genre. Try switching format above.
          </p>
        ) : error ? (
          <p className="py-20 text-center text-red-400">{error}</p>
        ) : loading ? (
          <GridSkeleton count={18} />
        ) : items.length === 0 ? (
          <p className="py-20 text-center text-white/60">Nothing here yet.</p>
        ) : (
          <TitleGrid items={items} onLoadMore={loadMore} hasMore={page < totalPages} loadingMore={loadingMore} />
        )}
      </div>
    </div>
  );
}

export default Catalog;
