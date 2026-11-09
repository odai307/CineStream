import { useEffect, useState } from "react";
import { useMedia } from "../context/MediaContext";
import { useLibrary } from "../context/LibraryContext";
import useInView from "../hooks/useInView";
import useTitleDetails from "../hooks/useTitleDetails";
import {
  getBackdropUrl,
  getLargeBackdropUrl,
  getLogoUrl,
  getTitle,
  getYear,
  formatRuntime,
  truncate,
} from "../lib/tmdb";
import { resumePath } from "../lib/routes";
import TrailerPlayer from "./TrailerPlayer";
import { CircleButton, MaturityBadge, PrimaryPlay, Score } from "./ui/Controls";
import { InfoIcon, ReplayIcon, VolumeOffIcon, VolumeOnIcon } from "./ui/Icons";

const useDocumentVisible = () => {
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
};

export function HeroSkeleton() {
  return (
    <div className="relative h-[75vh] min-h-[480px] w-full bg-surface md:h-[56.25vw] md:max-h-[92vh]">
      <div className="absolute inset-0 skeleton opacity-40" />
      <div className="absolute bottom-[28%] left-0 w-full space-y-4 gutter">
        <div className="h-14 w-2/3 max-w-md rounded skeleton" />
        <div className="h-4 w-1/2 max-w-sm rounded skeleton" />
        <div className="h-4 w-1/3 max-w-xs rounded skeleton" />
        <div className="flex gap-3 pt-2">
          <div className="h-12 w-32 rounded-md skeleton" />
          <div className="h-12 w-40 rounded-md skeleton" />
        </div>
      </div>
    </div>
  );
}

