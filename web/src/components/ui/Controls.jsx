import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useLibrary } from "../../context/LibraryContext";
import { useMedia } from "../../context/MediaContext";
import { useToast } from "../../context/ToastContext";
import { readJSON, writeJSON } from "../../lib/storage";
import * as tmdb from "../../lib/tmdb";
import {
  CheckIcon,
  CloseIcon,
  DownloadIcon,
  PlayIcon,
  PlusIcon,
  ServerIcon,
  StarIcon,
  ThumbUpIcon,
  VolumeOffIcon,
  VolumeOnIcon,
} from "./Icons";

const DOWNLOADS_KEY = "cinestream:downloads";

const buildDownloadSources = (tmdbId, mediaType = "movie", season = 1, episode = 1) => {
  if (typeof tmdb.getDownloadSources === "function") {
    return tmdb.getDownloadSources(tmdbId, mediaType, season, episode);
  }
  if (mediaType === "tv") {
    return [
      {
        name: "Server 1 · MultiEmbed Direct",
        quality: "1080p / 720p",
        url: `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`,
      },
      {
        name: "Server 2 · VidLink Pro",
        quality: "1080p HD",
        url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`,
      },
      {
        name: "Server 3 · VidSrc CC",
        quality: "1080p HD",
        url: `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`,
      },
      {
        name: "Server 4 · VidSrc ME",
        quality: "HD",
        url: `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
      },
    ];
  }
  return [
    {
      name: "Server 1 · MultiEmbed Direct",
      quality: "1080p / 720p",
      url: `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1`,
    },
    {
      name: "Server 2 · VidLink Pro",
      quality: "1080p HD",
      url: `https://vidlink.pro/movie/${tmdbId}`,
    },
    {
      name: "Server 3 · VidSrc CC",
      quality: "1080p HD",
      url: `https://vidsrc.cc/v2/embed/movie/${tmdbId}`,
    },
    {
      name: "Server 4 · VidSrc ME",
      quality: "HD",
      url: `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`,
    },
  ];
};

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

