// Cloud library data layer (Supabase). The client is injected so this package stays
// dependency-free and works the same on web and mobile.
//
// Rows store a small `title` snapshot so lists render without extra TMDB calls.

export const PROFILE_AVATARS = ["crimson", "ocean", "emerald", "amber", "violet", "teal", "rose", "slate"];
export const MAX_PROFILES = 5;

const unwrap = ({ data, error }) => {
  if (error) throw new Error(friendlyError(error));
  return data;
};

export const friendlyError = (error) => {
  const msg = error?.message || String(error || "Something went wrong.");
  if (/invalid login credentials/i.test(msg)) return "Incorrect email or password.";
  if (/user already registered/i.test(msg)) return "An account with this email already exists. Try signing in.";
  if (/password should be at least/i.test(msg)) return "Password is too short.";
  if (/rate limit/i.test(msg)) return "Too many attempts. Please wait a minute and try again.";
  if (/failed to fetch|network/i.test(msg)) return "Can’t reach the server. Check your connection.";
  return msg;
};

export const titleSnapshot = (item) => ({
  title: item.title ?? null,
  name: item.name ?? null,
  poster_path: item.poster_path ?? null,
  backdrop_path: item.backdrop_path ?? null,
  overview: item.overview ? item.overview.slice(0, 400) : null,
  vote_average: item.vote_average ?? null,
  release_date: item.release_date ?? null,
  first_air_date: item.first_air_date ?? null,
  genre_ids: item.genre_ids || (item.genres || []).map((g) => g.id),
});

const keyOf = (item) => ({
  media_type: item.media_type === "tv" ? "tv" : "movie",
  tmdb_id: Number(item.id),
});

// Row -> the item shape the UI already uses.
const rowToItem = (row, extra = {}) => ({
  ...(row.title || {}),
  id: row.tmdb_id,
  media_type: row.media_type,
  ...extra,
});

// ───────────── Profiles ─────────────

export const listProfiles = async (sb) =>
  unwrap(await sb.from("profiles").select("id, name, avatar, created_at").order("created_at"));

export const createProfile = async (sb, { name, avatar }) =>
  unwrap(await sb.from("profiles").insert({ name: name.trim(), avatar }).select().single());

export const updateProfile = async (sb, id, changes) =>
  unwrap(await sb.from("profiles").update(changes).eq("id", id).select().single());

export const deleteProfile = async (sb, id) => unwrap(await sb.from("profiles").delete().eq("id", id));

export const deleteAccount = async (sb) => unwrap(await sb.rpc("delete_my_account"));

// ───────────── Library ─────────────

export const loadLibrary = async (sb, profileId) => {
  const [list, ratings, history] = await Promise.all([
    sb.from("my_list").select("*").eq("profile_id", profileId).order("added_at", { ascending: false }),
    sb.from("ratings").select("media_type, tmdb_id, rating, rated_at").eq("profile_id", profileId),
    sb
      .from("watch_history")
      .select("*")
      .eq("profile_id", profileId)
      .order("watched_at", { ascending: false })
      .limit(50),
  ]);
  return {
    myList: unwrap(list).map((r) => rowToItem(r, { addedAt: Date.parse(r.added_at) })),
    likes: Object.fromEntries(
      unwrap(ratings)
        .filter((r) => r.rating > 0)
        .map((r) => [`${r.media_type}-${r.tmdb_id}`, Date.parse(r.rated_at)])
    ),
    history: unwrap(history).map((r) =>
      rowToItem(r, {
        season: r.season,
        episode: r.episode,
        episodeName: r.episode_name,
        watchedAt: Date.parse(r.watched_at),
      })
    ),
  };
};

export const addToList = async (sb, profileId, item) =>
  unwrap(
    await sb
      .from("my_list")
      .upsert({ profile_id: profileId, ...keyOf(item), title: titleSnapshot(item) }, { ignoreDuplicates: true })
  );

export const removeFromList = async (sb, profileId, item) => {
  const k = keyOf(item);
  return unwrap(
    await sb.from("my_list").delete().match({ profile_id: profileId, media_type: k.media_type, tmdb_id: k.tmdb_id })
  );
};

export const setRating = async (sb, profileId, item, rating) => {
  const k = keyOf(item);
  if (!rating) {
    return unwrap(
      await sb.from("ratings").delete().match({ profile_id: profileId, media_type: k.media_type, tmdb_id: k.tmdb_id })
    );
  }
  return unwrap(
    await sb
      .from("ratings")
      .upsert({ profile_id: profileId, ...k, rating, rated_at: new Date().toISOString() })
  );
};

export const upsertHistory = async (sb, profileId, item, progress = {}) =>
  unwrap(
    await sb.from("watch_history").upsert({
      profile_id: profileId,
      ...keyOf(item),
      title: titleSnapshot(item),
      season: progress.season ?? null,
      episode: progress.episode ?? null,
      episode_name: progress.episodeName ?? null,
      watched_at: new Date(progress.watchedAt || Date.now()).toISOString(),
    })
  );

export const removeHistory = async (sb, profileId, item) => {
  const k = keyOf(item);
  return unwrap(
    await sb
      .from("watch_history")
      .delete()
      .match({ profile_id: profileId, media_type: k.media_type, tmdb_id: k.tmdb_id })
  );
};

// Copy a guest's on-device library into a profile. Existing cloud rows win for the
// list and likes; for history the most recent entry wins.
export const mergeGuestLibrary = async (sb, profileId, { myList = [], likes = {}, history = [] }) => {
  const ops = [];
  if (myList.length) {
    ops.push(
      sb.from("my_list").upsert(
        myList.map((item) => ({
          profile_id: profileId,
          ...keyOf(item),
          title: titleSnapshot(item),
          added_at: new Date(item.addedAt || Date.now()).toISOString(),
        })),
        { ignoreDuplicates: true }
      )
    );
  }
  const likeRows = Object.entries(likes).map(([key, ts]) => {
    const [media_type, id] = key.split("-");
    return {
      profile_id: profileId,
      media_type: media_type === "tv" ? "tv" : "movie",
      tmdb_id: Number(id),
      rating: 1,
      rated_at: new Date(ts || Date.now()).toISOString(),
    };
  });
  if (likeRows.length) ops.push(sb.from("ratings").upsert(likeRows, { ignoreDuplicates: true }));
  if (history.length) {
    const { data: existing } = await sb
      .from("watch_history")
      .select("media_type, tmdb_id, watched_at")
      .eq("profile_id", profileId);
    const cloudTimes = new Map((existing || []).map((r) => [`${r.media_type}-${r.tmdb_id}`, Date.parse(r.watched_at)]));
    const newer = history.filter(
      (h) => (h.watchedAt || 0) > (cloudTimes.get(`${h.media_type === "tv" ? "tv" : "movie"}-${h.id}`) || 0)
    );
    if (newer.length) {
      ops.push(
        sb.from("watch_history").upsert(
          newer.map((h) => ({
            profile_id: profileId,
            ...keyOf(h),
            title: titleSnapshot(h),
            season: h.season ?? null,
            episode: h.episode ?? null,
            episode_name: h.episodeName ?? null,
            watched_at: new Date(h.watchedAt || Date.now()).toISOString(),
          }))
        )
      );
    }
  }
  const results = await Promise.all(ops);
  results.forEach(unwrap);
  return { list: myList.length, likes: likeRows.length, history: history.length };
};
