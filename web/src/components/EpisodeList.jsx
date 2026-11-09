import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStillUrl, getTVEpisodes } from "../lib/tmdb";
import { watchPath } from "../lib/routes";
import { ChevronDownIcon, PlayIcon } from "./ui/Icons";

export function SeasonSelect({ seasons, value, onChange, className = "" }) {
  if (!seasons?.length) return null;
  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <span className="sr-only">Season</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="appearance-none rounded-md border border-white/25 bg-surface-2 py-2 pl-4 pr-10 text-sm font-semibold text-white transition hover:border-white/50 focus:border-white focus:outline-none"
      >
        {seasons.map((s) => (
          <option key={s.season_number} value={s.season_number}>
            {s.name || `Season ${s.season_number}`} ({s.episode_count} ep)
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 h-4 w-4" />
    </label>
  );
}

function EpisodeSkeleton() {
  return (
    <div className="flex gap-4 p-3">
      <div className="aspect-video w-32 shrink-0 rounded skeleton sm:w-40" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 w-1/2 rounded skeleton" />
        <div className="h-3 w-full rounded skeleton" />
        <div className="h-3 w-4/5 rounded skeleton" />
      </div>
    </div>
  );
}

// Episode picker. `activeSeason`/`activeEpisode` highlight the one currently playing.
function EpisodeList({ show, seasons, initialSeason, activeSeason, activeEpisode, onSelect }) {
  const [season, setSeason] = useState(initialSeason || seasons?.[0]?.season_number || 1);
  const [episodes, setEpisodes] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialSeason) setSeason(initialSeason);
  }, [initialSeason]);

  useEffect(() => {
    let alive = true;
    setEpisodes(null);
    setError(null);
    getTVEpisodes(show.id, season)
      .then((eps) => alive && setEpisodes(eps))
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [show.id, season]);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="brand-font text-xl font-bold md:text-2xl">Episodes</h3>
        <SeasonSelect seasons={seasons} value={season} onChange={setSeason} />
      </div>

      {error && <p className="py-6 text-sm text-red-400">{error}</p>}

      <ol className="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10">
        {!episodes && !error && [0, 1, 2].map((i) => <EpisodeSkeleton key={i} />)}
        {episodes?.map((ep) => {
          const active = activeSeason === season && activeEpisode === ep.episode_number;
          const to = watchPath({ ...show, media_type: "tv" }, { season, episode: ep.episode_number });
          return (
            <li key={ep.id}>
              <Link
                to={to}
                onClick={(e) => {
                  if (onSelect) {
                    e.preventDefault();
                    onSelect(season, ep.episode_number, ep);
                  }
                }}
                aria-current={active ? "true" : undefined}
                className={`group flex items-start gap-3 p-3 transition sm:gap-4 sm:p-4 ${
                  active ? "bg-white/10" : "hover:bg-white/[0.06]"
                }`}
              >
                <span className="hidden w-6 shrink-0 pt-6 text-center text-xl font-semibold text-white/50 sm:block">
                  {ep.episode_number}
                </span>
                <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded bg-surface-3 sm:w-40">
                  {ep.still_path && (
                    <img
                      src={getStillUrl(ep.still_path)}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  <span
                    className={`absolute inset-0 flex items-center justify-center bg-black/40 transition ${
                      active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-black/50">
                      <PlayIcon className="h-4 w-4 translate-x-px" />
                    </span>
                  </span>
                  {active && (
                    <span className="absolute bottom-1 left-1 rounded-sm bg-brand px-1.5 text-[0.6rem] font-bold uppercase">
                      Playing
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-semibold">
                      <span className="sm:hidden">{ep.episode_number}. </span>
                      {ep.name}
                    </p>
                    {ep.runtime ? <span className="shrink-0 text-sm text-white/60">{ep.runtime}m</span> : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-white/60 sm:line-clamp-3">
                    {ep.overview || "No description available."}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default EpisodeList;
