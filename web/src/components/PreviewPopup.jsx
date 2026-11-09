import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useMedia } from "../context/MediaContext";
import { useLibrary } from "../context/LibraryContext";
import useTitleDetails from "../hooks/useTitleDetails";
import {
  formatRuntime,
  getCardBackdropUrl,
  getLogoUrl,
  getTitle,
  getYear,
} from "../lib/tmdb";
import { resumePath } from "../lib/routes";
import TrailerPlayer from "./TrailerPlayer";
import {
  CircleButton,
  HDBadge,
  LikeButton,
  ListButton,
  MaturityBadge,
  MuteButton,
  PlayButton,
  Score,
} from "./ui/Controls";
import { ChevronDownIcon } from "./ui/Icons";

const SCALE = 1.5;
const MIN_WIDTH = 330;
const EDGE = 12;
const NAV_HEIGHT = 72;

function computeLayout(rect) {
  const viewportWidth = document.documentElement.clientWidth;
  const width = Math.min(Math.max(rect.width * SCALE, MIN_WIDTH), viewportWidth - EDGE * 2);
  const mediaHeight = (width * 9) / 16;

  const minLeft = window.scrollX + EDGE;
  const maxLeft = window.scrollX + viewportWidth - width - EDGE;
  const left = Math.min(Math.max(rect.left + rect.width / 2 - width / 2, minLeft), maxLeft);
  const top = Math.max(rect.top + rect.height / 2 - mediaHeight / 2 - 8, window.scrollY + NAV_HEIGHT);

  return {
    width,
    left,
    top,
    // Grow out of the card itself.
    originX: rect.left + rect.width / 2 - left,
    originY: rect.top + rect.height / 2 - top,
    fromScale: rect.width / width,
  };
}

function PreviewCard({ item, rect, onClose }) {
  const ref = useRef(null);
  const { muted, openModal } = useMedia();
  const { getProgress } = useLibrary();
  const type = item.media_type === "tv" ? "tv" : "movie";
  const { details, trailerKey, logoPath, certification } = useTitleDetails(item.id, type);
  const [layout] = useState(() => computeLayout(rect));
  const [trailerOn, setTrailerOn] = useState(false);
  const [closing, setClosing] = useState(false);

  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 160);
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  // Close as soon as the pointer is anywhere outside the popup.
  useEffect(() => {
    const onMove = (e) => {
      if (ref.current && !ref.current.contains(e.target)) closeRef.current();
    };
    const onLeaveWindow = (e) => {
      if (!e.relatedTarget) closeRef.current();
    };
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    const onResize = () => closeRef.current();
    window.addEventListener("pointermove", onMove);
    document.addEventListener("mouseout", onLeaveWindow);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseout", onLeaveWindow);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const merged = { ...item, ...(details || {}), media_type: type };
  const title = getTitle(merged);
  const year = getYear(merged);
  const length =
    type === "tv"
      ? details?.number_of_seasons
        ? `${details.number_of_seasons} Season${details.number_of_seasons > 1 ? "s" : ""}`
        : null
      : formatRuntime(details?.runtime);
  const genres = (details?.genres || []).slice(0, 3).map((g) => g.name);
  const progress = getProgress(merged);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`${title} preview`}
      style={{
        top: layout.top,
        left: layout.left,
        width: layout.width,
        "--from-scale": layout.fromScale,
        transformOrigin: `${layout.originX}px ${layout.originY}px`,
      }}
      className={`absolute z-[60] overflow-hidden rounded-lg bg-surface shadow-[0_18px_60px_rgba(0,0,0,0.75)] ring-1 ring-white/10 ${
        closing ? "scale-95 opacity-0 transition duration-150" : "animate-pop-in"
      }`}
    >
      <div className="relative">
      <button
        type="button"
        onClick={() => openModal(merged)}
        aria-label={`More info about ${title}`}
        className="relative block aspect-video w-full overflow-hidden bg-surface-2"
      >
        {merged.backdrop_path && (
          <img
            src={getCardBackdropUrl(merged.backdrop_path)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <TrailerPlayer
          videoKey={trailerKey}
          muted={muted}
          loop
          startDelay={350}
          onPlaying={() => setTrailerOn(true)}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-surface via-surface/30 to-transparent" />
        <div className="absolute bottom-3 left-4 right-16">
          {logoPath ? (
            <img
              src={getLogoUrl(logoPath)}
              alt={title}
              className={`max-h-12 max-w-[60%] object-contain object-left drop-shadow-lg transition-all duration-700 ${
                trailerOn ? "max-h-9 opacity-90" : ""
              }`}
            />
          ) : (
            <p className="brand-font line-clamp-2 text-lg font-extrabold leading-tight text-shadow">{title}</p>
          )}
        </div>
      </button>
      {trailerKey && <MuteButton size="sm" className="absolute bottom-3 right-3" />}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <PlayButton to={resumePath(merged, progress)} label={progress ? "Resume" : "Play"} />
          <ListButton item={merged} />
          <LikeButton item={merged} />
          <CircleButton label="More info" className="ml-auto" onClick={() => openModal(merged)}>
            <ChevronDownIcon />
          </CircleButton>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/80">
          <Score vote={merged.vote_average} />
          <MaturityBadge rating={certification} />
          {year && <span>{year}</span>}
          {length && <span>{length}</span>}
          <HDBadge />
        </div>

        {progress?.season && (
          <p className="text-xs text-white/60">
            Continue S{progress.season}:E{progress.episode}
          </p>
        )}

        {genres.length > 0 && (
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-white/90">
            {genres.map((g, i) => (
              <span key={g} className="inline-flex items-center gap-1.5">
                {i > 0 && <span className="text-white/35">•</span>}
                {g}
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}

function PreviewPopup() {
  const { preview, closePreview } = useMedia();
  const location = useLocation();

  // Navigating anywhere dismisses the popup.
  useEffect(() => {
    closePreview();
  }, [location.pathname, closePreview]);

  if (!preview) return null;
  return createPortal(
    <PreviewCard key={preview.id} item={preview.item} rect={preview.rect} onClose={closePreview} />,
    document.body
  );
}

export default PreviewPopup;
