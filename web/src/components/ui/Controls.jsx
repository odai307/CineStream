import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import muxjs from "mux.js";
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
  StarIcon,
  ThumbUpIcon,
  VolumeOffIcon,
  VolumeOnIcon,
} from "./Icons";

const DOWNLOADS_KEY = "cinestream:mp4-downloads-v2";

const stripTsPadding = (u8) => {
  const limit = Math.min(u8.length - 376, 8192);
  for (let i = 0; i < limit; i++) {
    if (u8[i] === 0x47 && u8[i + 188] === 0x47 && u8[i + 376] === 0x47) {
      return i > 0 ? u8.subarray(i) : u8;
    }
  }
  return null;
};

// Fetch helper that works both via /api/stream and via public CORS gateways if deployed as static SPA.
const fetchTextWithCorsFallback = async (targetUrl, signal) => {
  const attempts = [
    `/api/stream?proxy=${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
  ];
  for (const url of attempts) {
    try {
      const r = await fetch(url, { signal, referrerPolicy: "no-referrer" });
      if (!r.ok) continue;
      const text = await r.text();
      // Reject SPA fallback index.html responses
      if (text.includes('<div id="root"></div>') || text.includes("/src/main.jsx")) continue;
      return text;
    } catch (err) {
      if (err?.name === "AbortError") throw err;
    }
  }
  throw new Error("Could not reach video stream provider");
};

const resolveStreamWithFallback = async ({ mediaType, id, season, episode, quality, signal }) => {
  // 1. Try our /api/stream endpoint first (works on local Vite dev and Vercel functions)
  try {
    const params = new URLSearchParams({
      type: mediaType,
      id: String(id),
      s: String(season),
      e: String(episode),
      ...(quality ? { quality } : {}),
    });
    const r = await fetch(`/api/stream?${params.toString()}`, { signal });
    const ct = r.headers.get("content-type") || "";
    if (r.ok && ct.includes("application/json")) {
      const j = await r.json();
      if (j?.segments?.length) return j;
    }
  } catch (err) {
    if (err?.name === "AbortError") throw err;
  }

  // 2. Client-side fallback resolver if /api/stream was intercepted by static SPA routing
  const embedPath = mediaType === "tv" ? `tv/${id}/${season}/${episode}` : `movie/${id}`;
  const embedUrl = `https://vidsrc.buzz/embed/${embedPath}`;
  const html = await fetchTextWithCorsFallback(embedUrl, signal);
  const qMatch = html.match(/var Q\s*=\s*(\{.*?\});\s*\n/);
  if (!qMatch) throw new Error("Stream metadata not found for this title");
  const Q = JSON.parse(qMatch[1]);
  const servers = [...(Q.ssr?.servers || [])].sort((a, b) => {
    const score = (srv) => (!srv.lang ? 1 : /english/i.test(srv.lang) ? 0 : 2);
    return score(a) - score(b);
  });

  for (const srv of servers) {
    try {
      const playUrl = `https://vidsrc.buzz/pl/api.php?a=play&ref=${encodeURIComponent(srv.ref)}&t=${encodeURIComponent(Q.t)}`;
      const playTxt = await fetchTextWithCorsFallback(playUrl, signal);
      const playJson = JSON.parse(playTxt);
      if (!playJson?.url) continue;

      const masterUrl = new URL(playJson.url, "https://vidsrc.buzz").href;
      let m3u8Text = await fetchTextWithCorsFallback(masterUrl, signal);
      if (!m3u8Text.includes("#EXTM3U")) continue;

      let qualities = [{ label: "720p HD", height: 720 }];
      let mediaBaseUrl = masterUrl;

      if (m3u8Text.includes("#EXT-X-STREAM-INF")) {
        const lines = m3u8Text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const variants = [];
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith("#EXT-X-STREAM-INF:") && lines[i + 1] && !lines[i + 1].startsWith("#")) {
            const resMatch = lines[i].match(/RESOLUTION=\d+x(\d+)/i);
            const height = resMatch ? Number(resMatch[1]) : 720;
            variants.push({
              height,
              label: `${height}p ${height >= 1080 ? "Full HD" : "HD"}`,
              url: new URL(lines[i + 1], "https://vidsrc.buzz").href,
            });
            i += 1;
          }
        }
        if (!variants.length) continue;
        qualities = variants;
        const picked = variants[0];
        mediaBaseUrl = picked.url;
        m3u8Text = await fetchTextWithCorsFallback(picked.url, signal);
      }

      const segments = m3u8Text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"))
        .map((l) => new URL(l, mediaBaseUrl).href);

      if (segments.length > 0) {
        return {
          title: Q.title || "",
          serverName: srv.name,
          qualities,
          segments,
        };
      }
    } catch (err) {
      if (err?.name === "AbortError") throw err;
    }
  }

  throw new Error("No downloadable video stream available for this title right now");
};

