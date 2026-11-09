import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import TitleGrid, { GridSkeleton } from "../components/TitleGrid";
import { useMedia } from "../context/MediaContext";
import useSearch from "../hooks/useSearch";
import { getTitle, getTrending } from "../lib/tmdb";
import { SearchIcon } from "../components/ui/Icons";

const FILTERS = [
  ["all", "All"],
  ["movie", "Movies"],
  ["tv", "Series"],
];

function TopSearches() {
  const [items, setItems] = useState(null);
  const { openModal } = useMedia();

  useEffect(() => {
    getTrending("all", 1, "day")
      .then((list) => setItems(list.filter((t) => t.media_type === "movie" || t.media_type === "tv")))
      .catch(() => setItems([]));
  }, []);

  if (!items) return <GridSkeleton count={12} />;

  return (
    <div>
      <h2 className="brand-font mb-4 text-xl font-bold">Top searches today</h2>
      <ol className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 15).map((item, i) => (
          <li key={`${item.media_type}-${item.id}`}>
            <button
              type="button"
              onClick={() => openModal(item)}
              className="group flex w-full items-center gap-4 rounded-md px-2 py-2 text-left transition hover:bg-white/5"
            >
              <span className="brand-font w-6 text-right text-lg font-extrabold text-white/30 group-hover:text-brand-bright">
                {i + 1}
              </span>
              <span className="truncate text-white/85 group-hover:text-white">{getTitle(item)}</span>
              <span className="ml-auto shrink-0 text-xs uppercase tracking-wider text-white/35">
                {item.media_type === "tv" ? "Series" : "Movie"}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [filter, setFilter] = useState("all");
  const { results, loading, error } = useSearch(query);

  useEffect(() => {
    document.title = query ? `“${query}” · CineStream` : "Search · CineStream";
  }, [query]);

  const filtered = filter === "all" ? results : results.filter((r) => r.media_type === filter);

  return (
    <div className="min-h-[70vh] gutter pt-24 md:pt-28">
      {query ? (
        <>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-lg text-white/60">
              Results for <span className="brand-font text-2xl font-bold text-white">“{query}”</span>
            </h1>
            <div className="inline-flex rounded-md bg-surface-2 p-1">
              {FILTERS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={`rounded px-3.5 py-1.5 text-sm font-semibold transition ${
                    filter === value ? "bg-white text-black" : "text-white/70 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <p className="py-16 text-center text-red-400">{error}</p>
          ) : loading ? (
            <GridSkeleton count={12} />
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-lg">Your search for “{query}” did not have any matches.</p>
              <p className="mt-3 text-sm text-white/60">Try different keywords, or search by a movie or series title.</p>
            </div>
          ) : (
            <TitleGrid items={filtered} />
          )}
        </>
      ) : (
        <>
          <div className="mb-10 flex items-center gap-3 text-white/60">
            <SearchIcon className="h-6 w-6" />
            <p>Start typing in the search bar above to find movies and series.</p>
          </div>
          <TopSearches />
        </>
      )}
    </div>
  );
}

export default Search;
