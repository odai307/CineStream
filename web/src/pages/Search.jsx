import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Row from "../components/Row";
import TitleGrid, { GridSkeleton } from "../components/TitleGrid";
import { RowSkeleton } from "../components/Row";
import { ListButton, PrimaryPlay, Score } from "../components/ui/Controls";
import { CloseIcon, InfoIcon, SearchIcon } from "../components/ui/Icons";
import { useMedia } from "../context/MediaContext";
import { useLibrary } from "../context/LibraryContext";
import {
  getBackdropUrl,
  getProfileUrl,
  getTitle,
  getTrending,
  getYear,
  removeFromQuery,
  searchTitlesPage,
  smartSearch,
  truncate,
} from "../lib/tmdb";
import { resumePath } from "../lib/routes";

const FILTERS = [
  ["all", "All"],
  ["movie", "Movies"],
  ["tv", "Series"],
];

// Shown on the empty search page and when nothing matches.
const EXPLORE = [
  "Bollywood", "Nollywood", "Ghanaian", "K-Drama", "Anime", "Turkish series", "Telenovela",
  "90s action", "Horror", "Romcom", "Feel-good movies", "Marvel", "Pixar", "Netflix series",
  "True crime documentaries", "Time travel",
];

const searchUrl = (q, exact) => `/search?q=${encodeURIComponent(q)}${exact ? "&exact=1" : ""}`;