const transmuxSegmentsToMp4 = (tsSegments) => {
  const transmuxer = new muxjs.mp4.Transmuxer({ keepOriginalTimestamps: true });
  const mp4Chunks = [];
  let hasInit = false;

  transmuxer.on("data", (seg) => {
    if (!hasInit && seg.initSegment?.byteLength) {
      mp4Chunks.push(new Uint8Array(seg.initSegment));
      hasInit = true;
    }
    if (seg.data?.byteLength) {
      mp4Chunks.push(new Uint8Array(seg.data));
    }
  });

  for (const ts of tsSegments) {
    if (!ts?.byteLength) continue;
    transmuxer.push(ts);
    transmuxer.flush();
  }

  if (mp4Chunks.length > 0) {
    return { blob: new Blob(mp4Chunks, { type: "video/mp4" }), ext: "mp4" };
  }
  return { blob: new Blob(tsSegments, { type: "video/mp2t" }), ext: "ts" };
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

function saveVideoBlob(blob, filename) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
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
  const [streamInfo, setStreamInfo] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState(null);
  const [quality, setQuality] = useState("720p HD");
  const [progress, setProgress] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [bytesDownloaded, setBytesDownloaded] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const abortRef = useRef(null);
  const collectedRef = useRef([]);
  const toast = useToast();

  const mediaType = item?.media_type === "tv" ? "tv" : "movie";
  const dlKey = item?.id ? `${mediaType}-${item.id}-${mediaType === "tv" ? `${season}-${episode}` : "movie"}` : "";
  const [downloaded, setDownloaded] = useState(() => Boolean(dlKey && readJSON(DOWNLOADS_KEY, {})[dlKey]));

  useEffect(() => {
    setDownloaded(Boolean(dlKey && readJSON(DOWNLOADS_KEY, {})[dlKey]));
  }, [dlKey]);

  useEffect(() => {
    if (!open || !item?.id) return undefined;
    const controller = new AbortController();
    setResolving(true);
    setResolveError(null);
    resolveStreamWithFallback({
      mediaType,
      id: item.id,
      season,
      episode,
      signal: controller.signal,
    })
      .then((data) => {
        setStreamInfo(data);
        if (data.qualities?.[0]?.label) setQuality(data.qualities[0].label);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          setResolveError(err.message || "Could not resolve video stream");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setResolving(false);
      });
    return () => controller.abort();
  }, [open, item?.id, mediaType, season, episode]);

  if (!item?.id) return null;

  const title = tmdb.getTitle ? tmdb.getTitle(item) : item.title || item.name || "Title";
  const epSuffix = mediaType === "tv" ? ` S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}` : "";
  const safeBaseName = `${title}${epSuffix}`
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .trim()
    .slice(0, 80);
  const ariaLabel = label || (downloaded ? `Downloaded: ${title}${epSuffix}` : `Download ${title}${epSuffix}`);

  const finalizeMp4 = (segmentsArray) => {
    const valid = segmentsArray.filter(Boolean);
    if (!valid.length) {
      toast("No video segments downloaded yet.", { tone: "error" });
      return;
    }
    const { blob, ext } = transmuxSegmentsToMp4(valid);
    saveVideoBlob(blob, `${safeBaseName || "CineStream"} (${quality}).${ext}`);
    setDownloaded(true);
    const saved = readJSON(DOWNLOADS_KEY, {});
    writeJSON(DOWNLOADS_KEY, {
      ...saved,
      [dlKey]: { id: item.id, mediaType, title, season, episode, quality, savedAt: Date.now() },
    });
    toast(`Saved "${safeBaseName}.${ext}" (${(blob.size / (1024 * 1024)).toFixed(1)} MB)`, { tone: "success" });
  };

  const startDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setProgress(0);
    setDoneCount(0);
    setBytesDownloaded(0);
    setResolveError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let info = streamInfo;
      if (!info?.segments?.length) {
        info = await resolveStreamWithFallback({
          mediaType,
          id: item.id,
          season,
          episode,
          quality,
          signal: controller.signal,
        });
        setStreamInfo(info);
      }

      const segUrls = info.segments;
      setTotalCount(segUrls.length);
      const ordered = new Array(segUrls.length).fill(null);
      collectedRef.current = ordered;

      let cursor = 0;
      let completed = 0;
      let totalBytes = 0;
      const concurrency = 6;

      const fetchSegment = async (url) => {
        // Send no Referer so CDNs with Access-Control-Allow-Origin: * serve the raw MPEG-TS bytes directly
        try {
          const res = await fetch(url, { signal: controller.signal, referrerPolicy: "no-referrer" });
          const ct = res.headers.get("content-type") || "";
          if (res.ok && !ct.includes("text/html")) {
            const clean = stripTsPadding(new Uint8Array(await res.arrayBuffer()));
            if (clean) return clean;
          }
        } catch (err) {
          if (err?.name === "AbortError") throw err;
        }
        const proxied = await fetch(`/api/stream?proxy=${encodeURIComponent(url)}`, {
          signal: controller.signal,
        });
        const pct = proxied.headers.get("content-type") || "";
        if (!proxied.ok || pct.includes("text/html")) {
          throw new Error("Video segment blocked or returned HTML");
        }
        const clean = stripTsPadding(new Uint8Array(await proxied.arrayBuffer()));
        if (!clean) throw new Error("Invalid video segment data");
        return clean;
      };

      const worker = async () => {
        while (cursor < segUrls.length) {
          const idx = cursor++;
          const clean = await fetchSegment(segUrls[idx]);
          ordered[idx] = clean;
          completed += 1;
          totalBytes += clean.byteLength;
          setDoneCount(completed);
          setBytesDownloaded(totalBytes);
          setProgress(Math.round((completed / segUrls.length) * 100));
        }
      };

      await Promise.all(Array.from({ length: Math.min(concurrency, segUrls.length) }, () => worker()));
      finalizeMp4(ordered);
    } catch (err) {
      if (err?.name !== "AbortError") {
        setResolveError(err.message || "Download failed");
      }
    } finally {
      setDownloading(false);
      abortRef.current = null;
    }
  };

  const cancelDownload = (savePartial = false) => {
    abortRef.current?.abort();
    abortRef.current = null;
    setDownloading(false);
    if (savePartial && collectedRef.current.some(Boolean)) {
      finalizeMp4(collectedRef.current);
    }
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

  const qualities = streamInfo?.qualities?.length
    ? streamInfo.qualities.map((q) => q.label)
    : ["720p HD"];
  const mbText = `${(bytesDownloaded / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <>
      {trigger}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
            onClick={(e) => {
              e.stopPropagation();
              if (e.target === e.currentTarget && !downloading) setOpen(false);
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
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-bright">Video Download (.MP4)</p>
                  <h3 className="brand-font mt-1 text-xl font-extrabold">
                    {title}
                    {epSuffix && <span className="text-white/65"> · {epSuffix.trim()}</span>}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (downloading) cancelDownload(false);
                    setOpen(false);
                  }}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/75 transition hover:bg-white/20 hover:text-white"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {resolving && (
                  <p className="text-xs text-white/60">Locating direct MP4 video stream…</p>
                )}

                {resolveError && (
                  <p className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-300">
                    {resolveError}
                  </p>
                )}

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Video Quality</p>
                  <div className="flex flex-wrap gap-2">
                    {qualities.map((q) => (
                      <button
                        key={q}
                        type="button"
                        disabled={downloading}
                        onClick={() => setQuality(q)}
                        className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${
                          quality === q
                            ? "border-brand bg-brand/15 text-brand-bright"
                            : "border-white/10 bg-surface-2 text-white/75 hover:border-white/25"
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {!downloading ? (
                  <button
                    type="button"
                    onClick={startDownload}
                    disabled={resolving}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-bold text-on-brand transition hover:bg-brand-bright disabled:opacity-60"
                  >
                    <DownloadIcon className="h-5 w-5" />
                    {downloaded ? `Download MP4 Again (${quality})` : `Download MP4 Video (${quality})`}
                  </button>
                ) : (
                  <div className="space-y-3 rounded-lg border border-white/10 bg-surface-2 p-3.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-brand-bright">Downloading MP4… {progress}%</span>
                      <span className="tabular-nums text-white/70">
                        {mbText} ({doneCount}/{totalCount} parts)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-brand transition-all duration-200"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      {doneCount > 0 && (
                        <button
                          type="button"
                          onClick={() => cancelDownload(true)}
                          className="flex-1 rounded-md bg-white/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/25"
                        >
                          Save {mbText} Now (.mp4)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => cancelDownload(false)}
                        className="rounded-md border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-[0.72rem] leading-relaxed text-white/45">
                  Downloads and remuxes the video stream directly into a playable <strong>.mp4</strong> file in your browser.
                </p>
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
