import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { readJSON, writeJSON } from "../lib/storage";

// Shared playback state: global mute preference, the single hover-preview popup,
// and the detail modal (driven by ?title=<id>&type=<movie|tv> so it is shareable).
const MediaContext = createContext(null);

const MUTE_KEY = "cinestream:muted";

export function MediaProvider({ children }) {
  const [muted, setMutedState] = useState(() => readJSON(MUTE_KEY, true));
  const [preview, setPreview] = useState(null); // { item, rect, id }
  const previewId = useRef(0);
  const [searchParams, setSearchParams] = useSearchParams();

  const setMuted = useCallback((value) => {
    setMutedState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      writeJSON(MUTE_KEY, next);
      return next;
    });
  }, []);

  const openPreview = useCallback((item, rect) => {
    previewId.current += 1;
    setPreview({ item, rect, id: previewId.current });
  }, []);

  const closePreview = useCallback(() => setPreview(null), []);

  const modalId = searchParams.get("title");
  const modal = modalId
    ? { id: modalId, mediaType: searchParams.get("type") === "tv" ? "tv" : "movie" }
    : null;

  const openModal = useCallback(
    (item) => {
      setPreview(null);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("title", String(item.id));
        next.set("type", item.media_type === "tv" ? "tv" : "movie");
        return next;
      });
    },
    [setSearchParams]
  );

  const closeModal = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("title");
      next.delete("type");
      return next;
    });
  }, [setSearchParams]);

  const value = useMemo(
    () => ({
      muted,
      setMuted,
      preview,
      openPreview,
      closePreview,
      modal,
      openModal,
      closeModal,
      // Background videos (hero) should pause while something else is playing.
      foregroundActive: Boolean(preview || modal),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [muted, setMuted, preview, openPreview, closePreview, modal?.id, modal?.mediaType, openModal, closeModal]
  );

  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
}

export const useMedia = () => {
  const ctx = useContext(MediaContext);
  if (!ctx) throw new Error("useMedia must be used inside MediaProvider");
  return ctx;
};