function triggerLocalPlayerDownload({ title, epSuffix, quality, sources }) {
  const safeName = `${title}${epSuffix}`
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .trim()
    .slice(0, 80);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}${epSuffix} (${quality}) · CineStream</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #07070a; color: #fff; font-family: system-ui, -apple-system, sans-serif; min-height: 100vh; display: flex; flex-direction: column; }
  header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 20px; background: #131318; border-bottom: 1px solid rgba(255,255,255,0.08); flex-wrap: wrap; }
  .brand { font-weight: 800; font-size: 18px; }
  .brand span { color: #ffc14d; }
  .title { font-weight: 700; font-size: 15px; color: rgba(255,255,255,0.9); }
  .servers { display: flex; gap: 6px; flex-wrap: wrap; }
  button { background: #1b1b22; color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
  button.active { background: #f5a524; color: #140f04; border-color: #f5a524; }
  iframe { flex: 1; width: 100%; border: 0; background: #000; }
</style>
</head>
<body>
<header>
  <div class="brand">Cine<span>Stream</span></div>
  <div class="title">${title}${epSuffix} · ${quality}</div>
  <div class="servers" id="servers"></div>
</header>
<iframe id="player" allowfullscreen allow="fullscreen *; autoplay *; encrypted-media *; picture-in-picture *"></iframe>
<script>
  const sources = ${JSON.stringify(sources)};
  const frame = document.getElementById("player");
  const wrap = document.getElementById("servers");
  function select(idx) {
    frame.src = sources[idx].url;
    [...wrap.children].forEach((b, i) => b.classList.toggle("active", i === idx));
  }
  sources.forEach((s, i) => {
    const btn = document.createElement("button");
    btn.textContent = s.name;
    btn.onclick = () => select(i);
    wrap.appendChild(btn);
  });
  select(0);
</script>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `${safeName || "CineStream"} (${quality}).html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}

export function DownloadButton({
  item,
  season = 1,
  episode = 1,
  size = "md",
  variant = "circle",
  label,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [quality, setQuality] = useState("1080p Full HD");
  const [progress, setProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();

  const mediaType = item?.media_type === "tv" ? "tv" : "movie";
  const dlKey = item?.id ? `${mediaType}-${item.id}-${mediaType === "tv" ? `${season}-${episode}` : "movie"}` : "";
  const [downloaded, setDownloaded] = useState(() => Boolean(dlKey && readJSON(DOWNLOADS_KEY, {})[dlKey]));

  useEffect(() => {
    setDownloaded(Boolean(dlKey && readJSON(DOWNLOADS_KEY, {})[dlKey]));
  }, [dlKey]);

  if (!item?.id) return null;

  const sources = buildDownloadSources(item.id, mediaType, season, episode);
  const title = tmdb.getTitle ? tmdb.getTitle(item) : item.title || item.name || "Title";
  const epSuffix = mediaType === "tv" ? ` · S${season}:E${episode}` : "";
  const ariaLabel = label || (downloaded ? `Downloaded: ${title}${epSuffix}` : `Download ${title}${epSuffix}`);

  const startDownload = () => {
    if (downloading) return;
    setDownloading(true);
    setProgress(12);
    const step1 = setTimeout(() => setProgress(48), 250);
    const step2 = setTimeout(() => setProgress(84), 520);
    const step3 = setTimeout(() => {
      setProgress(100);
      setDownloading(false);
      setDownloaded(true);
      const saved = readJSON(DOWNLOADS_KEY, {});
      writeJSON(DOWNLOADS_KEY, {
        ...saved,
        [dlKey]: { id: item.id, mediaType, title, season, episode, quality, savedAt: Date.now() },
      });
      triggerLocalPlayerDownload({ title, epSuffix, quality, sources });
      toast(`Downloaded "${title}${epSuffix}" (${quality})`, { tone: "success" });
    }, 800);
    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
    };
  };

  const openDialog = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  let trigger;
  if (variant === "pill") {
    trigger = (
      <button
        type="button"
        onClick={openDialog}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={`inline-flex h-12 items-center gap-2 rounded-full border-2 px-5 text-sm font-semibold transition ${
          downloaded
            ? "border-brand bg-brand/15 text-brand-bright hover:bg-brand/25"
            : "border-white/40 text-white hover:border-white hover:bg-white/10"
        } ${className}`}
      >
        {downloaded ? <CheckIcon className="h-5 w-5" /> : <DownloadIcon className="h-5 w-5" />}
        <span>
          {label ||
            (downloaded
              ? mediaType === "tv"
                ? `Downloaded S${season}:E${episode}`
                : "Downloaded"
              : mediaType === "tv"
              ? `Download S${season}:E${episode}`
              : "Download")}
        </span>
      </button>
    );
  } else if (variant === "topbar") {
    trigger = (
      <button
        type="button"
        onClick={openDialog}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition hover:bg-white/10 hover:text-white ${
          downloaded ? "text-brand-bright" : "text-white/75"
        } ${className}`}
      >
        {downloaded ? <CheckIcon className="h-4 w-4" /> : <DownloadIcon className="h-4 w-4" />}
        <span className="hidden sm:inline">{downloaded ? "Downloaded" : "Download"}</span>
      </button>
    );
  } else {
    trigger = (
      <button
        type="button"
        onClick={openDialog}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={`${circleBase} ${circleSizes[size]} ${
          downloaded
            ? "border-brand bg-brand/20 text-brand-bright hover:bg-brand/30"
            : "border-white/40 bg-black/40 text-white hover:border-white hover:bg-white/10"
        } backdrop-blur-sm ${className}`}
      >
        {downloaded ? <CheckIcon /> : <DownloadIcon />}
      </button>
    );
  }

  return (
    <>
      {trigger}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
            onClick={(e) => {
              e.stopPropagation();
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Download ${title}`}
              className="w-full max-w-md animate-modal-in overflow-hidden rounded-xl border border-white/10 bg-surface p-6 text-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-bright">Download</p>
                  <h3 className="brand-font mt-1 text-xl font-extrabold">
                    {title}
                    {epSuffix && <span className="text-white/65">{epSuffix}</span>}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/75 transition hover:bg-white/20 hover:text-white"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Select Quality</p>
                <div className="grid grid-cols-2 gap-2">
                  {["1080p Full HD", "720p Standard HD"].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuality(q)}
                      className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition ${
                        quality === q
                          ? "border-brand bg-brand/15 text-brand-bright"
                          : "border-white/10 bg-surface-2 text-white/75 hover:border-white/25"
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={startDownload}
                  disabled={downloading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-bold text-on-brand transition hover:bg-brand-bright disabled:opacity-60"
                >
                  <DownloadIcon className="h-5 w-5" />
                  {downloading
                    ? `Downloading… ${progress}%`
                    : downloaded
                    ? `Download Again (${quality})`
                    : `Save to Device (${quality})`}
                </button>

                {downloading && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-white/50">
                  Direct Stream / External Mirrors
                </p>
                <div className="space-y-2">
                  {sources.map((src) => (
                    <a
                      key={src.name}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-surface-2 px-3.5 py-2.5 text-sm transition hover:border-white/30 hover:bg-surface-3"
                    >
                      <span className="inline-flex items-center gap-2 font-medium text-white/90">
                        <ServerIcon className="h-4 w-4 text-brand-bright" />
                        {src.name}
                      </span>
                      <span className="rounded bg-white/10 px-2 py-0.5 text-[0.7rem] font-semibold text-white/70">
                        {src.quality}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

// Captures the browser's PWA install prompt so any InstallAppButton can trigger it.
let deferredInstallPrompt = null;
const installListeners = new Set();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installListeners.forEach((fn) => fn(e));
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installListeners.forEach((fn) => fn(null));
  });
}

export function InstallAppButton({ className = "", compact = false }) {
  const [promptEvent, setPromptEvent] = useState(deferredInstallPrompt);
  const [installed, setInstalled] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches
  );
  const toast = useToast();

  useEffect(() => {
    const onPrompt = (e) => {
      setPromptEvent(e);
      if (!e) setInstalled(true);
    };
    installListeners.add(onPrompt);
    return () => installListeners.delete(onPrompt);
  }, []);

  if (installed) return null;

  const handleInstall = async () => {
    if (promptEvent) {
      promptEvent.prompt();
      const choice = await promptEvent.userChoice.catch(() => null);
      if (choice?.outcome === "accepted") {
        deferredInstallPrompt = null;
        setPromptEvent(null);
        setInstalled(true);
      }
      return;
    }
    toast("To install CineStream: open your browser menu (⋮ or Share) and choose “Install app” or “Add to Home Screen”.");
  };

  return (
    <button
      type="button"
      onClick={handleInstall}
      aria-label="Download CineStream App"
      title="Install CineStream on your device"
      className={
        compact
          ? `inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/90 transition hover:border-brand/60 hover:bg-brand/15 hover:text-white ${className}`
          : `inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-white/90 transition hover:border-brand/60 hover:bg-brand/15 hover:text-white ${className}`
      }
    >
      <DownloadIcon className="h-3.5 w-3.5 text-brand-bright" />
      <span>{compact ? "App" : "Download App"}</span>
    </button>
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
