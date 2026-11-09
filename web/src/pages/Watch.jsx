import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import EpisodeList from "../components/EpisodeList";
import Row from "../components/Row";
import { LikeButton, ListButton, MaturityBadge, Score } from "../components/ui/Controls";
import { ArrowLeftIcon, ChevronLeftIcon, InfoIcon, NextIcon, ServerIcon } from "../components/ui/Icons";
import { useLibrary } from "../context/LibraryContext";
import { useMedia } from "../context/MediaContext";
import useTitleDetails from "../hooks/useTitleDetails";
import { formatRuntime, getFallbackUrls, getTitle, getTVEpisodes, getYear } from "../lib/tmdb";
import { watchPath } from "../lib/routes";

function Player({ src, title }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(false), [src]);
  return (
    <div className="relative mx-auto aspect-video w-full max-w-[calc((100svh-4rem)*16/9)] overflow-hidden bg-black">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-white/15 border-t-brand" />
        </div>
      )}
      <iframe
        key={src}
        src={src}
        title={title}
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 h-full w-full border-0"
        allowFullScreen
        allow="fullscreen *; autoplay *; encrypted-media *; picture-in-picture *"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

function Watch() {
  const { type: rawType, id } = useParams();
  const mediaType = rawType === "tv" ? "tv" : "movie";
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { recordWatch } = useLibrary();
  const { openModal } = useMedia();
  const { details, error, certification } = useTitleDetails(id, mediaType);

  const season = Number(searchParams.get("s")) || 1;
  const episode = Number(searchParams.get("e")) || 1;
  const [server, setServer] = useState(0);
  const [episodeName, setEpisodeName] = useState(null);

  const sources = useMemo(() => getFallbackUrls(id, mediaType, season, episode), [id, mediaType, season, episode]);
  useEffect(() => setServer(0), [id, season, episode]);

  const seasons = useMemo(
    () => (details?.seasons || []).filter((s) => s.season_number > 0 && s.episode_count > 0),
    [details]
  );

  // Resolve the episode title (for the header and Continue Watching).
  useEffect(() => {
    if (mediaType !== "tv") return undefined;
    let alive = true;
    setEpisodeName(null);
    getTVEpisodes(id, season)
      .then((eps) => alive && setEpisodeName(eps.find((e) => e.episode_number === episode)?.name || null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id, mediaType, season, episode]);

  useEffect(() => {
    if (!details) return;
    recordWatch(
      { ...details, media_type: mediaType },
      mediaType === "tv" ? { season, episode, episodeName } : {}
    );
  }, [details, mediaType, season, episode, episodeName, recordWatch]);

  useEffect(() => {
    if (details) document.title = `Watching ${getTitle(details)} · CineStream`;
  }, [details]);

  const goTo = (s, e) => {
    setSearchParams({ s: String(s), e: String(e) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentSeason = seasons.find((s) => s.season_number === season);
  const nextEp = (() => {
    if (mediaType !== "tv" || !currentSeason) return null;
    if (episode < currentSeason.episode_count) return { s: season, e: episode + 1 };
    const nextSeason = seasons.find((s) => s.season_number > season);
    return nextSeason ? { s: nextSeason.season_number, e: 1 } : null;
  })();
  const prevEp = (() => {
    if (mediaType !== "tv") return null;
    if (episode > 1) return { s: season, e: episode - 1 };
    const prevSeason = [...seasons].reverse().find((s) => s.season_number < season);
    return prevSeason ? { s: prevSeason.season_number, e: prevSeason.episode_count } : null;
  })();

  const back = () => {
    if (location.key !== "default") navigate(-1);
    else navigate("/");
  };

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-red-400">{error}</p>
        <Link to="/" className="rounded-md bg-white px-5 py-2 font-semibold text-black">Back to Home</Link>
      </div>
    );
  }

  const item = details ? { ...details, media_type: mediaType } : { id, media_type: mediaType };
  const title = details ? getTitle(details) : "";
  const year = details ? getYear(details) : null;
  const length = mediaType === "tv" ? null : formatRuntime(details?.runtime);

  return (
    <div className="min-h-screen bg-black">
      {/* Top bar */}
      <div className="flex h-16 items-center gap-4 gutter">
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-white/10"
        >
          <ArrowLeftIcon className="h-6 w-6" />
        </button>
        <div className="min-w-0">
          <p className="brand-font truncate font-bold md:text-lg">{title || " "}</p>
          {mediaType === "tv" && (
            <p className="truncate text-xs text-white/60 md:text-sm">
              S{season}:E{episode}
              {episodeName ? ` · ${episodeName}` : ""}
            </p>
          )}
        </div>
        {nextEp && (
          <button
            type="button"
            onClick={() => goTo(nextEp.s, nextEp.e)}
            className="ml-auto hidden items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20 sm:inline-flex"
          >
            <NextIcon className="h-4 w-4" /> Next Episode
          </button>
        )}
      </div>

      <Player src={sources[server]} title={title || "Player"} />

      <div className="mx-auto max-w-6xl space-y-10 py-6 gutter">
        {/* Server + episode controls */}
        <div className="flex flex-col gap-4 rounded-lg border border-white/10 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ServerIcon className="h-4 w-4 text-white/60" /> Server
            </p>
            <p className="mt-0.5 text-xs text-white/50">If the video doesn’t load or buffers, switch servers.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sources.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setServer(i)}
                aria-pressed={server === i}
                className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${
                  server === i ? "bg-brand text-white" : "bg-surface-3 text-white/70 hover:bg-white/15 hover:text-white"
                }`}
              >
                Server {i + 1}
              </button>
            ))}
          </div>
        </div>

        {mediaType === "tv" && (prevEp || nextEp) && (
          <div className="flex gap-3">
            {prevEp && (
              <button
                type="button"
                onClick={() => goTo(prevEp.s, prevEp.e)}
                className="inline-flex items-center gap-2 rounded-md bg-surface-2 px-4 py-2.5 text-sm font-semibold transition hover:bg-surface-3"
              >
                <ChevronLeftIcon className="h-4 w-4" /> S{prevEp.s}:E{prevEp.e}
              </button>
            )}
            {nextEp && (
              <button
                type="button"
                onClick={() => goTo(nextEp.s, nextEp.e)}
                className="ml-auto inline-flex items-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-white/80"
              >
                Next: S{nextEp.s}:E{nextEp.e} <NextIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Title info */}
        {details ? (
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div className="space-y-3">
              <h1 className="brand-font text-3xl font-extrabold md:text-4xl">{title}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/75">
                <Score vote={details.vote_average} />
                {year && <span>{year}</span>}
                <MaturityBadge rating={certification} />
                {length && <span>{length}</span>}
                {mediaType === "tv" && seasons.length > 0 && (
                  <span>{seasons.length} Season{seasons.length > 1 ? "s" : ""}</span>
                )}
                {(details.genres || []).slice(0, 3).map((g) => (
                  <span key={g.id} className="text-white/50">{g.name}</span>
                ))}
              </div>
              <p className="max-w-3xl leading-relaxed text-white/80">{details.overview}</p>
            </div>
            <div className="flex items-center gap-2">
              <ListButton item={item} size="lg" />
              <LikeButton item={item} size="lg" />
              <button
                type="button"
                onClick={() => openModal(item)}
                className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-white/40 px-5 text-sm font-semibold transition hover:border-white"
              >
                <InfoIcon className="h-5 w-5" /> Details
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="h-9 w-1/3 rounded skeleton" />
            <div className="h-4 w-2/3 rounded skeleton" />
          </div>
        )}

        {mediaType === "tv" && seasons.length > 0 && (
          <EpisodeList
            show={item}
            seasons={seasons}
            initialSeason={season}
            activeSeason={season}
            activeEpisode={episode}
            onSelect={(s, e) => goTo(s, e)}
          />
        )}
      </div>

      {details && (
        <div className="pb-10">
          <Row
            key={`${mediaType}-${id}`}
            title="More Like This"
            items={[...(details.recommendations?.results || []), ...(details.similar?.results || [])]
              .filter((t, i, a) => (t.backdrop_path || t.poster_path) && a.findIndex((x) => x.id === t.id) === i)
              .map((t) => ({ ...t, media_type: t.media_type || mediaType }))}
          />
        </div>
      )}
    </div>
  );
}

export function LegacyWatchRedirect() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  useEffect(() => {
    const type = params.get("type") === "tv" ? "tv" : "movie";
    navigate(watchPath({ id, media_type: type }), { replace: true });
  }, [id, params, navigate]);
  return null;
}

export default Watch;
