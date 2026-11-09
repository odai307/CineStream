// Turns a typed query into structured meaning, e.g.
//   "best bolywood comedy 2000s movies" →
//   { concepts: [Bollywood, Comedy], sort: "rated", type: "movie", years: 2000s,
//     corrections: [{ from: "bolywood", to: "Bollywood" }], coverage: 1 }

import { CONCEPTS, FILLER_WORDS, FORMAT_WORDS, SORT_WORDS, parseYearToken } from "./lexicon.js";
import { allowedEdits, editDistance, normalize } from "./fuzzy.js";

const MAX_PHRASE_WORDS = 3;

// phrase → match descriptor. Concepts win over format/sort words, which win over filler.
const PHRASES = new Map();
const addPhrase = (phrase, value) => {
  const key = normalize(phrase);
  if (!key) return;
  const rank = { concept: 3, format: 2, sort: 2, filler: 1 };
  const existing = PHRASES.get(key);
  if (!existing || rank[value.kind] > rank[existing.kind]) PHRASES.set(key, value);
};
CONCEPTS.forEach((concept) =>
  concept.aliases.forEach((alias) => addPhrase(alias, { kind: "concept", concept, label: concept.label }))
);
Object.entries(FORMAT_WORDS).forEach(([type, words]) =>
  words.forEach((w) => addPhrase(w, { kind: "format", value: type, label: type === "tv" ? "Series" : "Movies" }))
);
Object.entries(SORT_WORDS).forEach(([sort, words]) =>
  words.forEach((w) => addPhrase(w, { kind: "sort", value: sort, label: w }))
);
FILLER_WORDS.forEach((w) => addPhrase(w, { kind: "filler" }));

// Candidates for typo correction: real vocabulary only (not filler), 4+ letters.
const FUZZY_CANDIDATES = [...PHRASES.entries()]
  .filter(([phrase, v]) => v.kind !== "filler" && phrase.replace(/ /g, "").length >= 4)
  .map(([phrase, v]) => ({ phrase, compact: phrase.replace(/ /g, ""), value: v }));

const findTypo = (text) => {
  const compact = text.replace(/ /g, "");
  const max = allowedEdits(compact.length);
  if (max === 0) return null;
  let best = null;
  let tie = false;
  for (const cand of FUZZY_CANDIDATES) {
    const d = editDistance(compact, cand.compact, max);
    if (d > max) continue;
    if (!best || d < best.d) {
      best = { d, cand };
      tie = false;
    } else if (d === best.d && cand.value.concept?.id !== best.cand.value.concept?.id && cand.value.value !== best.cand.value.value) {
      tie = true; // e.g. equally close to two different categories: don't guess
    }
  }
  return best && !tie ? best.cand : null;
};

export const parseQuery = (raw, { fuzzy = true } = {}) => {
  const normalized = normalize(raw);
  const tokens = normalized ? normalized.split(" ") : [];
  const matches = [];
  const unmatched = [];

  // Pass 1: exact phrases (longest first) and years.
  let i = 0;
  while (i < tokens.length) {
    let hit = null;
    for (let len = Math.min(MAX_PHRASE_WORDS, tokens.length - i); len >= 1; len -= 1) {
      const phrase = tokens.slice(i, i + len).join(" ");
      const value = PHRASES.get(phrase);
      if (value) {
        hit = { ...value, text: phrase, start: i, end: i + len };
        break;
      }
    }
    if (!hit) {
      const years = parseYearToken(tokens[i]);
      if (years) hit = { kind: "year", value: years, label: years.label, text: tokens[i], start: i, end: i + 1 };
    }
    if (hit) {
      matches.push(hit);
      i = hit.end;
    } else {
      unmatched.push(i);
      i += 1;
    }
  }

  // Pass 2: typo correction for leftover words (pairs first, e.g. "romcon" or "sci fy").
  const leftover = new Set(unmatched);
  if (fuzzy) {
    for (const idx of unmatched) {
      if (!leftover.has(idx)) continue;
      if (leftover.has(idx + 1)) {
        const pair = `${tokens[idx]} ${tokens[idx + 1]}`;
        const cand = findTypo(pair);
        if (cand && cand.phrase.includes(" ")) {
          matches.push({ ...cand.value, text: pair, start: idx, end: idx + 2, corrected: true, to: cand.phrase });
          leftover.delete(idx);
          leftover.delete(idx + 1);
          continue;
        }
      }
      if (/^\d+$/.test(tokens[idx])) continue;
      const cand = findTypo(tokens[idx]);
      if (cand) {
        matches.push({ ...cand.value, text: tokens[idx], start: idx, end: idx + 1, corrected: true, to: cand.phrase });
        leftover.delete(idx);
      }
    }
  }

  matches.sort((a, b) => a.start - b.start);

  const concepts = [];
  matches
    .filter((m) => m.kind === "concept")
    .forEach((m) => {
      if (!concepts.includes(m.concept)) concepts.push(m.concept);
    });

  const formats = new Set(matches.filter((m) => m.kind === "format").map((m) => m.value));
  const type = formats.size === 1 ? [...formats][0] : null;
  const sort = matches.find((m) => m.kind === "sort")?.value || null;
  const years = matches.find((m) => m.kind === "year")?.value || null;

  // Leftover text keeps filler words *inside* names ("lord of the rings") but drops
  // them at the edges ("show me shah rukh khan" → "shah rukh khan").
  const fillerIdx = new Set(
    matches.filter((m) => m.kind === "filler").flatMap((m) => Array.from({ length: m.end - m.start }, (_, k) => m.start + k))
  );
  const keep = tokens.map((_, idx) => leftover.has(idx) || fillerIdx.has(idx));
  let first = keep.findIndex((k, idx) => k && leftover.has(idx));
  let last = -1;
  keep.forEach((k, idx) => {
    if (k && leftover.has(idx)) last = idx;
  });
  const leftoverTokens = first === -1 ? [] : tokens.slice(first, last + 1).filter((_, k) => keep[first + k]);
  const meaningful = tokens.length - matches.filter((m) => m.kind === "filler").reduce((n, m) => n + (m.end - m.start), 0);
  const understoodCount = matches
    .filter((m) => m.kind !== "filler")
    .reduce((n, m) => n + (m.end - m.start), 0);

  const corrections = matches
    .filter((m) => m.corrected)
    .map((m) => ({ from: m.text, to: m.concept?.label || m.to }));

  return {
    raw,
    normalized,
    tokens,
    matches,
    concepts,
    type,
    sort,
    years,
    corrections,
    leftover: leftoverTokens.join(" "),
    coverage: meaningful > 0 ? understoodCount / meaningful : 0,
    // Has something to build category rows from (not just "movies" or "best").
    hasFilters: concepts.length > 0 || Boolean(years),
  };
};

// Removes one interpreted piece (e.g. the "2000s" chip) and returns the new query text.
export const removeFromQuery = (parsed, match) =>
  parsed.tokens.filter((_, idx) => idx < match.start || idx >= match.end).join(" ");
