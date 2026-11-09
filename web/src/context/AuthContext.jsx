import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { readJSON, writeJSON } from "../lib/storage";
import {
  createProfile,
  deleteAccount as deleteAccountRpc,
  deleteProfile,
  friendlyError,
  listProfiles,
  updateProfile,
} from "../lib/tmdb";

// Optional accounts. Signed-out visitors are "guests" and everything still works;
// signing in adds profiles and cross-device sync.
const AuthContext = createContext(null);

const activeKey = (userId) => `cinestream:active-profile:${userId}`;

const fail = (error) => {
  throw new Error(friendlyError(error));
};

export function AuthProvider({ children }) {
  const enabled = Boolean(supabase);
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [profiles, setProfiles] = useState(null);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [recovering, setRecovering] = useState(false);

  const user = session?.user || null;
  const userId = user?.id || null;
  // Token refreshes replace the user object; effects key on the id instead.
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return undefined;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const refreshProfiles = useCallback(async () => {
    const user = userRef.current;
    if (!supabase || !user) return [];
    let list = await listProfiles(supabase);
    // Accounts created before the database trigger existed get a default profile.
    if (list.length === 0) {
      await createProfile(supabase, {
        name: user.user_metadata?.name || user.email?.split("@")[0] || "Me",
        avatar: "crimson",
      });
      list = await listProfiles(supabase);
    }
    setProfiles(list);
    return list;
  }, []);

  // Load profiles whenever the signed-in user changes, and restore the last choice.
  useEffect(() => {
    let alive = true;
    setProfiles(null);
    setActiveProfileId(null);
    if (!userId) return undefined;
    refreshProfiles()
      .then((list) => {
        if (!alive) return;
        const saved = readJSON(activeKey(userId), null);
        if (list.some((p) => p.id === saved)) setActiveProfileId(saved);
        else if (list.length === 1) setActiveProfileId(list[0].id);
      })
      .catch(() => alive && setProfiles([]));
    return () => {
      alive = false;
    };
  }, [userId, refreshProfiles]);

  const selectProfile = useCallback(
    (id) => {
      setActiveProfileId(id);
      if (userId) writeJSON(activeKey(userId), id);
    },
    [userId]
  );

  const signUp = useCallback(async ({ name, email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });
    if (error) fail(error);
    // With "Confirm email" turned on, there is no session until the link is clicked.
    return { needsConfirmation: !data.session };
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) fail(error);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/account?reset=1`,
    });
    if (error) fail(error);
  }, []);

  const updatePassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) fail(error);
    setRecovering(false);
  }, []);

  const addProfile = useCallback(
    async (input) => {
      const created = await createProfile(supabase, input);
      await refreshProfiles();
      return created;
    },
    [refreshProfiles]
  );

  const editProfile = useCallback(
    async (id, changes) => {
      await updateProfile(supabase, id, changes);
      await refreshProfiles();
    },
    [refreshProfiles]
  );

  const removeProfile = useCallback(
    async (id) => {
      await deleteProfile(supabase, id);
      const list = await refreshProfiles();
      if (id === activeProfileId) selectProfile(list[0]?.id || null);
    },
    [refreshProfiles, activeProfileId, selectProfile]
  );

  const deleteAccount = useCallback(async () => {
    await deleteAccountRpc(supabase);
    if (userId) {
      try {
        window.localStorage.removeItem(activeKey(userId));
      } catch {
        // ignore
      }
    }
    await supabase.auth.signOut();
  }, [userId]);

  const activeProfile = profiles?.find((p) => p.id === activeProfileId) || null;

  const value = useMemo(
    () => ({
      enabled,
      loading: session === undefined || (Boolean(user) && profiles === null),
      user,
      profiles: profiles || [],
      activeProfile,
      // Signed in with several profiles but none chosen yet → show "Who's watching?".
      needsProfileChoice: Boolean(user && profiles && profiles.length > 1 && !activeProfile),
      recovering,
      selectProfile,
      signUp,
      signIn,
      signOut,
      sendPasswordReset,
      updatePassword,
      addProfile,
      editProfile,
      removeProfile,
      deleteAccount,
    }),
    [enabled, session, user, profiles, activeProfile, recovering, selectProfile, signUp, signIn, signOut, sendPasswordReset, updatePassword, addProfile, editProfile, removeProfile, deleteAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
