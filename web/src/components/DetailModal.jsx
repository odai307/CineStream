import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useMedia } from "../context/MediaContext";
import { useLibrary } from "../context/LibraryContext";
import useTitleDetails from "../hooks/useTitleDetails";
import {
  formatRuntime,
  getBackdropUrl,
  getCardBackdropUrl,
  getLogoUrl,
  getProfileUrl,
  getTitle,
  getYear,
  truncate,
} from "../lib/tmdb";
import { genrePath, resumePath } from "../lib/routes";
import TrailerPlayer from "./TrailerPlayer";
import TrailerTheater from "./TrailerTheater";
import EpisodeList from "./EpisodeList";
import {
  CircleButton,
  HDBadge,
  LikeButton,
  ListButton,
  MaturityBadge,
  PrimaryPlay,
  Score,
} from "./ui/Controls";
import { CheckIcon, CloseIcon, FilmIcon, PlayIcon, ReplayIcon, ShareIcon, VolumeOffIcon, VolumeOnIcon } from "./ui/Icons";

function SimilarCard({ item }) {
  const { openModal } = useMedia();
  const title = getTitle(item);
  return (
    <div className="overflow-hidden rounded-md bg-surface-2 transition hover:bg-surface-3">
      <button
        type="button"
        onClick={() => openModal(item)}
        className="group relative block aspect-video w-full overflow-hidden bg-surface-3"
        aria-label={title}
      >
        {(item.backdrop_path || item.poster_path) && (
          <img
            src={getCardBackdropUrl(item.backdrop_path || item.poster_path)}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <p className="brand-font absolute bottom-2 left-3 right-3 truncate text-left text-sm font-bold">{title}</p>
        <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/50 opacity-0 transition group-hover:opacity-100">
          <PlayIcon className="h-5 w-5 translate-x-px" />
        </span>
      </button>
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/80">
            <Score vote={item.vote_average} />
            {getYear(item) && <span>{getYear(item)}</span>}
          </div>
          <ListButton item={item} size="sm" />
        </div>
        <p className="line-clamp-4 text-xs leading-relaxed text-white/65">{item.overview || "No description available."}</p>
      </div>
    </div>
  );
}

function ShareButton({ title }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // dismissed
    }
  };
  return (
    <CircleButton label={copied ? "Link copied" : "Share"} onClick={share}>
      {copied ? <CheckIcon /> : <ShareIcon />}
    </CircleButton>
  );
}

