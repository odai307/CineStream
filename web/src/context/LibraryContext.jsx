import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { readJSON, slimTitle, titleKey, writeJSON } from "../lib/storage";

// My List, likes, and Continue Watching — stored per-browser in localStorage.
const LibraryContext = createContext(null);

const LIST_KEY = "cinestream:my-list";
const LIKES_KEY = "cinestream:likes";
const HISTORY_KEY = "cinestream:history";
const HISTORY_LIMIT = 24;

export function LibraryProvider({ children }) {
  const [myList, setMyList] = useState(() => readJSON(LIST_KEY, []));
  const [likes, setLikes] = useState(() => readJSON(LIKES_KEY, {}));
  const [history, setHistory] = useState(() => readJSON(HISTORY_KEY, []));

  useEffect(() => writeJSON(LIST_KEY, myList), [myList]);
  useEffect(() => writeJSON(LIKES_KEY, likes), [likes]);
  useEffect(() => writeJSON(HISTORY_KEY, history), [history]);

  // Keep tabs in sync.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LIST_KEY) setMyList(readJSON(LIST_KEY, []));
      if (e.key === LIKES_KEY) setLikes(readJSON(LIKES_KEY, {}));
      if (e.key === HISTORY_KEY) setHistory(readJSON(HISTORY_KEY, []));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isInList = useCallback(
    (item) => myList.some((entry) => titleKey(entry) === titleKey(item)),
    [myList]
  );

  const toggleList = useCallback((item) => {
    setMyList((prev) => {
      const key = titleKey(item);
      return prev.some((entry) => titleKey(entry) === key)
        ? prev.filter((entry) => titleKey(entry) !== key)
        : [{ ...slimTitle(item), addedAt: Date.now() }, ...prev];
    });
  }, []);

  const isLiked = useCallback((item) => Boolean(likes[titleKey(item)]), [likes]);

  const toggleLike = useCallback((item) => {
    setLikes((prev) => {
      const key = titleKey(item);
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = Date.now();
      return next;
    });
  }, []);

  const recordWatch = useCallback((item, progress = {}) => {
    setHistory((prev) => {
      const key = titleKey(item);
      const entry = {
        ...slimTitle(item),
        season: progress.season ?? null,
        episode: progress.episode ?? null,
        episodeName: progress.episodeName ?? null,
        watchedAt: Date.now(),
      };
      return [entry, ...prev.filter((e) => titleKey(e) !== key)].slice(0, HISTORY_LIMIT);
    });
  }, []);

  const removeFromHistory = useCallback((item) => {
    setHistory((prev) => prev.filter((e) => titleKey(e) !== titleKey(item)));
  }, []);

  const getProgress = useCallback(
    (item) => history.find((e) => titleKey(e) === titleKey(item)) || null,
    [history]
  );

  const value = useMemo(
    () => ({
      myList,
      history,
      isInList,
      toggleList,
      isLiked,
      toggleLike,
      recordWatch,
      removeFromHistory,
      getProgress,
    }),
    [myList, history, isInList, toggleList, isLiked, toggleLike, recordWatch, removeFromHistory, getProgress]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export const useLibrary = () => {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside LibraryProvider");
  return ctx;
};
