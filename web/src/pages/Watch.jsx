import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Hls from "hls.js";
import EpisodeList from "../components/EpisodeList";
import Row from "../components/Row";
import { DownloadButton, LikeButton, ListButton, MaturityBadge, Score } from "../components/ui/Controls";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  CloseIcon,
  FilmIcon,
  FullscreenIcon,
  InfoIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  ReplayIcon,
  ServerIcon,
  SettingsIcon,
  SkipBackIcon,
  SkipForwardIcon,
  VolumeOffIcon,
  VolumeOnIcon,
} from "../components/ui/Icons";
import TrailerTheater from "../components/TrailerTheater";
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
import { readJSON, writeJSON } from "../lib/storage";

const SKIP_KEY = "cinestream:skip-seconds";
const SKIP_PRESETS = [5, 10, 15, 30];
const HIDE_CONTROLS_AFTER_MS = 2800;

const formatTime = (s = 0) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const total = Math.floor(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

// Strips any leading non-0x47 padding header bytes (e.g. disguised image headers) before HLS.js demuxes MPEG-TS.
const createCleanFragmentLoader = () => {
  const BaseLoader = Hls?.DefaultConfig?.loader;
  if (!BaseLoader) return undefined;
  return class CleanTsLoader extends BaseLoader {
    load(context, config, callbacks) {
      const origSuccess = callbacks.onSuccess;
      callbacks.onSuccess = (response, stats, ctx, networkDetails) => {
        if (response?.data instanceof ArrayBuffer) {
          const u8 = new Uint8Array(response.data);
          const limit = Math.min(u8.length - 376, 8192);
          for (let i = 0; i < limit; i++) {
            if (u8[i] === 0x47 && u8[i + 188] === 0x47 && u8[i + 376] === 0x47) {
              if (i > 0) response.data = response.data.slice(i);
              break;
            }
          }
        }
        origSuccess(response, stats, ctx, networkDetails);
      };
      super.load(context, config, callbacks);
    }
  };
};

// Hide the intro after this long even if the provider page is still loading in the background.
const REVEAL_AFTER_MS = 4000;
// Only suggest another server after this long without the page finishing.
const SLOW_HINT_AFTER_MS = 25000;

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

// Native HTML5 + HLS.js player with Netflix-style forward/reverse controls and timeline.
function NativeStreamPlayer({ id, mediaType, season, episode, title, subtitle, backdrop, logo, onFallback }) {
  const stageRef = useRef(null);
  const videoRef = useRef(null);
  const hideTimer = useRef(null);
  const lastTap = useRef({ time: 0, side: null });
  const pendingToggle = useRef(null);

  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [flash, setFlash] = useState(null);
  const [skip, setSkip] = useState(() => {
    const saved = Number(readJSON(SKIP_KEY, 10));
    return saved >= 1 && saved <= 300 ? saved : 10;
  });

  useEffect(() => writeJSON(SKIP_KEY, skip), [skip]);

  const poke = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), HIDE_CONTROLS_AFTER_MS);
  }, []);

  useEffect(() => {
    if (!playing || settingsOpen) {
      clearTimeout(hideTimer.current);
      setShowControls(true);
    } else {
      poke();
    }
    return () => clearTimeout(hideTimer.current);
  }, [playing, settingsOpen, poke]);

  // Resolve and attach the HLS stream.
  useEffect(() => {
    let alive = true;
    let hls = null;
    let blobUrl = null;
    setLoading(true);
    setTime(0);
    setDuration(0);

    const params = new URLSearchParams({
      type: mediaType,
      id: String(id),
      s: String(season),
      e: String(episode),
    });

    fetch(`/api/stream?${params.toString()}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j?.m3u8) throw new Error(j.error || "Stream unavailable");
        return j;
      })
      .then((data) => {
        if (!alive) return;
        const video = videoRef.current;
        if (!video) return;

        blobUrl = URL.createObjectURL(new Blob([data.m3u8], { type: "application/vnd.apple.mpegurl" }));

        if (Hls.isSupported()) {
          const fLoader = createCleanFragmentLoader();
          hls = new Hls({
            ...(fLoader ? { fLoader } : {}),
            enableWorker: true,
            maxBufferLength: 30,
          });
          hls.loadSource(blobUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (!alive) return;
            setLoading(false);
            video.play().catch(() => {});
          });
          hls.on(Hls.Events.ERROR, (_, errData) => {
            if (errData?.fatal && alive) {
              onFallback?.();
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = blobUrl;
          video.addEventListener(
            "loadedmetadata",
            () => {
              if (!alive) return;
              setLoading(false);
              video.play().catch(() => {});
            },
            { once: true }
          );
        } else {
          onFallback?.();
        }
      })
      .catch(() => {
        if (alive) onFallback?.();
      });

    return () => {
      alive = false;
      if (hls) {
        try {
          hls.destroy();
        } catch {}
      }
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [id, mediaType, season, episode, onFallback]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
    poke();
  }, [poke]);

  const seekBy = useCallback(
    (delta) => {
      const v = videoRef.current;
      if (!v) return;
      const dur = v.duration || duration || 0;
      const target = dur > 0 ? Math.min(Math.max(0, v.currentTime + delta), dur) : Math.max(0, v.currentTime + delta);
      v.currentTime = target;
      setTime(target);
      const seconds = Math.abs(delta);
      setFlash({
        side: delta < 0 ? "left" : "right",
        seconds,
        text: `${delta < 0 ? "−" : "+"}${seconds}s`,
        id: Date.now(),
      });
      poke();
    },
    [duration, poke]
  );

  useEffect(() => {
    if (!flash) return undefined;
    const t = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(t);
  }, [flash]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    poke();
  }, [poke]);

  const changeVolume = (val) => {
    const v = videoRef.current;
    if (!v) return;
    const nextVol = Math.max(0, Math.min(1, Number(val)));
    v.volume = nextVol;
    v.muted = nextVol === 0;
    setVolume(nextVol);
    setMuted(v.muted);
    poke();
  };

  const toggleFullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!document.fullscreenElement) el?.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Keyboard shortcuts: ← / → / J / L skip, Space / K play-pause, M mute, F fullscreen.
  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target?.tagName)) return;
      if (e.key === "ArrowLeft" || e.key?.toLowerCase() === "j") {
        e.preventDefault();
        seekBy(-skip);
      } else if (e.key === "ArrowRight" || e.key?.toLowerCase() === "l") {
        e.preventDefault();
        seekBy(skip);
      } else if (e.key === " " || e.key?.toLowerCase() === "k") {
        e.preventDefault();
        togglePlay();
      } else if (e.key?.toLowerCase() === "m") {
        e.preventDefault();
        toggleMute();
      } else if (e.key?.toLowerCase() === "f") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [seekBy, skip, togglePlay, toggleMute, toggleFullscreen]);

  // Single click = play/pause, double-click/tap left or right third = skip.
  const onStageClick = (e) => {
    if (settingsOpen) {
      setSettingsOpen(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const side = x < 0.35 ? "left" : x > 0.65 ? "right" : "center";
    const now = Date.now();
    clearTimeout(pendingToggle.current);
    if (side !== "center" && lastTap.current.side === side && now - lastTap.current.time < 300) {
      lastTap.current = { time: 0, side: null };
      seekBy(side === "left" ? -skip : skip);
      return;
    }
    lastTap.current = { time: now, side };
    pendingToggle.current = setTimeout(() => togglePlay(), side === "center" ? 0 : 260);
    poke();
  };
  useEffect(() => () => clearTimeout(pendingToggle.current), []);

  const progress = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
  const bufferedPct = duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0;
  const controlsVisible = showControls || !playing;

  return (
    <div
      ref={stageRef}
      onMouseMove={poke}
      className={`relative mx-auto aspect-video w-full max-w-[calc((100svh-4rem)*16/9)] select-none overflow-hidden bg-black ${
        controlsVisible ? "" : "cursor-none"
      }`}
    >
      <video
        ref={videoRef}
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration || 0);
          setLoading(false);
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setTime(v.currentTime || 0);
          if (v.duration && v.duration > 0) setDuration(v.duration);
          if (v.buffered?.length) {
            setBufferedEnd(v.buffered.end(v.buffered.length - 1));
          }
        }}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
        className="h-full w-full object-contain"
      />

      {/* Click / double-tap surface */}
      <div className="absolute inset-0 z-10" onClick={onStageClick} onDoubleClick={toggleFullscreen} />

      {/* Loading backdrop */}
      {loading && time === 0 && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden bg-black">
          {backdrop && (
            <img
              src={getBackdropUrl(backdrop)}
              alt=""
              className="absolute inset-0 h-full w-full animate-ken-burns object-cover opacity-35"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40" />
          <div className="relative flex max-w-lg flex-col items-center px-6 text-center">
            {logo ? (
              <img
                src={getLogoUrl(logo)}
                alt={title}
                className="mb-4 max-h-16 max-w-[70%] object-contain drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)] sm:max-h-24"
              />
            ) : (
              title && <h2 className="brand-font mb-3 text-2xl font-extrabold text-shadow sm:text-4xl">{title}</h2>
            )}
            {subtitle && <p className="mb-6 text-sm text-white/70 sm:text-base">{subtitle}</p>}
            <div className="h-1 w-48 overflow-hidden rounded-full bg-white/15 sm:w-64">
              <div className="h-full w-2/5 animate-loading-bar rounded-full bg-gradient-to-r from-brand to-brand-bright" />
            </div>
            <p className="mt-4 text-xs text-white/55 sm:text-sm">Getting your stream ready…</p>
          </div>
        </div>
      )}

      {/* Netflix -10s / +10s skip flash */}
      {flash && (
        <div
          key={flash.id}
          className={`pointer-events-none absolute top-1/2 z-30 flex -translate-y-1/2 animate-pop-in flex-col items-center gap-1 rounded-full bg-black/60 px-4 py-3 text-white backdrop-blur-sm [--from-scale:0.7] ${
            flash.side === "left" ? "left-[15%]" : "right-[15%]"
          }`}
        >
          {flash.side === "left" ? (
            <SkipBackIcon seconds={flash.seconds} className="h-8 w-8 sm:h-9 sm:w-9" />
          ) : (
            <SkipForwardIcon seconds={flash.seconds} className="h-8 w-8 sm:h-9 sm:w-9" />
          )}
          <span className="text-xs font-bold sm:text-sm">{flash.text}</span>
        </div>
      )}

      {/* Netflix-style Player Controls (Center + Bottom Bar) */}
      {(!loading || time > 0) && (
        <div
          className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-300 ${
            controlsVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Center: Rewind 10s · Play/Pause · Forward 10s */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-8 sm:gap-14">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                seekBy(-skip);
              }}
              aria-label={`Rewind ${skip} seconds`}
              title={`Rewind ${skip}s (←)`}
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur-sm transition hover:scale-110 hover:bg-black/70 hover:text-white sm:h-12 sm:w-12"
            >
              <SkipBackIcon seconds={skip} className="h-7 w-7 sm:h-8 sm:w-8" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              aria-label={playing ? "Pause" : "Play"}
              className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:scale-105 hover:bg-white/25 sm:h-16 sm:w-16"
            >
              {playing ? (
                <PauseIcon className="h-7 w-7 sm:h-8 sm:w-8" />
              ) : (
                <PlayIcon className="h-7 w-7 translate-x-0.5 sm:h-8 sm:w-8" />
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                seekBy(skip);
              }}
              aria-label={`Fast-forward ${skip} seconds`}
              title={`Fast-forward ${skip}s (→)`}
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur-sm transition hover:scale-110 hover:bg-black/70 hover:text-white sm:h-12 sm:w-12"
            >
              <SkipForwardIcon seconds={skip} className="h-7 w-7 sm:h-8 sm:w-8" />
            </button>
          </div>

          {/* Bottom Bar: Timeline + Netflix Control Strip */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-4 pb-3 pt-10 sm:px-6 sm:pb-4"
          >
            {/* Seek Bar */}
            <div className="flex items-center gap-3 text-xs tabular-nums text-white/85">
              <span>{formatTime(time)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={Math.min(time, duration || 100)}
                onChange={(e) => {
                  const t = Number(e.target.value);
                  setTime(t);
                  if (videoRef.current) videoRef.current.currentTime = t;
                  poke();
                }}
                aria-label="Seek timeline"
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full accent-[var(--color-brand)]"
                style={{
                  background: `linear-gradient(to right, var(--color-brand) ${progress}%, rgba(255,255,255,0.4) ${progress}%, rgba(255,255,255,0.4) ${bufferedPct}%, rgba(255,255,255,0.18) ${bufferedPct}%)`,
                }}
              />
              <span>{formatTime(duration)}</span>
            </div>

            {/* Control Buttons Row */}
            <div className="mt-2 flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? "Pause" : "Play"}
                title={playing ? "Pause (Space)" : "Play (Space)"}
                className="rounded-md p-1.5 text-white/90 transition hover:bg-white/10 hover:text-white"
              >
                {playing ? <PauseIcon className="h-5 w-5 sm:h-6 sm:w-6" /> : <PlayIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
              </button>

              <button
                type="button"
                onClick={() => seekBy(-skip)}
                aria-label={`Rewind ${skip} seconds`}
                title={`Rewind ${skip}s (←)`}
                className="rounded-md p-1.5 text-white/90 transition hover:bg-white/10 hover:text-white"
              >
                <SkipBackIcon seconds={skip} className="h-6 w-6 sm:h-7 sm:w-7" />
              </button>

              <button
                type="button"
                onClick={() => seekBy(skip)}
                aria-label={`Fast-forward ${skip} seconds`}
                title={`Fast-forward ${skip}s (→)`}
                className="rounded-md p-1.5 text-white/90 transition hover:bg-white/10 hover:text-white"
              >
                <SkipForwardIcon seconds={skip} className="h-6 w-6 sm:h-7 sm:w-7" />
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={muted ? "Unmute" : "Mute"}
                  title={muted ? "Unmute (M)" : "Mute (M)"}
                  className="rounded-md p-1.5 text-white/90 transition hover:bg-white/10 hover:text-white"
                >
                  {muted || volume === 0 ? (
                    <VolumeOffIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  ) : (
                    <VolumeOnIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => changeVolume(e.target.value)}
                  aria-label="Volume"
                  className="hidden h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/25 accent-white sm:block md:w-20"
                />
              </div>

              {title && (
                <p className="ml-2 hidden min-w-0 flex-1 truncate text-xs font-medium text-white/75 md:block">
                  <span className="font-bold text-white">{title}</span>
                  {subtitle && <span className="text-white/50"> · {subtitle}</span>}
                </p>
              )}

              <div className="relative ml-auto flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((o) => !o)}
                  aria-expanded={settingsOpen}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
                >
                  <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Skip {skip}s</span>
                </button>
                {settingsOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-48 animate-fade-in rounded-lg border border-white/10 bg-black/95 p-3 text-xs shadow-2xl backdrop-blur-xl">
                    <p className="mb-2 font-semibold text-white/70">Skip interval</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {SKIP_PRESETS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setSkip(s);
                            setSettingsOpen(false);
                          }}
                          className={`rounded py-1.5 font-bold transition ${
                            skip === s ? "bg-brand text-on-brand" : "bg-white/10 text-white/80 hover:bg-white/20"
                          }`}
                        >
                          {s}s
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label={fullscreen ? "Exit full screen" : "Full screen"}
                  title="Fullscreen (F)"
                  className="rounded-md p-1.5 text-white/90 transition hover:bg-white/10 hover:text-white"
                >
                  <FullscreenIcon exit={fullscreen} className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Fallback iframe player for external embed providers (Server 2+).
function Player({ id, mediaType, season, episode, sources, server, onServerChange, title, subtitle, backdrop, logo, onShowTrailer }) {
  const [revealed, setRevealed] = useState(false);
  const [overlayGone, setOverlayGone] = useState(false);
  const [slow, setSlow] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [notice, setNotice] = useState(null);
  const [missingOn, setMissingOn] = useState([]); // servers that reported "not found"
  const [devtools, setDevtools] = useState(false);
  const iframeRef = useRef(null);
  const src = sources[server];
  const allMissing = missingOn.length >= sources.length;

  // Listen for the provider's own status messages (only from our player frame).
  useEffect(() => {
    const onMessage = (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      let data = event.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (data?.type === "MEDIA_NOT_FOUND") {
        setMissingOn((prev) => (prev.includes(server) ? prev : [...prev, server]));
      } else if (data?.type === "VS_DEVTOOLS") {
        setDevtools(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [server]);

  // "Not found" on this server → move on to the next one that hasn't said so.
  useEffect(() => {
    if (!missingOn.includes(server) || allMissing) return undefined;
    const nextUntried = sources.findIndex((_, i) => i > server && !missingOn.includes(i));
    const target = nextUntried === -1 ? sources.findIndex((_, i) => !missingOn.includes(i)) : nextUntried;
    if (target === -1) return undefined;
    setNotice(`Server ${server + 1} doesn’t have this title. Switching to Server ${target + 1}…`);
    const t = setTimeout(() => onServerChange(target), 1500);
    return () => clearTimeout(t);
  }, [missingOn, server, sources, allMissing, onServerChange]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (src === "native") return undefined;
    setRevealed(false);
    setOverlayGone(false);
    setSlow(false);
    setHintDismissed(false);
    const reveal = setTimeout(() => setRevealed(true), REVEAL_AFTER_MS);
    const slowTimer = setTimeout(() => setSlow(true), SLOW_HINT_AFTER_MS);
    return () => {
      clearTimeout(reveal);
      clearTimeout(slowTimer);
    };
  }, [src]);

  useEffect(() => {
    if (!revealed) return undefined;
    const t = setTimeout(() => setOverlayGone(true), 800);
    return () => clearTimeout(t);
  }, [revealed]);

  if (src === "native" && !missingOn.includes(0)) {
    return (
      <NativeStreamPlayer
        id={id}
        mediaType={mediaType}
        season={season}
        episode={episode}
        title={title}
        subtitle={subtitle}
        backdrop={backdrop}
        logo={logo}
        onFallback={() => setMissingOn((prev) => (prev.includes(0) ? prev : [...prev, 0]))}
      />
    );
  }

  const handleLoad = () => {
    setSlow(false);
    setTimeout(() => setRevealed(true), 400);
  };

  const next = (server + 1) % sources.length;

  return (
    <div className="relative mx-auto aspect-video w-full max-w-[calc((100svh-4rem)*16/9)] overflow-hidden bg-black">
      <iframe
        ref={iframeRef}
        key={src}
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
            revealed ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
          aria-hidden={revealed}
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
            <div className="h-1 w-48 overflow-hidden rounded-full bg-white/15 sm:w-64">
              <div className="h-full w-2/5 animate-loading-bar rounded-full bg-gradient-to-r from-brand to-brand-bright" />
            </div>
            <p className="mt-4 text-xs text-white/55 sm:text-sm">
              {server === 0 ? "Getting your stream ready…" : `Connecting to Server ${server + 1}…`}
            </p>
          </div>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="absolute left-1/2 top-4 z-20 -translate-x-1/2 animate-pop-in rounded-full border border-brand/40 bg-black/85 px-4 py-2 text-sm text-white/90 shadow-2xl backdrop-blur-md [--from-scale:0.9]"
        >
          {notice}
        </div>
      )}

      {(devtools || allMissing) && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 p-6 text-center backdrop-blur-sm">
          <div className="max-w-md space-y-4">
            {devtools ? (
              <>
                <p className="brand-font text-xl font-bold">Close developer tools to play</p>
                <p className="text-sm leading-relaxed text-white/65">
                  This provider stops its player while developer tools (F12) are open. Close them, then reload.
                </p>
              </>
            ) : (
              <>
                <p className="brand-font text-xl font-bold">Not available to stream yet</p>
                <p className="text-sm leading-relaxed text-white/65">
                  None of the servers have this title right now. New releases often appear after a few days.
                </p>
              </>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-bold text-on-brand transition hover:bg-brand-bright"
              >
                <ReplayIcon className="h-4 w-4" /> Reload
              </button>
              {onShowTrailer && (
                <button
                  type="button"
                  onClick={onShowTrailer}
                  className="inline-flex items-center gap-2 rounded-md bg-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/25"
                >
                  <PlayIcon className="h-4 w-4" /> Watch the trailer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* A gentle suggestion, never an automatic switch. */}
      {slow && !hintDismissed && !allMissing && !devtools && sources.length > 1 && (
        <div
          role="status"
          className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 animate-pop-in items-center gap-3 rounded-full border border-white/15 bg-black/80 py-1.5 pl-4 pr-1.5 text-sm shadow-2xl backdrop-blur-md [--from-scale:0.9]"
        >
          <span className="whitespace-nowrap text-white/80">Slow to start?</span>
          <button
            type="button"
            onClick={() => onServerChange(next)}
            className="whitespace-nowrap rounded-full bg-white px-3 py-1 font-semibold text-black transition hover:bg-white/80"
          >
            Try Server {next + 1}
          </button>
          <button
            type="button"
            onClick={() => setHintDismissed(true)}
            aria-label="Keep waiting"
            title="Keep waiting"
            className="rounded-full p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
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
  const { details, error, certification, logoPath, trailerKey } = useTitleDetails(id, mediaType);
  const [trailerOpen, setTrailerOpen] = useState(false);

  const season = Number(searchParams.get("s")) || 1;
  const episode = Number(searchParams.get("e")) || 1;
  const [server, setServer] = useState(0);
  const [episodeName, setEpisodeName] = useState(null);

  const sources = useMemo(
    () => ["native", ...getFallbackUrls(id, mediaType, season, episode)],
    [id, mediaType, season, episode]
  );

  // Open connections to every server early so switching (and the first load) starts faster.
  useEffect(() => {
    const origins = [
      ...new Set(
        sources
          .filter((u) => u.startsWith("http"))
          .map((u) => new URL(u).origin)
      ),
    ];
    const links = origins.map((origin) => {
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = origin;
      document.head.appendChild(link);
      return link;
    });
    return () => links.forEach((l) => l.remove());
  }, [sources]);
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
        <DownloadButton item={item} season={season} episode={episode} variant="topbar" />
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
        id={id}
        mediaType={mediaType}
        season={season}
        episode={episode}
        sources={sources}
        server={server}
        onServerChange={setServer}
        title={title}
        subtitle={episodeLabel || [year, length].filter(Boolean).join(" · ")}
        backdrop={details?.backdrop_path}
        logo={logoPath}
        onShowTrailer={trailerKey ? () => setTrailerOpen(true) : null}
      />
      <TrailerTheater open={trailerOpen} videoKey={trailerKey} title={title} onClose={() => setTrailerOpen(false)} />

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
            <div className="flex flex-wrap items-center gap-2">
              <ListButton item={item} size="lg" />
              <LikeButton item={item} size="lg" />
              <DownloadButton item={item} season={season} episode={episode} variant="pill" />
              {trailerKey && (
                <button
                  type="button"
                  onClick={() => setTrailerOpen(true)}
                  className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-white/40 px-5 text-sm font-semibold transition hover:border-white"
                >
                  <FilmIcon className="h-5 w-5" /> Trailer
                </button>
              )}
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