function ModalContent({ id, mediaType, onClose, onRetry }) {
  const { muted, setMuted } = useMedia();
  const { getProgress } = useLibrary();
  const { details, loading, error, trailerKey, logoPath, certification } = useTitleDetails(id, mediaType);
  const [trailerState, setTrailerState] = useState("idle");
  const [replay, setReplay] = useState(0);
  const [showAllSimilar, setShowAllSimilar] = useState(false);
  const [theaterOpen, setTheaterOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    if (details) document.title = `${getTitle(details)} · CineStream`;
  }, [details]);

  if (error) {
    return (
      <div className="relative p-12 text-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 transition hover:bg-white/20"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
        <p className="brand-font text-lg font-bold">Couldn’t load this title</p>
        <p className="mt-2 text-sm text-red-400">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-md bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/80"
        >
          Try again
        </button>
      </div>
    );
  }

  if (loading || !details) {
    return (
      <div>
        <div className="aspect-video w-full skeleton" />
        <div className="space-y-3 p-8">
          <div className="h-6 w-1/3 rounded skeleton" />
          <div className="h-4 w-full rounded skeleton" />
          <div className="h-4 w-4/5 rounded skeleton" />
        </div>
      </div>
    );
  }

  const item = { ...details, media_type: mediaType };
  const title = getTitle(item);
  const year = getYear(item);
  const progress = getProgress(item);
  const isTV = mediaType === "tv";
  const seasons = (details.seasons || []).filter((s) => s.season_number > 0 && s.episode_count > 0);
  const cast = details.credits?.cast || [];
  const crew = details.credits?.crew || [];
  const directors = isTV
    ? (details.created_by || []).map((p) => p.name)
    : crew.filter((p) => p.job === "Director").map((p) => p.name);
  const writers = crew
    .filter((p) => ["Screenplay", "Writer", "Novel"].includes(p.job))
    .map((p) => p.name)
    .filter((n, i, a) => a.indexOf(n) === i)
    .slice(0, 4);
  const similar = [
    ...(details.recommendations?.results || []),
    ...(details.similar?.results || []),
  ]
    .filter((t, i, a) => (t.backdrop_path || t.poster_path) && a.findIndex((x) => x.id === t.id) === i)
    .map((t) => ({ ...t, media_type: t.media_type || mediaType }))
    .slice(0, 18);
  const length = isTV
    ? `${seasons.length} Season${seasons.length === 1 ? "" : "s"}`
    : formatRuntime(details.runtime);
  const playLabel = progress ? (isTV && progress.season ? `Resume S${progress.season}:E${progress.episode}` : "Resume") : "Play";

  return (
    <div ref={panelRef} tabIndex={-1} className="outline-none">
      <TrailerTheater open={theaterOpen} videoKey={trailerKey} title={title} onClose={() => setTheaterOpen(false)} />
      {/* Header with trailer */}
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {details.backdrop_path && (
          <img src={getBackdropUrl(details.backdrop_path)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <TrailerPlayer
          key={`${trailerKey}-${replay}`}
          videoKey={trailerKey}
          muted={muted}
          playing={!theaterOpen}
          startDelay={replay ? 0 : 700}
          onPlaying={() => setTrailerState("playing")}
          onEnded={() => setTrailerState("ended")}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/10 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-white transition hover:bg-surface-3"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <div className="absolute bottom-[8%] left-0 right-0 flex items-end justify-between gap-4 px-5 sm:px-10">
          <div className="min-w-0 max-w-[70%]">
            {logoPath ? (
              <img
                src={getLogoUrl(logoPath)}
                alt={title}
                className="mb-4 max-h-16 max-w-full object-contain object-left drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] sm:mb-6 sm:max-h-28"
              />
            ) : (
              <h2 className="brand-font mb-4 text-2xl font-extrabold leading-tight text-shadow sm:mb-6 sm:text-4xl">{title}</h2>
            )}
            <div className="flex items-center gap-2">
              <PrimaryPlay to={resumePath(item, progress)} label={playLabel} className="!py-2 !text-base" />
              <ListButton item={item} />
              <LikeButton item={item} />
              {trailerKey && (
                <CircleButton label="Watch trailer" onClick={() => setTheaterOpen(true)}>
                  <FilmIcon />
                </CircleButton>
              )}
              <span className="hidden sm:inline-flex">
                <ShareButton title={title} />
              </span>
            </div>
          </div>
          {trailerKey &&
            (trailerState === "ended" ? (
              <CircleButton label="Replay trailer" onClick={() => { setTrailerState("idle"); setReplay((r) => r + 1); }}>
                <ReplayIcon />
              </CircleButton>
            ) : (
              <CircleButton label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((m) => !m)}>
                {muted ? <VolumeOffIcon /> : <VolumeOnIcon />}
              </CircleButton>
            ))}
        </div>
      </div>

      {/* Body */}
      <div className="space-y-10 px-5 pb-10 pt-2 sm:px-10">
        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:gap-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-white/80">
              <Score vote={details.vote_average} />
              {year && <span>{year}</span>}
              <MaturityBadge rating={certification} />
              {length && <span>{length}</span>}
              <HDBadge />
            </div>
            {details.tagline && <p className="text-sm italic text-white/60">“{details.tagline}”</p>}
            <p className="leading-relaxed text-white/90">{details.overview || "No description available."}</p>
          </div>
          <div className="space-y-3 text-sm">
            {cast.length > 0 && (
              <p>
                <span className="text-white/50">Cast: </span>
                {cast.slice(0, 4).map((p) => p.name).join(", ")}
                {cast.length > 4 && (
                  <a href="#about" className="italic text-white/70 hover:underline">, more</a>
                )}
              </p>
            )}
            {details.genres?.length > 0 && (
              <p>
                <span className="text-white/50">Genres: </span>
                {details.genres.map((g, i) => (
                  <span key={g.id}>
                    {i > 0 && ", "}
                    <Link to={genrePath(g, mediaType)} className="hover:underline">{g.name}</Link>
                  </span>
                ))}
              </p>
            )}
            {directors.length > 0 && (
              <p>
                <span className="text-white/50">{isTV ? "Creators" : "Director"}: </span>
                {directors.join(", ")}
              </p>
            )}
          </div>
        </div>

        {isTV && seasons.length > 0 && (
          <EpisodeList
            show={item}
            seasons={seasons}
            initialSeason={progress?.season || seasons[0].season_number}
            activeSeason={progress?.season}
            activeEpisode={progress?.episode}
          />
        )}

        {similar.length > 0 && (
          <section>
            <h3 className="brand-font mb-4 text-xl font-bold md:text-2xl">More Like This</h3>
            <div className="relative">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {(showAllSimilar ? similar : similar.slice(0, 9)).map((t) => (
                  <SimilarCard key={`${t.media_type}-${t.id}`} item={t} />
                ))}
              </div>
              {similar.length > 9 && (
                <div className={`flex justify-center ${showAllSimilar ? "mt-6" : "absolute inset-x-0 bottom-0 h-40 items-end bg-gradient-to-t from-surface to-transparent"}`}>
                  <CircleButton
                    label={showAllSimilar ? "Show less" : "Show more"}
                    className={showAllSimilar ? "rotate-180" : ""}
                    onClick={() => setShowAllSimilar((s) => !s)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
                  </CircleButton>
                </div>
              )}
            </div>
          </section>
        )}

        <section id="about" className="space-y-6 border-t border-white/10 pt-8">
          <h3 className="brand-font text-xl md:text-2xl">
            <span className="text-white/60">About </span>
            <span className="font-bold">{title}</span>
          </h3>

          {cast.length > 0 && (
            <div className="scrollbar-hide -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
              {cast.slice(0, 14).map((p) => (
                <div key={p.credit_id} className="w-24 shrink-0 text-center">
                  <div className="mx-auto mb-2 h-24 w-24 overflow-hidden rounded-full bg-surface-3">
                    {p.profile_path && (
                      <img src={getProfileUrl(p.profile_path)} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <p className="truncate text-xs font-semibold">{p.name}</p>
                  <p className="truncate text-[0.7rem] text-white/50">{p.character}</p>
                </div>
              ))}
            </div>
          )}

          <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {directors.length > 0 && (
              <div><dt className="inline text-white/50">{isTV ? "Creators" : "Director"}: </dt><dd className="inline">{directors.join(", ")}</dd></div>
            )}
            {writers.length > 0 && (
              <div><dt className="inline text-white/50">Writers: </dt><dd className="inline">{writers.join(", ")}</dd></div>
            )}
            {details.genres?.length > 0 && (
              <div><dt className="inline text-white/50">Genres: </dt><dd className="inline">{details.genres.map((g) => g.name).join(", ")}</dd></div>
            )}
            {(details.release_date || details.first_air_date) && (
              <div>
                <dt className="inline text-white/50">{isTV ? "First aired" : "Released"}: </dt>
                <dd className="inline">
                  {new Date(details.release_date || details.first_air_date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                </dd>
              </div>
            )}
            {details.spoken_languages?.length > 0 && (
              <div><dt className="inline text-white/50">Languages: </dt><dd className="inline">{details.spoken_languages.map((l) => l.english_name).join(", ")}</dd></div>
            )}
            {certification && (
              <div className="flex items-center gap-2"><dt className="text-white/50">Maturity rating:</dt><dd><MaturityBadge rating={certification} /></dd></div>
            )}
            {details.networks?.length > 0 && (
              <div><dt className="inline text-white/50">Network: </dt><dd className="inline">{details.networks.map((n) => n.name).join(", ")}</dd></div>
            )}
            {details.production_companies?.length > 0 && (
              <div><dt className="inline text-white/50">Studios: </dt><dd className="inline">{truncate(details.production_companies.map((c) => c.name).join(", "), 90)}</dd></div>
            )}
          </dl>
        </section>
      </div>
    </div>
  );
}

function DetailModal() {
  const { modal, closeModal } = useMedia();
  const scrollRef = useRef(null);
  const [attempt, setAttempt] = useState(0);
  const isOpen = Boolean(modal);

  useEffect(() => {
    if (!isOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    const prevTitle = document.title;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && closeModal();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.title = prevTitle;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, closeModal]);

  // Switching titles inside the modal starts at the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [modal?.id]);

  if (!modal) return null;

  return createPortal(
    <div
      ref={scrollRef}
      className="fixed inset-0 z-[70] animate-fade-in overflow-y-auto bg-black/75 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && closeModal()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative mx-auto my-0 min-h-full w-full max-w-[880px] animate-modal-in overflow-hidden bg-surface shadow-2xl sm:my-8 sm:min-h-0 sm:w-[94vw] sm:rounded-xl"
      >
        <ModalContent
          key={`${modal.mediaType}-${modal.id}-${attempt}`}
          id={modal.id}
          mediaType={modal.mediaType}
          onClose={closeModal}
          onRetry={() => setAttempt((a) => a + 1)}
        />
      </div>
    </div>,
    document.body
  );
}

export default DetailModal;
