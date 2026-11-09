import { useCallback, useEffect, useRef, useState } from "react";

// Chrome-less, muted-autoplay YouTube trailer used as a background video.
// Talks to the player through the IFrame API's postMessage protocol (no script tag needed).
// The iframe is scaled up slightly so YouTube's title bar and black bars are cropped away.

const ORIGINS = ["https://www.youtube-nocookie.com", "https://www.youtube.com"];

function TrailerPlayer({
  videoKey,
  muted = true,
  playing = true,
  loop = false,
  startDelay = 0,
  onPlaying,
  onEnded,
  className = "",
}) {
  const iframeRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [started, setStarted] = useState(startDelay === 0);
  const callbacks = useRef({ onPlaying, onEnded });
  callbacks.current = { onPlaying, onEnded };

  const command = useCallback((func, args = []) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  }, []);

  // Delay mounting the iframe (hero waits a beat on the artwork, like Netflix).
  useEffect(() => {
    if (startDelay === 0) return undefined;
    setStarted(false);
    const t = setTimeout(() => setStarted(true), startDelay);
    return () => clearTimeout(t);
  }, [startDelay, videoKey]);

  useEffect(() => {
    setReady(false);
    setVisible(false);
  }, [videoKey]);

  useEffect(() => {
    const onMessage = (event) => {
      if (!ORIGINS.includes(event.origin)) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      let data;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.event === "onReady") setReady(true);
      const state =
        data?.event === "onStateChange" ? data.info : data?.info?.playerState;
      if (state === 1) {
        setReady(true);
        setVisible(true);
        callbacks.current.onPlaying?.();
      } else if (state === 0 && !loop) {
        setVisible(false);
        callbacks.current.onEnded?.();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [loop]);

  // Sync mute / play state with the player once it is ready.
  useEffect(() => {
    if (!ready) return;
    if (muted) command("mute");
    else {
      command("unMute");
      command("setVolume", [70]);
    }
  }, [muted, ready, command]);

  useEffect(() => {
    if (!ready) return;
    command(playing ? "playVideo" : "pauseVideo");
  }, [playing, ready, command]);

  // Subscribe to player events. The embedded player may not be listening yet when the
  // iframe fires `load`, so repeat the handshake until it answers (as YouTube's own API does).
  const [loadedAt, setLoadedAt] = useState(0);
  const handleLoad = () => setLoadedAt(Date.now());

  useEffect(() => {
    if (!loadedAt || ready) return undefined;
    let tries = 0;
    const send = () => {
      const win = iframeRef.current?.contentWindow;
      win?.postMessage(JSON.stringify({ event: "listening", id: videoKey, channel: "widget" }), "*");
      tries += 1;
      if (tries >= 20) clearInterval(timer);
    };
    send();
    const timer = setInterval(send, 300);
    return () => clearInterval(timer);
  }, [loadedAt, ready, videoKey]);

  if (!videoKey || !started) return null;

  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
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
  if (loop) {
    params.set("loop", "1");
    params.set("playlist", videoKey);
  }

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-700 ${
        visible ? "opacity-100" : "opacity-0"
      } ${className}`}
      style={{ containerType: "size" }}
      aria-hidden
    >
      <iframe
        ref={iframeRef}
        onLoad={handleLoad}
        src={`https://www.youtube-nocookie.com/embed/${videoKey}?${params.toString()}`}
        title="Trailer"
        tabIndex={-1}
        allow="autoplay; encrypted-media; picture-in-picture"
        // "object-fit: cover" for a 16:9 iframe, overscanned 35% to hide YouTube chrome.
        style={{ width: "max(135cqw, 240cqh)", height: "max(135cqh, 75.94cqw)" }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-0"
      />
    </div>
  );
}

export default TrailerPlayer;
