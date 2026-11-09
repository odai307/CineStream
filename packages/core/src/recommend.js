// Lightweight, explainable recommendations built from a profile's own activity.
// Phase 1: "Because you watched X" (TMDB recommendations for a recent title).
// Phase 2: "Top picks for you" (discover by the profile's strongest genres).

import { discover, getFullDetails, normalizeType } from "./tmdb.js";

const key = (t) => `${normalizeType(t.media_type)}-${t.id}`;

// Weighted genre counts: likes > list > watched.
export const genreAffinity = ({ history = [], myList = [], likedItems = [] }) => {
  const scores = { movie: {}, tv: {} };
  const add = (items, weight) =>
    items.forEach((item) => {
      const type = normalizeType(item.media_type);
      (item.genre_ids || []).forEach((g) => {
        scores[type][g] = (scores[type][g] || 0) + weight;
      });
    });
  add(history, 1);
  add(myList, 2);
  add(likedItems, 3);
  return scores;
};

export const topGenres = (scoresForType, n = 2) =>
  Object.entries(scoresForType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id]) => Number(id));

// Returns [{ title, items }] rows, excluding things the profile already has.
export const buildPersonalRows = async ({ history = [], myList = [], likedItems = [] }) => {
  const seen = new Set([...history, ...myList].map(key));
  const fresh = (items) =>
    items.filter((t) => (t.backdrop_path || t.poster_path) && !seen.has(key(t)));
  const rows = [];

  // "Because you watched…" for the two most recent distinct titles.
  const seeds = history.slice(0, 2);
  const seedResults = await Promise.allSettled(
    seeds.map((s) => getFullDetails(s.id, s.media_type))
  );
  seedResults.forEach((res, i) => {
    if (res.status !== "fulfilled") return;
    const type = normalizeType(seeds[i].media_type);
    const recs = [
      ...(res.value.recommendations?.results || []),
      ...(res.value.similar?.results || []),
    ]
      .map((t) => ({ ...t, media_type: t.media_type || type }))
      .filter((t, idx, arr) => arr.findIndex((x) => key(x) === key(t)) === idx);
    const items = fresh(recs);
    if (items.length >= 4) {
      const name = seeds[i].title || seeds[i].name || "that";
      rows.push({ key: `because-${key(seeds[i])}`, title: `Because you watched ${name}`, items });
    }
  });

  // "Top picks" from the dominant format's strongest genres.
  const scores = genreAffinity({ history, myList, likedItems });
  const total = (s) => Object.values(s).reduce((a, b) => a + b, 0);
  const type = total(scores.tv) > total(scores.movie) ? "tv" : "movie";
  const genres = topGenres(scores[type], 2);
  if (genres.length) {
    try {
      const { results } = await discover(type, {
        with_genres: genres.join("|"),
        "vote_count.gte": 200,
        sort_by: "popularity.desc",
      });
      const items = fresh(results);
      if (items.length >= 4) rows.unshift({ key: "top-picks", title: "Top Picks for You", items });
    } catch {
      // personal rows are a bonus; never block the page
    }
  }

  return rows;
};
