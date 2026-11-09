import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMedia } from "../context/MediaContext";
import { useLibrary } from "../context/LibraryContext";
import { getCardBackdropUrl, getSmallPosterUrl, getTitle, isNewRelease } from "../lib/tmdb";
import { resumePath } from "../lib/routes";
import { CloseIcon, PlayIcon } from "./ui/Icons";

const HOVER_DELAY = 550;

const canHover = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

// Shared hover-intent logic: after a short pause, hand the card's page-space rect
// to the global preview popup (which renders above everything, like Netflix).
function useHoverPreview(item) {
  const ref = useRef(null);
  const timer = useRef(null);
  const { openPreview } = useMedia();

  useEffect(() => () => clearTimeout(timer.current), []);

  const onMouseEnter = () => {
    if (!canHover()) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const node = ref.current;
      if (!node) return;
      const r = node.getBoundingClientRect();
      openPreview(item, {
        top: r.top + window.scrollY,
        left: r.left + window.scrollX,
        width: r.width,
        height: r.height,
      });
    }, HOVER_DELAY);
  };

  const onMouseLeave = () => clearTimeout(timer.current);

  return { ref, onMouseEnter, onMouseLeave };
}

function CardImage({ src, alt, className = "" }) {
  const [loaded, setLoaded] = useState(false);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
        loaded ? "opacity-100" : "opacity-0"
      } ${className}`}
    />
  );
}

function TitleCard({ item, variant = "landscape", rank }) {
  const { openModal } = useMedia();
  const hover = useHoverPreview(item);
  const title = getTitle(item);

  if (variant === "top10") {
    return (
      <button
        type="button"
        ref={hover.ref}
        onMouseEnter={hover.onMouseEnter}
        onMouseLeave={hover.onMouseLeave}
        onClick={() => openModal(item)}
        aria-label={`${rank}. ${title}`}
        className="group relative flex aspect-[1.45/1] w-full items-stretch text-left"
      >
        <svg viewBox="0 0 100 140" className="h-full w-[48%] shrink-0" aria-hidden>
          <text
            x="100"
            y="128"
            textAnchor="end"
            className="brand-font"
            fontSize={rank >= 10 ? 112 : 150}
            fontWeight="800"
            letterSpacing={rank >= 10 ? -14 : 0}
            fill="#07070a"
            stroke="#5b5b66"
            strokeWidth="3"
          >
            {rank}
          </text>
        </svg>
        <div className="relative -ml-[4%] h-full w-[56%] overflow-hidden rounded-md bg-surface-2 skeleton">
          <CardImage src={getSmallPosterUrl(item.poster_path)} alt={title} />
        </div>
      </button>
    );
  }

  const backdrop = getCardBackdropUrl(item.backdrop_path) || getSmallPosterUrl(item.poster_path);
  const fresh = isNewRelease(item);

  return (
    <button
      type="button"
      ref={hover.ref}
      onMouseEnter={hover.onMouseEnter}
      onMouseLeave={hover.onMouseLeave}
      onClick={() => openModal(item)}
      aria-label={title}
      className="group relative block aspect-video w-full overflow-hidden rounded-md bg-surface-2 text-left ring-white/0 transition duration-300 skeleton hover:ring-2 hover:ring-white/70 focus-visible:ring-2 focus-visible:ring-white"
    >
      <CardImage src={backdrop} alt={title} className="transition-transform duration-500 group-hover:scale-105" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-2.5 md:p-3">
        <p className="brand-font line-clamp-2 text-sm font-bold leading-tight text-shadow md:text-[0.95rem]">
          {title}
        </p>
      </div>
      {fresh && (
        <span className="absolute left-0 top-2 rounded-r-sm bg-brand px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-on-brand">
          New
        </span>
      )}
      {item.media_type === "tv" && (
        <span className="absolute right-2 top-2 rounded-sm bg-black/60 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm">
          Series
        </span>
      )}
    </button>
  );
}

// "Continue Watching" card: resumes straight into the player.
export function ContinueCard({ item }) {
  const navigate = useNavigate();
  const { removeFromHistory } = useLibrary();
  const hover = useHoverPreview(item);
  const title = getTitle(item);
  const backdrop = getCardBackdropUrl(item.backdrop_path) || getSmallPosterUrl(item.poster_path);
  const episodeLabel =
    item.media_type === "tv" && item.season ? `S${item.season}:E${item.episode}` : null;

  return (
    <div className="group relative" ref={hover.ref} onMouseEnter={hover.onMouseEnter} onMouseLeave={hover.onMouseLeave}>
      <button
        type="button"
        onClick={() => navigate(resumePath(item, item))}
        aria-label={`Resume ${title}`}
        className="relative block aspect-video w-full overflow-hidden rounded-md bg-surface-2 text-left skeleton"
      >
        <CardImage src={backdrop} alt={title} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 bg-black/50 opacity-90 backdrop-blur-sm transition group-hover:scale-110 group-hover:bg-brand group-hover:border-brand group-hover:text-on-brand">
          <PlayIcon className="h-5 w-5 translate-x-px" />
        </span>
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <p className="brand-font truncate text-sm font-bold text-shadow">{title}</p>
          {episodeLabel && (
            <p className="truncate text-xs text-white/70">
              {episodeLabel}
              {item.episodeName ? ` · ${item.episodeName}` : ""}
            </p>
          )}
        </div>
      </button>
      <button
        type="button"
        onClick={() => removeFromHistory(item)}
        aria-label={`Remove ${title} from Continue Watching`}
        title="Remove from row"
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white/80 opacity-0 transition hover:text-white group-hover:opacity-100 focus-visible:opacity-100"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export default TitleCard;
