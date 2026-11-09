import { Link } from "react-router-dom";
import { useLibrary } from "../../context/LibraryContext";
import { useMedia } from "../../context/MediaContext";
import {
  CheckIcon,
  PlayIcon,
  PlusIcon,
  StarIcon,
  ThumbUpIcon,
  VolumeOffIcon,
  VolumeOnIcon,
} from "./Icons";

export function Logo({ className = "" }) {
  return (
    <span className={`brand-font inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <svg viewBox="0 0 64 64" className="h-[1.35em] w-[1.35em]" aria-hidden>
        <defs>
          <linearGradient id="cs-logo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffc14d" />
            <stop offset="1" stopColor="#c97d0a" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="url(#cs-logo)" />
        <path d="M25 19.5v25a1.5 1.5 0 0 0 2.3 1.27l19.6-12.5a1.5 1.5 0 0 0 0-2.54L27.3 18.23A1.5 1.5 0 0 0 25 19.5Z" fill="#140f04" />
      </svg>
      <span>
        Cine<span className="text-brand-bright">Stream</span>
      </span>
    </span>
  );
}

const circleBase =
  "inline-flex shrink-0 items-center justify-center rounded-full border-2 transition duration-200 focus-visible:outline-offset-2";

const circleSizes = {
  sm: "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4",
  md: "h-10 w-10 [&_svg]:h-5 [&_svg]:w-5",
  lg: "h-12 w-12 [&_svg]:h-6 [&_svg]:w-6",
};

export function CircleButton({ label, size = "md", className = "", children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`${circleBase} ${circleSizes[size]} border-white/40 bg-black/40 text-white backdrop-blur-sm hover:border-white hover:bg-white/10 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function PlayButton({ to, size = "md", label = "Play", className = "", onClick }) {
  const sizes = {
    sm: "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4",
    md: "h-10 w-10 [&_svg]:h-5 [&_svg]:w-5",
  };
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`${circleBase} ${sizes[size]} border-white bg-white text-black hover:bg-white/80 ${className}`}
    >
      <PlayIcon className="translate-x-px" />
    </Link>
  );
}

export function PrimaryPlay({ to, label = "Play", className = "" }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2.5 rounded-md bg-white px-5 py-2.5 text-base font-bold text-black shadow-lg shadow-black/20 transition hover:bg-white/80 md:px-7 md:py-3 md:text-lg ${className}`}
    >
      <PlayIcon className="h-6 w-6 md:h-7 md:w-7" />
      {label}
    </Link>
  );
}

export function ListButton({ item, size = "md", className = "" }) {
  const { isInList, toggleList } = useLibrary();
  const added = isInList(item);
  return (
    <CircleButton
      size={size}
      label={added ? "Remove from My List" : "Add to My List"}
      aria-pressed={added}
      onClick={(e) => {
        e.stopPropagation();
        toggleList(item);
      }}
      className={className}
    >
      {added ? <CheckIcon /> : <PlusIcon />}
    </CircleButton>
  );
}

export function LikeButton({ item, size = "md", className = "" }) {
  const { isLiked, toggleLike } = useLibrary();
  const liked = isLiked(item);
  return (
    <CircleButton
      size={size}
      label={liked ? "Rated: I like this" : "I like this"}
      aria-pressed={liked}
      onClick={(e) => {
        e.stopPropagation();
        toggleLike(item);
      }}
      className={`${liked ? "!border-white" : ""} ${className}`}
    >
      <ThumbUpIcon filled={liked} />
    </CircleButton>
  );
}

export function MuteButton({ size = "md", className = "" }) {
  const { muted, setMuted } = useMedia();
  return (
    <CircleButton
      size={size}
      label={muted ? "Unmute" : "Mute"}
      onClick={(e) => {
        e.stopPropagation();
        setMuted((m) => !m);
      }}
      className={className}
    >
      {muted ? <VolumeOffIcon /> : <VolumeOnIcon />}
    </CircleButton>
  );
}

export function MaturityBadge({ rating, className = "" }) {
  if (!rating) return null;
  return (
    <span
      className={`inline-flex items-center rounded-[3px] border border-white/40 px-1.5 text-[0.7rem] font-semibold leading-5 text-white/85 ${className}`}
    >
      {rating}
    </span>
  );
}

export function HDBadge() {
  return (
    <span className="rounded-[3px] border border-white/40 px-1 text-[0.6rem] font-bold leading-4 text-white/80">
      HD
    </span>
  );
}

// TMDB community score, e.g. "★ 7.8".
export function Score({ vote, className = "" }) {
  if (!vote) return null;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold text-white/90 ${className}`} title="TMDB score">
      <StarIcon className="h-3.5 w-3.5 text-brand" />
      {vote.toFixed(1)}
    </span>
  );
}