function ExploreChips({ title = "Explore" }) {
  return (
    <div>
      <h2 className="brand-font mb-4 text-xl font-bold">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {EXPLORE.map((label) => (
          <Link
            key={label}
            to={searchUrl(label.toLowerCase())}
            className="rounded-full border border-white/15 bg-surface-2 px-4 py-2 text-sm font-medium text-white/85 transition hover:border-white/40 hover:bg-surface-3 hover:text-white"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function TopSearches() {
  const [items, setItems] = useState(null);
  const { openModal } = useMedia();

  useEffect(() => {
    getTrending("all", 1, "day")
      .then((list) => setItems(list.filter((t) => t.media_type === "movie" || t.media_type === "tv")))
      .catch(() => setItems([]));
  }, []);

  if (!items) return <GridSkeleton count={6} />;

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

function TopTitle({ item }) {
  const { openModal } = useMedia();
  const { getProgress } = useLibrary();
  const progress = getProgress(item);
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/10 bg-surface">
      {item.backdrop_path && (
        <img src={getBackdropUrl(item.backdrop_path)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/70 to-transparent" />
      <div className="relative max-w-xl space-y-3 p-6 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-bright">Top result</p>
        <h2 className="brand-font text-3xl font-extrabold text-shadow sm:text-4xl">{getTitle(item)}</h2>
        <div className="flex items-center gap-3 text-sm text-white/75">
          <Score vote={item.vote_average} />
          {getYear(item) && <span>{getYear(item)}</span>}
          <span>{item.media_type === "tv" ? "Series" : "Movie"}</span>
        </div>
        <p className="text-sm leading-relaxed text-white/80 sm:text-base">{truncate(item.overview || "", 220)}</p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <PrimaryPlay to={resumePath(item, progress)} label={progress ? "Resume" : "Play"} className="!py-2 !text-base" />
          <button
            type="button"
            onClick={() => openModal(item)}
            className="inline-flex items-center gap-2 rounded-md bg-white/20 px-5 py-2 font-semibold backdrop-blur-md transition hover:bg-white/30"
          >
            <InfoIcon className="h-5 w-5" /> More Info
          </button>
          <ListButton item={item} />
        </div>
      </div>
    </section>
  );
}

function TopPerson({ person }) {
  return (
    <section className="flex items-center gap-5 rounded-xl border border-white/10 bg-surface p-5 sm:p-6">
      <div className="brand-font flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-3 text-3xl font-bold text-white/40 sm:h-24 sm:w-24">
        {person.profile_path ? (
          <img src={getProfileUrl(person.profile_path)} alt="" className="h-full w-full object-cover" />
        ) : (
          person.name.charAt(0)
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-bright">Top result</p>
        <h2 className="brand-font truncate text-2xl font-extrabold sm:text-3xl">{person.name}</h2>
        <p className="text-sm text-white/60">
          {person.known_for_department || "Person"}
          {person.known_for?.length ? ` · Known for ${person.known_for.slice(0, 2).map(getTitle).join(", ")}` : ""}
        </p>
      </div>
    </section>
  );
}

function PeopleStrip({ people }) {
  if (!people.length) return null;
  return (
    <section>
      <h2 className="brand-font mb-3 text-lg font-bold md:text-xl">People</h2>
      <div className="scrollbar-hide -mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
        {people.map((p) => (
          <Link key={p.id} to={searchUrl(p.name)} className="group w-24 shrink-0 text-center">
            <div className="mx-auto mb-2 h-24 w-24 overflow-hidden rounded-full bg-surface-3 ring-white/0 transition group-hover:ring-2 group-hover:ring-white/70">
              <img src={getProfileUrl(p.profile_path)} alt="" loading="lazy" className="h-full w-full object-cover" />
            </div>
            <p className="truncate text-xs font-semibold">{p.name}</p>
            <p className="truncate text-[0.7rem] text-white/45">{p.known_for_department}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = (searchParams.get("q") || "").trim();
  const exact = searchParams.get("exact") === "1";
  const [filter, setFilter] = useState("all");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [extra, setExtra] = useState({ titles: [], page: 1, loading: false });

  useEffect(() => {
    document.title = query ? `“${query}” · CineStream` : "Search · CineStream";
  }, [query]);

  useEffect(() => {
    setResult(null);
    setError(null);
    setExtra({ titles: [], page: 1, loading: false });
    if (!query) return undefined;
    let alive = true;
    smartSearch(query, { exact })
      .then((r) => alive && setResult(r))
      .catch((err) => alive && setError(err.message || "Search failed."));
    return () => {
      alive = false;
    };
  }, [query, exact]);

  const loadMore = useCallback(async () => {
    if (!result || extra.loading || extra.page >= result.totalPages) return;
    setExtra((e) => ({ ...e, loading: true }));
    try {
      const next = extra.page + 1;
      const { titles } = await searchTitlesPage(query, next);
      setExtra((e) => ({ titles: [...e.titles, ...titles], page: next, loading: false }));
    } catch {
      setExtra((e) => ({ ...e, loading: false, page: result.totalPages }));
    }
  }, [result, extra, query]);

  const titles = useMemo(() => {
    if (!result) return [];
    const seen = new Set();
    return [...result.titles, ...extra.titles].filter((t) => {
      const k = `${t.media_type}-${t.id}`;
      if (seen.has(k) || (filter !== "all" && t.media_type !== filter)) return false;
      seen.add(k);
      return true;
    });
  }, [result, extra.titles, filter]);

  const rows = result ? result.rows.filter((r) => filter === "all" || !r.type || r.type === filter) : [];
  const nothing = result && !result.topResult && !rows.length && !titles.length && !result.people.length;

  if (!query) {
    return (
      <div className="min-h-[70vh] space-y-12 gutter pt-24 md:pt-28">
        <div className="flex items-center gap-3 text-white/60">
          <SearchIcon className="h-6 w-6" />
          <p>
            Search titles, actors, genres, countries or moods. Try “bollywood comedy”, “90s horror” or “shah rukh khan”.
          </p>
        </div>
        <ExploreChips />
        <TopSearches />
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] pb-8 pt-24 md:pt-28">
      <div className="space-y-4 gutter">
        <div className="flex flex-wrap items-end justify-between gap-4">
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

        {result?.corrections.length > 0 && (
          <p className="text-sm text-white/70">
            Showing results for{" "}
            <span className="font-semibold text-white">{result.corrections.map((c) => c.to).join(", ")}</span>.{" "}
            <Link to={searchUrl(query, true)} className="text-white/60 underline-offset-2 hover:text-white hover:underline">
              Search instead for “{query}”
            </Link>
          </p>
        )}

        {result?.chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-white/40">Showing</span>
            {result.chips.map((chip, i) => {
              const removable = Boolean(chip.match) && result.chips.filter((c) => c.match).length > 1;
              return (
                <span
                  key={`${chip.kind}-${chip.label}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-surface-2 py-1 pl-3 pr-2 text-sm"
                >
                  {chip.label}
                  {removable ? (
                    <button
                      type="button"
                      onClick={() => navigate(searchUrl(removeFromQuery(result.parsed, chip.match), exact))}
                      aria-label={`Remove ${chip.label}`}
                      className="rounded-full p-0.5 text-white/50 transition hover:bg-white/10 hover:text-white"
                    >
                      <CloseIcon className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <span className="w-1" />
                  )}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8 space-y-10">
        {error ? (
          <p className="py-16 text-center text-red-400 gutter">{error}</p>
        ) : !result ? (
          <div className="space-y-10">
            <RowSkeleton />
            <RowSkeleton />
            <div className="gutter">
              <GridSkeleton count={12} />
            </div>
          </div>
        ) : nothing ? (
          <div className="space-y-12 gutter">
            <div className="py-6">
              <p className="text-lg">Your search for “{query}” did not have any matches.</p>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-white/60">
                <li>Check the spelling, or try fewer words</li>
                <li>Try a genre, country or mood, e.g. “nollywood comedy” or “feel-good movies”</li>
                <li>Search for an actor or director by name</li>
              </ul>
            </div>
            <ExploreChips title="Try one of these" />
          </div>
        ) : (
          <>
            {result.topResult && (
              <div className="gutter">
                {result.topResult.kind === "title" ? (
                  <TopTitle item={result.topResult.item} />
                ) : (
                  <TopPerson person={result.topResult.person} />
                )}
              </div>
            )}

            {rows.length > 0 && (
              <div className="space-y-8 md:space-y-10">
                {rows.map((row) => (
                  <Row key={`${query}-${row.key}`} title={row.title} fetcher={row.fetcher} />
                ))}
              </div>
            )}

            {titles.length > 0 && (
              <section className="gutter">
                <h2 className="brand-font mb-3 text-lg font-bold md:text-xl">
                  {rows.length ? `Titles matching “${query}”` : "Titles"}
                </h2>
                <TitleGrid
                  items={titles}
                  onLoadMore={loadMore}
                  hasMore={extra.page < result.totalPages}
                  loadingMore={extra.loading}
                />
              </section>
            )}

            {filter === "all" && (
              <div className="gutter">
                <PeopleStrip people={result.people} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Search;
