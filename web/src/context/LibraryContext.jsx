import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { readJSON, slimTitle, titleKey, writeJSON } from "../lib/storage";
import { supabase } from "../lib/supabase";
import {
  addToList,
  loadLibrary,
  mergeGuestLibrary,
  removeFromList,
  removeHistory,
  setRating,
  upsertHistory,
} from "../lib/tmdb";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

// My List, likes and Continue Watching.
// - Guest: stored in this browser (localStorage).
// - Signed in: stored per profile in Supabase. Updates are optimistic; on failure the
//   library reloads from the server so the UI never drifts from what's saved.
// When a guest signs in, their on-device library is merged into the chosen profile.
const LibraryContext = createContext(null);

const LIST_KEY = "cinestream:my-list";
const LIKES_KEY = "cinestream:likes";
const HISTORY_KEY = "cinestream:history";
const HISTORY_LIMIT = 30;

const EMPTY = { owner: "cloud", myList: [], likes: {}, history: [] };

// `owner` marks whose data is in state, so a profile library is never written to guest storage.
const readGuest = () => ({
  owner: "guest",
  myList: readJSON(LIST_KEY, []),
  likes: readJSON(LIKES_KEY, {}),
  history: readJSON(HISTORY_KEY, []),
});

const clearGuest = () => {
  writeJSON(LIST_KEY, []);
  writeJSON(LIKES_KEY, {});
  writeJSON(HISTORY_KEY, []);
};

export function LibraryProvider({ children }) {
  const { activeProfile, loading: authLoading } = useAuth();
  const toast = useToast();
  const profileId = activeProfile?.id || null;
  const cloud = Boolean(supabase && profileId);

  const [state, setState] = useState(() => (cloud ? EMPTY : readGuest()));
  const [syncing, setSyncing] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Load the right library whenever we switch between guest and a profile.
  useEffect(() => {
    if (authLoading) return undefined;
    if (!cloud) {
      setState(readGuest());
      return undefined;
    }
    let alive = true;
    setSyncing(true);
    setState(EMPTY);
    (async () => {
      try {
        const guest = readGuest();
        const hasGuestData = guest.myList.length || guest.history.length || Object.keys(guest.likes).length;
        if (hasGuestData) {
          const merged = await mergeGuestLibrary(supabase, profileId, guest);
          clearGuest();
          const count = merged.list + merged.history;
          if (alive && count) toast(`Saved ${count} title${count === 1 ? "" : "s"} from this device to your profile`, { tone: "success" });
        }
        const lib = await loadLibrary(supabase, profileId);
        if (alive) setState({ owner: "cloud", ...lib });
      } catch (err) {
        if (alive) toast(err.message || "Couldn’t load your library.", { tone: "error" });
      } finally {
        if (alive) setSyncing(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [cloud, profileId, authLoading, toast]);

  // Guest mode persists locally and stays in sync across tabs.
  useEffect(() => {
    if (cloud || state.owner !== "guest") return;
    writeJSON(LIST_KEY, state.myList);
    writeJSON(LIKES_KEY, state.likes);
    writeJSON(HISTORY_KEY, state.history);
  }, [cloud, state]);

  useEffect(() => {
    if (cloud) return undefined;
    const onStorage = (e) => {
      if ([LIST_KEY, LIKES_KEY, HISTORY_KEY].includes(e.key)) setState(readGuest());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [cloud]);

  // Run a cloud write; if it fails, tell the user and resync from the server.
  const persist = useCallback(
    (write) => {
      if (!cloud) return;
      write().catch(async (err) => {
        toast(err.message || "Couldn’t save that change.", { tone: "error" });
        try {
          const lib = await loadLibrary(supabase, profileId);
          setState({ owner: "cloud", ...lib });
        } catch {
          // keep optimistic state
        }
      });
    },
    [cloud, profileId, toast]
  );

  const isInList = useCallback(
    (item) => state.myList.some((entry) => titleKey(entry) === titleKey(item)),
    [state.myList]
  );

  const toggleList = useCallback(
    (item) => {
      const key = titleKey(item);
      const exists = stateRef.current.myList.some((e) => titleKey(e) === key);
      setState((prev) => ({
        ...prev,
        myList: exists
          ? prev.myList.filter((e) => titleKey(e) !== key)
          : [{ ...slimTitle(item), addedAt: Date.now() }, ...prev.myList],
      }));
      toast(exists ? "Removed from My List" : "Added to My List", { duration: 2000 });
      persist(() => (exists ? removeFromList(supabase, profileId, item) : addToList(supabase, profileId, item)));
    },
    [persist, profileId, toast]
  );

  const isLiked = useCallback((item) => Boolean(state.likes[titleKey(item)]), [state.likes]);

  const toggleLike = useCallback(
    (item) => {
      const key = titleKey(item);
      const liked = Boolean(stateRef.current.likes[key]);
      setState((prev) => {
        const likes = { ...prev.likes };
        if (liked) delete likes[key];
        else likes[key] = Date.now();
        return { ...prev, likes };
      });
      persist(() => setRating(supabase, profileId, item, liked ? 0 : 1));
    },
    [persist, profileId]
  );

  const recordWatch = useCallback(
    (item, progress = {}) => {
      const entry = {
        ...slimTitle(item),
        season: progress.season ?? null,
        episode: progress.episode ?? null,
        episodeName: progress.episodeName ?? null,
        watchedAt: Date.now(),
      };
      const key = titleKey(item);
      setState((prev) => ({
        ...prev,
        history: [entry, ...prev.history.filter((e) => titleKey(e) !== key)].slice(0, HISTORY_LIMIT),
      }));
      persist(() => upsertHistory(supabase, profileId, item, progress));
    },
    [persist, profileId]
  );

  const removeFromHistory = useCallback(
    (item) => {
      const key = titleKey(item);
      setState((prev) => ({ ...prev, history: prev.history.filter((e) => titleKey(e) !== key) }));
      persist(() => removeHistory(supabase, profileId, item));
    },
    [persist, profileId]
  );

  const getProgress = useCallback(
    (item) => state.history.find((e) => titleKey(e) === titleKey(item)) || null,
    [state.history]
  );

  const value = useMemo(
    () => ({
      mode: cloud ? "cloud" : "guest",
      syncing,
      myList: state.myList,
      history: state.history,
      isInList,
      toggleList,
      isLiked,
      toggleLike,
      recordWatch,
      removeFromHistory,
      getProgress,
    }),
    [cloud, syncing, state, isInList, toggleList, isLiked, toggleLike, recordWatch, removeFromHistory, getProgress]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export const useLibrary = () => {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside LibraryProvider");
  return ctx;
};
