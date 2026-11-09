import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import EpisodeList from "../components/EpisodeList";
import Row from "../components/Row";
import { LikeButton, ListButton, MaturityBadge, Score } from "../components/ui/Controls";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  InfoIcon,
  NextIcon,
  ReplayIcon,
  ServerIcon,
} from "../components/ui/Icons";
import { useLibrary } from "../context/LibraryContext";
import { useMedia } from "../context/MediaContext";
import useTitleDetails from "../hooks/useTitleDetails";
import {
  formatRuntime,
  getBackdropUrl,
  getFallbackUrls,
  getLogoUrl,
  getTitle,
  getTVEpisodes,
  getYear,
} from "../lib/tmdb";
import { watchPath } from "../lib/routes";

// If a server hasn't loaded after this long, quietly move to the next one.
const SERVER_TIMEOUT_MS = 12000;

// Compact "Server ▾" menu for the top bar.
function ServerMenu({ count, current, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
      >
        <ServerIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Server {current + 1}</span>
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-64 animate-fade-in overflow-hidden rounded-lg border border-white/10 bg-surface/95 py-2 shadow-2xl backdrop-blur-xl"
        >
          <p className="px-4 pb-2 pt-1 text-[0.65rem] font-semibold uppercase tracking-widest text-white/40">Choose a server</p>
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="menuitemradio"
              aria-checked={current === i}
              onClick={() => {
                onChange(i);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-4 py-2 text-left text-sm transition hover:bg-white/[0.06]"
            >
              <span className={current === i ? "font-semibold text-white" : "text-white/75"}>
                Server {i + 1}
                {i === 0 && <span className="ml-2 text-xs text-white/40">Default</span>}
              </span>
              {current === i && <CheckIcon className="h-4 w-4 text-brand-bright" />}
            </button>
          ))}
          <p className="mt-1 border-t border-white/10 px-4 pb-1 pt-2 text-xs leading-relaxed text-white/45">
            Video not playing or buffering? Try another server. Each one streams from a different provider.
          </p>
        </div>
      )}
    </div>
  );
}

