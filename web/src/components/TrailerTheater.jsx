import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { readJSON, writeJSON } from "../lib/storage";
import {
  CloseIcon,
  FullscreenIcon,
  PauseIcon,
  PlayIcon,
  SettingsIcon,
  SkipBackIcon,
  SkipForwardIcon,
  VolumeOffIcon,
  VolumeOnIcon,
} from "./ui/Icons";

// Full-screen trailer player with our own Netflix-style controls.
// Unlike the movie servers, YouTube's embedded player accepts commands (play, pause,
// seek, mute) and reports its time, so real skip buttons work here.

const SKIP_KEY = "cinestream:skip-seconds";
const SKIP_PRESETS = [5, 10, 15, 30];
const YT_ORIGINS = ["https://www.youtube-nocookie.com", "https://www.youtube.com"];
const HIDE_CONTROLS_AFTER_MS = 2800;

const formatTime = (s = 0) => {
  const total = Math.max(0, Math.floor(s));
  const m = Math.floor(total / 60);
  const sec = String(total % 60).padStart(2, "0");
  return `${m}:${sec}`;
};

function SkipSettings({ value, onChange, onClose }) {
  const [custom, setCustom] = useState(SKIP_PRESETS.includes(value) ? "" : String(value));
  const applyCustom = () => {
    const n = Math.round(Number(custom));
    if (n >= 1 && n <= 300) onChange(n);
  };
  return (
    <div
      className="absolute bottom-full right-0 mb-3 w-64 animate-fade-in rounded-lg border border-white/10 bg-black/90 p-4 text-sm shadow-2xl backdrop-blur-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold">Skip amount</p>
        <button type="button" onClick={onClose} aria-label="Close settings" className="text-white/50 hover:text-white">
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {SKIP_PRESETS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              onChange(s);
              setCustom("");
            }}
            aria-pressed={value === s}
            className={`rounded-md py-2 font-semibold transition ${
              value === s ? "bg-brand text-on-brand" : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            {s}s
          </button>
        ))}
      </div>
      <label className="mt-3 flex items-center gap-2">
        <span className="text-white/60">Custom</span>
        <input
          type="number"
          min={1}
          max={300}
          inputMode="numeric"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onBlur={applyCustom}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") applyCustom();
          }}
          placeholder="e.g. 20"
          className="w-20 rounded-md border border-white/20 bg-black/50 px-2 py-1.5 text-white focus:border-brand focus:outline-none"
        />
        <span className="text-white/60">seconds</span>
      </label>
      <p className="mt-3 text-xs leading-relaxed text-white/45">
        Also: ← / → keys, or double-tap the left or right side of the video.
      </p>
    </div>
  );
}

function Theater({ videoKey, title, onClose }) {
  const iframeRef = useRef(null);
  const stageRef = useRef(null);
  const hideTimer = useRef(null);
  const lastTap = useRef({ time: 0, side: null });
  const pendingToggle = useRef(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [skip, setSkip] = useState(() => {
    const saved = Number(readJSON(SKIP_KEY, 10));
    return saved >= 1 && saved <= 300 ? saved : 10;
  });
  const [showControls, setShowControls] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [flash, setFlash] = useState(null); // { side, text, id }
  const [fullscreen, setFullscreen] = useState(false);
  const [ended, setEnded] = useState(false);

  const command = useCallback((func, args = []) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  }, []);

  // Handshake + status updates (time, duration, state) from the YouTube player.
  useEffect(() => {
    const onMessage = (e) => {
      if (!YT_ORIGINS.includes(e.origin) || e.source !== iframeRef.current?.contentWindow) return;
      let data;
      try {
        data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      const info = data?.info;
      if (data?.event === "onReady") setReady(true);
      if (info && typeof info === "object") {
        setReady(true);
        if (typeof info.currentTime === "number") setTime(info.currentTime);
        if (typeof info.duration === "number" && info.duration > 0) setDuration(info.duration);
        if (typeof info.muted === "boolean") setMuted(info.muted);
        if (typeof info.playerState === "number") {
          setPlaying(info.playerState === 1 || info.playerState === 3);
          setEnded(info.playerState === 0);
        }
      }
      if (data?.event === "onStateChange" && typeof data.info === "number") {
        setPlaying(data.info === 1 || data.info === 3);
        setEnded(data.info === 0);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const [loadedAt, setLoadedAt] = useState(0);
  useEffect(() => {
    if (!loadedAt || ready) return undefined;
    let tries = 0;
    const send = () => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening", id: videoKey, channel: "widget" }),
        "*"
      );
      tries += 1;
      if (tries > 20) clearInterval(timer);
    };
    send();
    const timer = setInterval(send, 300);
    return () => clearInterval(timer);
  }, [loadedAt, ready, videoKey]);

  useEffect(() => writeJSON(SKIP_KEY, skip), [skip]);

  // Auto-hide controls while playing.
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

  const togglePlay = useCallback(() => {
    if (ended) {
      command("seekTo", [0, true]);
      command("playVideo");
      setEnded(false);
      return;
    }
    command(playing ? "pauseVideo" : "playVideo");
    setPlaying((p) => !p);
  }, [command, playing, ended]);

  const seekBy = useCallback(
    (delta) => {
      const target = Math.min(Math.max(0, time + delta), duration || time + delta);
      command("seekTo", [target, true]);
      setTime(target);
      setEnded(false);
      setFlash({ side: delta < 0 ? "left" : "right", text: `${delta < 0 ? "−" : "+"}${Math.abs(delta)}s`, id: Date.now() });
      poke();
    },
    [command, time, duration, poke]
  );

  const toggleMute = useCallback(() => {
    command(muted ? "unMute" : "mute");
    setMuted((m) => !m);
  }, [command, muted]);

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

  // Keyboard: ← → skip, space/K play-pause, M mute, F fullscreen, Esc close.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target?.tagName === "INPUT") return;
      const keys = {
        ArrowLeft: () => seekBy(-skip),
        ArrowRight: () => seekBy(skip),
        j: () => seekBy(-skip),
        l: () => seekBy(skip),
        " ": togglePlay,
        k: togglePlay,
        m: toggleMute,
        f: toggleFullscreen,
        Escape: () => !document.fullscreenElement && onClose(),
      };
      const fn = keys[e.key] || keys[e.key?.toLowerCase()];
      if (fn) {
        e.preventDefault();
        // Keep these keys from also reaching the details window underneath (e.g. Esc).
        e.stopImmediatePropagation();
        fn();
        poke();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [seekBy, skip, togglePlay, toggleMute, toggleFullscreen, onClose, poke]);

  useEffect(() => {
    if (!flash) return undefined;
    const t = setTimeout(() => setFlash(null), 650);
    return () => clearTimeout(t);
  }, [flash]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Tap/click on the video: single = play/pause, double on the left/right third = skip.
  const togglePlayRef = useRef(togglePlay);
  togglePlayRef.current = togglePlay;
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
    // Wait briefly on the sides in case this becomes a double-tap.
    pendingToggle.current = setTimeout(() => togglePlayRef.current(), side === "center" ? 0 : 280);
    poke();
  };
  useEffect(() => () => clearTimeout(pendingToggle.current), []);

  const params = new URLSearchParams({
    autoplay: "1",
    controls: "0",
    disablekb: "1",
    fs: "0",
    iv_load_policy: "3",
    modestbranding: "1",
    playsinline: "1",
    rel: "0",
    enablejsapi: "1",
    origin: window.location.origin,
  });

  const progress = duration ? (time / duration) * 100 : 0;
  const controlsVisible = showControls || !playing;

  return (
    <div
      ref={stageRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} trailer`}
      className={`fixed inset-0 z-[80] animate-fade-in bg-black ${controlsVisible ? "" : "cursor-none"}`}
      onMouseMove={poke}
    >
      <iframe
        ref={iframeRef}
        src={`https://www.youtube-nocookie.com/embed/${videoKey}?${params.toString()}`}
        title={`${title} trailer`}
        onLoad={() => setLoadedAt(Date.now())}
        allow="autoplay; encrypted-media; picture-in-picture"
        className="pointer-events-none absolute inset-0 h-full w-full border-0"
      />

      {/* Click/tap layer */}
      <div className="absolute inset-0" onClick={onStageClick} />

      {flash && (
        <div
          key={flash.id}
          className={`pointer-events-none absolute top-1/2 flex -translate-y-1/2 animate-pop-in flex-col items-center gap-1 rounded-full bg-black/50 px-6 py-5 backdrop-blur-sm [--from-scale:0.7] ${
            flash.side === "left" ? "left-[12%]" : "right-[12%]"
          }`}
        >
          {flash.side === "left" ? (
            <SkipBackIcon seconds={skip} className="h-10 w-10" />
          ) : (
            <SkipForwardIcon seconds={skip} className="h-10 w-10" />
          )}
          <span className="text-sm font-bold">{flash.text}</span>
        </div>
      )}

      <div className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${controlsVisible ? "opacity-100" : "opacity-0"}`}>
        {/* Top bar */}
        <div className="pointer-events-auto absolute inset-x-0 top-0 flex items-center gap-4 bg-gradient-to-b from-black/80 to-transparent p-4 sm:p-6">
          <p className="brand-font min-w-0 flex-1 truncate text-base font-bold sm:text-lg">
            {title} <span className="font-normal text-white/50">· Trailer</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close trailer"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Center: skip back / play / skip forward */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-10 sm:gap-20">
          <button
            type="button"
            onClick={() => seekBy(-skip)}
            aria-label={`Back ${skip} seconds`}
            className="pointer-events-auto rounded-full p-2 text-white/90 transition hover:scale-110 hover:text-white"
          >
            <SkipBackIcon seconds={skip} className="h-12 w-12 sm:h-16 sm:w-16" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm transition hover:scale-105 hover:bg-white/25 sm:h-20 sm:w-20"
          >
            {playing ? <PauseIcon className="h-8 w-8 sm:h-10 sm:w-10" /> : <PlayIcon className="h-8 w-8 translate-x-0.5 sm:h-10 sm:w-10" />}
          </button>
          <button
            type="button"
            onClick={() => seekBy(skip)}
            aria-label={`Forward ${skip} seconds`}
            className="pointer-events-auto rounded-full p-2 text-white/90 transition hover:scale-110 hover:text-white"
          >
            <SkipForwardIcon seconds={skip} className="h-12 w-12 sm:h-16 sm:w-16" />
          </button>
        </div>

        {/* Bottom bar */}
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-4 pt-12 sm:px-6 sm:pb-6">
          <div className="flex items-center gap-3 text-xs tabular-nums text-white/80 sm:text-sm">
            <span>{formatTime(time)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(time, duration || 0)}
              onChange={(e) => {
                const t = Number(e.target.value);
                setTime(t);
                command("seekTo", [t, true]);
                poke();
              }}
              aria-label="Seek"
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full accent-[var(--color-brand)]"
              style={{
                background: `linear-gradient(to right, var(--color-brand) ${progress}%, rgba(255,255,255,0.25) ${progress}%)`,
              }}
            />
            <span>{formatTime(duration)}</span>
          </div>
          <div className="mt-3 flex items-center gap-1 sm:gap-2">
            <button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className="rounded-md p-2 transition hover:bg-white/10">
              {playing ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
            </button>
            <button type="button" onClick={() => seekBy(-skip)} aria-label={`Back ${skip} seconds`} className="rounded-md p-1.5 transition hover:bg-white/10">
              <SkipBackIcon seconds={skip} className="h-7 w-7" />
            </button>
            <button type="button" onClick={() => seekBy(skip)} aria-label={`Forward ${skip} seconds`} className="rounded-md p-1.5 transition hover:bg-white/10">
              <SkipForwardIcon seconds={skip} className="h-7 w-7" />
            </button>
            <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} className="rounded-md p-2 transition hover:bg-white/10">
              {muted ? <VolumeOffIcon className="h-6 w-6" /> : <VolumeOnIcon className="h-6 w-6" />}
            </button>
            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setSettingsOpen((o) => !o)}
                aria-expanded={settingsOpen}
                className="inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-white/85 transition hover:bg-white/10"
              >
                <SettingsIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Skip {skip}s</span>
              </button>
              {settingsOpen && <SkipSettings value={skip} onChange={setSkip} onClose={() => setSettingsOpen(false)} />}
            </div>
            <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit full screen" : "Full screen"} className="rounded-md p-2 transition hover:bg-white/10">
              <FullscreenIcon exit={fullscreen} className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrailerTheater({ videoKey, title, open, onClose }) {
  if (!open || !videoKey) return null;
  return createPortal(<Theater videoKey={videoKey} title={title} onClose={onClose} />, document.body);
}

export default TrailerTheater;