// Picks a featured title (rotates per visit among the top few) and plays its trailer
// behind the artwork. Pauses when scrolled away, when the tab is hidden, or when a
// preview/modal is playing something else.
function Hero({ fetcher }) {
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
  const { muted, setMuted, openModal, foregroundActive } = useMedia();
  const { getProgress } = useLibrary();
  const [heroRef, inView] = useInView({ once: false, rootMargin: "0px", threshold: 0.3 });
  const docVisible = useDocumentVisible();
  const [trailerState, setTrailerState] = useState("idle"); // idle | playing | ended
  const [calm, setCalm] = useState(false);
  const [replayCount, setReplayCount] = useState(0);

  useEffect(() => {
    let alive = true;
    fetcher()
      .then((list) => {
        if (!alive) return;
        const candidates = list.filter((t) => t.backdrop_path && t.overview).slice(0, 6);
        setItem(candidates[Math.floor(Math.random() * candidates.length)] || list[0] || null);
      })
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [fetcher]);

  const type = item?.media_type === "tv" ? "tv" : "movie";
  const { details, trailerKey, logoPath, certification } = useTitleDetails(item?.id, type, Boolean(item));

  // After the trailer has run a few seconds, fade the synopsis (Netflix "calm" mode).
  useEffect(() => {
    if (trailerState !== "playing") {
      setCalm(false);
      return undefined;
    }
    const t = setTimeout(() => setCalm(true), 5000);
    return () => clearTimeout(t);
  }, [trailerState, replayCount]);

  if (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center px-6 pt-20 text-center">
        <div className="max-w-md space-y-3">
          <p className="brand-font text-2xl font-bold">We couldn’t load the catalog</p>
          <p className="text-sm text-muted">{error}</p>
        </div>
      </div>
    );
  }
  if (!item) return <HeroSkeleton />;

  const merged = { ...item, ...(details || {}), media_type: type };
  const title = getTitle(merged);
  const progress = getProgress(merged);
  const year = getYear(merged);
  const length =
    type === "tv"
      ? details?.number_of_seasons && `${details.number_of_seasons} Season${details.number_of_seasons > 1 ? "s" : ""}`
      : formatRuntime(details?.runtime);
  const playing = inView && docVisible && !foregroundActive && trailerState !== "ended";

  const replay = () => {
    setTrailerState("idle");
    setReplayCount((c) => c + 1);
  };

  return (
    <section
      ref={heroRef}
      className="relative h-[78vh] min-h-[520px] w-full overflow-hidden bg-ink md:h-[56.25vw] md:max-h-[94vh]"
    >
      <picture>
        <source media="(max-width: 767px)" srcSet={getLargeBackdropUrl(merged.backdrop_path)} />
        <img
          src={getBackdropUrl(merged.backdrop_path)}
          alt=""
          className="absolute inset-0 h-full w-full animate-fade-in object-cover object-[center_20%]"
        />
      </picture>

      <TrailerPlayer
        key={`${trailerKey}-${replayCount}`}
        videoKey={trailerKey}
        muted={muted}
        playing={playing}
        startDelay={replayCount ? 0 : 2200}
        onPlaying={() => setTrailerState("playing")}
        onEnded={() => setTrailerState("ended")}
      />

      {/* Legibility gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent md:via-black/10" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-ink via-ink/60 to-transparent" />

      <div className="absolute bottom-[20%] left-0 z-10 w-full gutter md:bottom-[28%]">
        <div className="max-w-[min(90vw,560px)] lg:max-w-[38vw]">
          {logoPath ? (
            <img
              src={getLogoUrl(logoPath)}
              alt={title}
              className={`mb-4 w-auto origin-bottom-left object-contain object-left drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] transition-all duration-1000 ${
                calm ? "max-h-20 max-w-[70%] md:max-h-28" : "max-h-28 max-w-[85%] md:max-h-44"
              }`}
            />
          ) : (
            <h1 className="brand-font mb-4 text-4xl font-extrabold leading-[1.05] tracking-tight text-shadow sm:text-5xl lg:text-6xl">
              {title}
            </h1>
          )}

          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-white/85">
            {type === "tv" && (
              <span className="rounded-sm bg-white/15 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-widest backdrop-blur-sm">
                Series
              </span>
            )}
            <Score vote={merged.vote_average} />
            {year && <span>{year}</span>}
            {length && <span>{length}</span>}
          </div>

          <div
            className={`grid transition-all duration-1000 ${
              calm ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
            }`}
          >
            <p className="overflow-hidden text-sm leading-relaxed text-white/90 text-shadow sm:text-base md:text-lg">
              {truncate(merged.overview, 190)}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <PrimaryPlay to={resumePath(merged, progress)} label={progress ? "Resume" : "Play"} />
            <button
              type="button"
              onClick={() => openModal(merged)}
              className="inline-flex items-center gap-2.5 rounded-md bg-white/25 px-5 py-2.5 text-base font-bold text-white backdrop-blur-md transition hover:bg-white/15 md:px-7 md:py-3 md:text-lg"
            >
              <InfoIcon className="h-6 w-6 md:h-7 md:w-7" />
              More Info
            </button>
          </div>
        </div>
      </div>

      {/* Right rail: mute / replay + maturity rating */}
      <div className="absolute bottom-[20%] right-0 z-10 flex items-center gap-3 md:bottom-[28%]">
        {trailerKey &&
          (trailerState === "ended" ? (
            <CircleButton label="Replay trailer" size="lg" onClick={replay}>
              <ReplayIcon />
            </CircleButton>
          ) : (
            <CircleButton label={muted ? "Unmute" : "Mute"} size="lg" onClick={() => setMuted((m) => !m)}>
              {muted ? <VolumeOffIcon /> : <VolumeOnIcon />}
            </CircleButton>
          ))}
        {certification && (
          <span className="border-l-[3px] border-white/80 bg-black/40 py-1.5 pl-3 pr-[max(24px,5vw)] text-sm font-medium backdrop-blur-sm">
            <MaturityBadge rating={certification} className="!border-0 !p-0 !text-sm" />
          </span>
        )}
      </div>
    </section>
  );
}

export default Hero;