// The player, with a cinematic loading screen and automatic server fallback.
function Player({ sources, server, onServerChange, title, subtitle, backdrop, logo }) {
  const [loaded, setLoaded] = useState(false);
  const [overlayGone, setOverlayGone] = useState(false);
  const [note, setNote] = useState(null);
  const [exhausted, setExhausted] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const src = sources[server];

  useEffect(() => {
    setLoaded(false);
    setOverlayGone(false);
    setExhausted(false);
    const timer = setTimeout(() => {
      if (server < sources.length - 1) {
        // The note belongs to the server we switch to, so a manual pick clears it.
        setNote({ server: server + 1, text: `Server ${server + 1} is taking too long. Switching to Server ${server + 2}…` });
        onServerChange(server + 1);
      } else {
        setExhausted(true);
      }
    }, SERVER_TIMEOUT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, reloadKey]);

  const handleLoad = () => {
    // The embed's own player needs a moment to paint after its page loads.
    setTimeout(() => setLoaded(true), 700);
    setTimeout(() => setOverlayGone(true), 1400);
  };

  const status = exhausted
    ? null
    : (note?.server === server && note.text) || (server === 0 ? "Getting your stream ready…" : `Connecting to Server ${server + 1}…`);

  return (
    <div className="relative mx-auto aspect-video w-full max-w-[calc((100svh-4rem)*16/9)] overflow-hidden bg-black">
      <iframe
        key={`${src}-${reloadKey}`}
        src={src}
        title={title || "Player"}
        onLoad={handleLoad}
        className="absolute inset-0 h-full w-full border-0"
        allowFullScreen
        allow="fullscreen *; autoplay *; encrypted-media *; picture-in-picture *"
        referrerPolicy="no-referrer-when-downgrade"
      />

      {!overlayGone && (
        <div
          className={`absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-black transition-opacity duration-700 ${
            loaded ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
          aria-live="polite"
        >
          {backdrop && (
            <img
              src={getBackdropUrl(backdrop)}
              alt=""
              className="absolute inset-0 h-full w-full animate-ken-burns object-cover opacity-35"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.7)_100%)]" />

          <div className="relative flex max-w-lg flex-col items-center px-6 text-center">
            {logo ? (
              <img
                src={getLogoUrl(logo)}
                alt={title}
                className="mb-4 max-h-16 max-w-[70%] animate-fade-in object-contain drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)] sm:max-h-24"
              />
            ) : (
              title && <h2 className="brand-font mb-3 animate-fade-in text-2xl font-extrabold text-shadow sm:text-4xl">{title}</h2>
            )}
            {subtitle && <p className="mb-6 text-sm text-white/70 sm:text-base">{subtitle}</p>}

            {exhausted ? (
              <div className="space-y-4">
                <p className="text-sm text-white/80 sm:text-base">None of the servers are responding right now.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNote(null);
                      if (server === 0) setReloadKey((k) => k + 1);
                      else onServerChange(0);
                    }}
                    className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-white/80"
                  >
                    <ReplayIcon className="h-4 w-4" /> Try again
                  </button>
                </div>
                <p className="text-xs text-white/45">It may be unavailable from every provider, or your connection is slow.</p>
              </div>
            ) : (
              <>
                <div className="h-1 w-48 overflow-hidden rounded-full bg-white/15 sm:w-64">
                  <div className="h-full w-2/5 animate-loading-bar rounded-full bg-gradient-to-r from-brand to-brand-bright" />
                </div>
                <p className="mt-4 min-h-5 text-xs text-white/55 sm:text-sm">{status}</p>
              </>
            )}
          </div>
        </div>
      )}
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
  const { details, error, certification, logoPath } = useTitleDetails(id, mediaType);

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
        <Link to="/" className="rounded-md bg-white px-5 py-2 font-semibold text-black">
          Back to Home
        </Link>
      </div>
    );
  }

  const item = details ? { ...details, media_type: mediaType } : { id, media_type: mediaType };
  const title = details ? getTitle(details) : "";
  const year = details ? getYear(details) : null;
  const length = mediaType === "tv" ? null : formatRuntime(details?.runtime);
  const episodeLabel = mediaType === "tv" ? `S${season}:E${episode}${episodeName ? ` · ${episodeName}` : ""}` : null;

  return (
    <div className="min-h-screen bg-black">
      {/* Top bar */}
      <div className="flex h-16 items-center gap-3 gutter">
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-white/10"
        >
          <ArrowLeftIcon className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="brand-font truncate font-bold md:text-lg">{title || " "}</p>
          {episodeLabel && <p className="truncate text-xs text-white/60 md:text-sm">{episodeLabel}</p>}
        </div>
        <ServerMenu count={sources.length} current={server} onChange={setServer} />
        {nextEp && (
          <button
            type="button"
            onClick={() => goTo(nextEp.s, nextEp.e)}
            className="hidden items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20 sm:inline-flex"
          >
            <NextIcon className="h-4 w-4" /> Next Episode
          </button>
        )}
      </div>

      <Player
        key={`${id}-${season}-${episode}`}
        sources={sources}
        server={server}
        onServerChange={setServer}
        title={title}
        subtitle={episodeLabel || [year, length].filter(Boolean).join(" · ")}
        backdrop={details?.backdrop_path}
        logo={logoPath}
      />

      <div className="mx-auto max-w-6xl space-y-10 py-6 gutter">
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
                  <span>
                    {seasons.length} Season{seasons.length > 1 ? "s" : ""}
                  </span>
                )}
                {(details.genres || []).slice(0, 3).map((g) => (
                  <span key={g.id} className="text-white/50">
                    {g.name}
                  </span>
                ))}
              </div>
              <p className="max-w-3xl leading-relaxed text-white/80">{details.overview}</p>
              <p className="text-xs text-white/40">
                Not playing? Use the <span className="font-semibold text-white/60">Server</span> menu at the top to switch providers.
              </p>
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
