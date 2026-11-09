import { useEffect, useId, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useMedia } from "../context/MediaContext";
import { getProfileUrl, getSmallPosterUrl, getTitle, getYear, suggest, suggestCategories } from "../lib/tmdb";
import { CloseIcon, SearchIcon } from "./ui/Icons";

const KIND_LABEL = {
  industry: "Category",
  genre: "Genre",
  mood: "Mood",
  network: "Streaming",
  studio: "Studio",
  format: "Category",
};

const searchUrl = (q) => `/search?q=${encodeURIComponent(q.trim())}`;

// Navbar search with as-you-type suggestions (categories, titles, people).
function SearchBox() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { openModal } = useMedia();
  const onSearchPage = location.pathname === "/search";
  const urlQuery = onSearchPage ? params.get("q") || "" : "";

  const [expanded, setExpanded] = useState(onSearchPage);
  const [value, setValue] = useState(urlQuery);
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState({ categories: [], titles: [], people: [] });
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const listId = useId();

  // Keep the box in sync with the URL (e.g. after clicking a chip on the results page).
  useEffect(() => {
    if (onSearchPage) {
      setValue(urlQuery);
      setExpanded(true);
    } else {
      setValue("");
      setExpanded(false);
    }
  }, [onSearchPage, urlQuery]);

  // "/" focuses search from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        e.preventDefault();
        setExpanded(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Suggestions: categories instantly, titles/people after a short pause.
  useEffect(() => {
    const q = value.trim();
    setActive(-1);
    if (!focused || q.length < 2) {
      setResults({ categories: [], titles: [], people: [] });
      setLoading(false);
      return undefined;
    }
    setResults((prev) => ({ ...prev, categories: suggestCategories(q) }));
    setLoading(true);
    let alive = true;
    const t = setTimeout(() => {
      suggest(q)
        .then((r) => alive && setResults(r))
        .catch(() => {})
        .finally(() => alive && setLoading(false));
    }, 220);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [value, focused]);

  useEffect(() => {
    if (!focused) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setFocused(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [focused]);

  const options = [
    ...results.categories.map((c) => ({ id: `c-${c.label}`, kind: "category", data: c })),
    ...results.titles.map((t) => ({ id: `t-${t.media_type}-${t.id}`, kind: "title", data: t })),
    ...results.people.map((p) => ({ id: `p-${p.id}`, kind: "person", data: p })),
  ];
  const hasQuery = value.trim().length >= 2;
  const allIndex = options.length; // "See all results" row

  const close = () => {
    setFocused(false);
    inputRef.current?.blur();
  };

  const submit = (q = value) => {
    if (!q.trim()) return;
    close();
    navigate(searchUrl(q));
  };

  const choose = (option) => {
    if (!option) return submit();
    if (option.kind === "category") return submit(option.data.query);
    if (option.kind === "person") return submit(option.data.name);
    close();
    openModal(option.data);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      if (focused && hasQuery) setFocused(false);
      else clear();
      return;
    }
    if (!hasQuery) {
      if (e.key === "Enter") submit();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i >= allIndex ? 0 : i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? allIndex : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && active < options.length) choose(options[active]);
      else submit();
    }
  };

  const clear = () => {
    setValue("");
    setFocused(false);
    setExpanded(false);
    if (onSearchPage) navigate(-1);
  };

  const showPanel = focused && hasQuery;
  const optionClass = (index) =>
    `flex w-full items-center gap-3 px-3 py-2 text-left transition ${
      active === index ? "bg-white/10" : "hover:bg-white/[0.06]"
    }`;

  return (
    <div ref={wrapRef} className="relative">
      <div
        className={`flex items-center overflow-hidden rounded-md border transition-all duration-300 ${
          expanded ? "w-[min(44vw,300px)] border-white/60 bg-black/75" : "w-10 border-transparent"
        }`}
      >
        <button
          type="button"
          aria-label="Search"
          onClick={() => {
            if (expanded && value.trim()) return submit();
            setExpanded(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center text-white"
        >
          <SearchIcon className="h-5 w-5" />
        </button>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setFocused(true);
          }}
          onFocus={() => setFocused(true)}
          onKeyDown={onKeyDown}
          onBlur={() => !value && !onSearchPage && setExpanded(false)}
          placeholder="Titles, people, genres"
          aria-label="Search titles, people and genres"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          tabIndex={expanded ? 0 : -1}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white placeholder:text-white/50 focus:outline-none"
        />
        {expanded && value && (
          <button type="button" aria-label="Clear search" onClick={clear} className="px-2 text-white/70 hover:text-white">
            <CloseIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,400px)] animate-fade-in overflow-hidden rounded-lg border border-white/10 bg-ink/95 py-2 shadow-2xl backdrop-blur-xl"
        >
          {results.categories.length > 0 && (
            <p className="px-3 pb-1 pt-1 text-[0.65rem] font-semibold uppercase tracking-widest text-white/40">Explore</p>
          )}
          {options.map((option, index) => {
            const isFirstTitle = option.kind === "title" && options[index - 1]?.kind !== "title";
            const isFirstPerson = option.kind === "person" && options[index - 1]?.kind !== "person";
            return (
              <div key={option.id}>
                {isFirstTitle && (
                  <p className="px-3 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-widest text-white/40">Titles</p>
                )}
                {isFirstPerson && (
                  <p className="px-3 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-widest text-white/40">People</p>
                )}
                <button
                  type="button"
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={active === index}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(option)}
                  className={optionClass(index)}
                >
                  {option.kind === "category" && (
                    <>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand/15 text-brand-bright">
                        <SearchIcon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{option.data.label}</span>
                        <span className="block text-xs text-white/45">
                          {KIND_LABEL[option.data.conceptKind] || "Category"} · Top movies &amp; series
                        </span>
                      </span>
                    </>
                  )}
                  {option.kind === "title" && (
                    <>
                      <span className="relative h-12 w-8 shrink-0 overflow-hidden rounded bg-surface-3">
                        {option.data.poster_path && (
                          <img src={getSmallPosterUrl(option.data.poster_path)} alt="" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{getTitle(option.data)}</span>
                        <span className="block text-xs text-white/45">
                          {option.data.media_type === "tv" ? "Series" : "Movie"}
                          {getYear(option.data) ? ` · ${getYear(option.data)}` : ""}
                        </span>
                      </span>
                    </>
                  )}
                  {option.kind === "person" && (
                    <>
                      <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-surface-3">
                        <img src={getProfileUrl(option.data.profile_path)} alt="" className="h-full w-full object-cover" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{option.data.name}</span>
                        <span className="block text-xs text-white/45">{option.data.known_for_department || "Person"}</span>
                      </span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
          {loading && options.length === 0 && (
            <div className="space-y-2 px-3 py-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 rounded skeleton" />
              ))}
            </div>
          )}
          <div className="mt-1 border-t border-white/10 pt-1">
            <button
              type="button"
              id={`${listId}-${allIndex}`}
              role="option"
              aria-selected={active === allIndex}
              onMouseEnter={() => setActive(allIndex)}
              onClick={() => submit()}
              className={`${optionClass(allIndex)} text-sm text-white/80`}
            >
              <SearchIcon className="h-4 w-4 text-white/50" />
              See all results for “<span className="truncate font-semibold text-white">{value.trim()}</span>”
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchBox;
