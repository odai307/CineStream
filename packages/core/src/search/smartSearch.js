// Smart search: understands categories ("bollywood", "90s horror"), people, franchises,
// studios and keywords, tolerates typos in category words, and returns ready-made rows.
//
// Two network round trips:
//   1. title/person search (decides whether the query is really a title)
//   2. franchise / studio / keyword lookups for whatever text is left over
// Row contents are returned as lazy `fetcher` functions so the UI only loads what's visible.

import {
  discover,
  getCollection,
  getPersonCredits,
  searchCollections,
  searchCompanies,
  searchKeywords,
  searchMultiRaw,
  searchPeople,
} from "../tmdb.js";
import { getTitle } from "../format.js";
import { normalize, similarity } from "./fuzzy.js";
import { parseQuery } from "./parse.js";
import { CONCEPTS } from "./lexicon.js";

const STRONG_TITLE = 0.9;
const STRONG_PERSON = 0.85;
const today = () => new Date().toISOString().slice(0, 10);
const hasArt = (t) => Boolean(t.backdrop_path || t.poster_path);
const isTitle = (t) => t.media_type === "movie" || t.media_type === "tv";
const nounFor = (type) => (type === "tv" ? "Series" : "Movies");
const capitalize = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

// ───────── Discover filters ─────────

const AND_KEYS = new Set(["with_genres", "with_keywords"]);
const OR_KEYS = new Set(["with_origin_country", "with_networks", "with_companies"]);

const mergeParams = (parts) => {
  const out = {};
  parts.filter(Boolean).forEach((part) => {
    Object.entries(part).forEach(([k, v]) => {
      if (out[k] === undefined) out[k] = v;
      else if (AND_KEYS.has(k)) out[k] = `${out[k]},${v}`;
      else if (OR_KEYS.has(k)) out[k] = `${out[k]}|${v}`;
      // other keys (e.g. language): first one wins
    });
  });
  return out;
};

const sortParams = (sort, type, regional) => {
  const date = type === "tv" ? "first_air_date" : "primary_release_date";
  switch (sort) {
    case "rated":
      return { sort_by: "vote_average.desc", "vote_count.gte": regional ? 25 : 300 };
    case "newest":
      return { sort_by: `${date}.desc`, [`${date}.lte`]: today(), "vote_count.gte": regional ? 1 : 10 };
    case "upcoming":
      return { sort_by: "popularity.desc", [`${date}.gte`]: today() };
    case "classic":
      return { sort_by: "vote_average.desc", [`${date}.lte`]: "1989-12-31", "vote_count.gte": regional ? 10 : 100 };
    default:
      return { sort_by: "popularity.desc", "vote_count.gte": regional ? 3 : 50 };
  }
};

const yearParams = (years, type) => {
  if (!years) return null;
  const date = type === "tv" ? "first_air_date" : "primary_release_date";
  return { [`${date}.gte`]: `${years.from}-01-01`, [`${date}.lte`]: `${years.to}-12-31` };
};

// Discover params for this type, or null if a concept doesn't apply to it (e.g. horror series).
const filtersFor = (parsed, type, extra = []) => {
  const parts = [];
  for (const concept of parsed.concepts) {
    if (concept[type] === null || concept[type] === undefined) return null;
    parts.push(concept[type]);
  }
  return mergeParams([...parts, ...extra]);
};

const SORT_PREFIX = { popular: "Popular", rated: "Top Rated", newest: "New", upcoming: "Upcoming", classic: "Classic" };

const rowTitle = ({ sort, labels, type, years }) => {
  const prefix = SORT_PREFIX[sort] || "Popular";
  const subject = labels.filter(Boolean).join(" ");
  const suffix = years ? (years.from === years.to ? ` from ${years.from}` : ` from the ${years.label}`) : "";
  return `${prefix} ${subject ? `${subject} ` : ""}${nounFor(type)}${suffix}`.replace(/\s+/g, " ").trim();
};

const discoverFetcher = (type, params) => () => discover(type, params).then((r) => r.results.filter(hasArt));

// Category rows (e.g. "Popular Bollywood Movies", "Top Rated Bollywood Movies", "Popular Bollywood Series").
const buildFilterRows = (parsed, { extra = [], extraLabels = [], keyPrefix = "cat" } = {}) => {
  const regional = parsed.concepts.some((c) => c.regional) || extra.length > 0;
  const preferred = parsed.type || parsed.concepts.find((c) => c.prefer)?.prefer || "movie";
  const types = parsed.type ? [parsed.type] : [preferred, preferred === "movie" ? "tv" : "movie"];
  // Keyword first reads naturally: "Zombie Comedy Movies".
  const labels = [...extraLabels, ...parsed.concepts.map((c) => c.label)];
  const rows = [];

  types.forEach((type, index) => {
    const base = filtersFor(parsed, type, extra);
    if (!base) return;
    const yp = yearParams(parsed.years, type);
    const sorts = parsed.sort
      ? [parsed.sort]
      : index === 0
      ? ["popular", "rated", ...(parsed.years ? [] : ["newest"])]
      : ["popular", "rated"];
    sorts.forEach((sort) => {
      if (sort === "upcoming" && type === "tv") return;
      const params = mergeParams([base, sortParams(sort, type, regional), yp]);
      rows.push({
        key: `${keyPrefix}-${type}-${sort}`,
        title: rowTitle({ sort, labels, type, years: parsed.years }),
        type,
        fetcher: discoverFetcher(type, params),
      });
    });
  });
  return rows;
};

// ───────── Entities ─────────

const pickPerson = (results, text) => {
  if (!text) return null;
  const people = results.filter((r) => r.media_type === "person");
  let best = null;
  for (const p of people) {
    const score = similarity(p.name, text);
    // People without a photo only count on an exact name match (thin data, e.g. Nollywood).
    if (!p.profile_path && (score < 0.95 || !normalize(text).includes(" "))) continue;
    if (score >= STRONG_PERSON && (!best || score > best.score || (score === best.score && p.popularity > best.person.popularity))) {
      best = { person: p, score };
    }
  }
  return best?.person || null;
};

// Names written in English from Hindi, Arabic, Yoruba… have many spellings
// ("Amir"/"Aamir", "Dipika"/"Deepika", "Rahul"/"Raahul"). TMDB search is exact, so
// we try a few common spelling swaps, one change at a time.
const SPELLING_SWAPS = [
  [/^a(?!a)/, "aa"],
  [/^aa/, "a"],
  [/ee/, "i"],
  [/i/, "ee"],
  [/oo/, "u"],
  [/u/, "oo"],
  [/aa/, "a"],
  [/w/, "v"],
  [/v/, "w"],
  [/ph/, "f"],
  [/f/, "ph"],
];

export const nameVariants = (text, limit = 6) => {
  const words = normalize(text).split(" ");
  const out = new Set();
  for (const [pattern, replacement] of SPELLING_SWAPS) {
    words.forEach((word, i) => {
      if (word.length < 3 || !pattern.test(word)) return;
      const changed = [...words];
      changed[i] = word.replace(pattern, replacement);
      out.add(changed.join(" "));
    });
  }
  out.delete(normalize(text));
  return [...out].slice(0, limit);
};

const isObscurePerson = (p) => !p || (p.popularity || 0) < 0.5;

const personRow = (person, parsed) => {
  const directing = person.known_for_department === "Directing";
  const genreFilter = parsed.concepts.filter((c) => c.kind === "genre" || c.kind === "mood");
  return {
    key: `person-${person.id}`,
    title: directing ? `Directed by ${person.name}` : `Starring ${person.name}`,
    type: parsed.type || null,
    fetcher: async () => {
      const credits = await getPersonCredits(person.id);
      const pool = directing ? (credits.crew || []).filter((c) => c.job === "Director") : credits.cast || [];
      const seen = new Set();
      const credible = pool.filter((t) => (t.vote_count || 0) >= 3);
      // Actors from smaller industries often have few votes on TMDB; show everything with artwork then.
      return (credible.length >= 6 ? credible : pool)
        .filter((t) => isTitle(t) && hasArt(t))
        // Skip talk shows, reality, news and "as themselves" appearances.
        .filter((t) => !(t.genre_ids || []).some((g) => g === 10767 || g === 10763 || g === 10764))
        .filter((t) => !/^(self|himself|herself|themselves|host)\b|\(self\)|\bhost\b/i.test(t.character || ""))
        .filter((t) => !parsed.type || t.media_type === parsed.type)
        .filter((t) =>
          genreFilter.every((c) => {
            const want = c[t.media_type]?.with_genres;
            if (!want) return true;
            return want.split(/[|,]/).some((g) => (t.genre_ids || []).includes(Number(g)));
          })
        )
        .filter((t) => {
          const k = `${t.media_type}-${t.id}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    },
  };
};

const bareName = (s) => normalize(s).replace(/^the /, "").replace(/ (collection|franchise|series)$/, "");

const collectionRows = (collections, text) => {
  const norm = bareName(text);
  if (norm.length < 3) return [];
  const matching = collections.filter((c) => bareName(c.name) === norm);
  // "the batman" prefers "The Batman Collection" over "Batman Collection".
  const exact = matching.filter((c) => normalize(c.name).replace(/ collection$/, "") === normalize(text));
  return (exact.length ? exact : matching)
    .slice(0, 1)
    .map((c) => ({
      key: `collection-${c.id}`,
      title: c.name,
      type: "movie",
      fetcher: async () => {
        const data = await getCollection(c.id);
        return (data.parts || [])
          .filter(hasArt)
          .map((p) => ({ ...p, media_type: "movie" }))
          .sort((a, b) => (a.release_date || "9999").localeCompare(b.release_date || "9999"));
      },
    }));
};

// Well-known studios live in the lexicon; other companies must match by exact name.
const pickCompany = (companies, text) => {
  const norm = normalize(text);
  if (norm.length < 3) return null;
  return companies.find((c) => normalize(c.name) === norm) || null;
};

const pickKeyword = (keywords, text) => {
  const norm = normalize(text);
  if (norm.length < 3) return null;
  const variants = new Set([norm, `${norm}s`, norm.replace(/s$/, ""), norm.replace(/ies$/, "y")]);
  return keywords.find((k) => variants.has(normalize(k.name))) || null;
};

// ───────── Main entry ─────────

export const smartSearch = async (query, { exact = false } = {}) => {
  const trimmed = (query || "").trim();
  const empty = { query: trimmed, rows: [], titles: [], people: [], chips: [], corrections: [], topResult: null, totalPages: 0 };
  if (!trimmed) return empty;

  const exactParse = parseQuery(trimmed, { fuzzy: false });
  const fuzzyParse = exact ? exactParse : parseQuery(trimmed, { fuzzy: true });

  // 1) Titles and people for the full text, plus for the leftover text ("shah rukh khan" in "shah rukh khan movies").
  const leftoverExact = exactParse.leftover;
  const [full, partial] = await Promise.all([
    searchMultiRaw(trimmed),
    leftoverExact && leftoverExact !== exactParse.normalized ? searchMultiRaw(leftoverExact) : null,
  ]);
  const raw = [...full.results, ...(partial?.results || [])];

  const normQuery = normalize(trimmed);
  const titleScore = (t) => {
    const name = normalize(getTitle(t));
    // "indiana jones" → "Indiana Jones and the Last Crusade"
    // Prefix matches only count for well-known titles ("time travel" ≠ "Time Travel Girl").
    if (normQuery.length >= 6 && normQuery.includes(" ") && name.startsWith(`${normQuery} `) && (t.vote_count || 0) >= 300) {
      return 0.92;
    }
    return Math.max(similarity(getTitle(t), trimmed), leftoverExact ? similarity(getTitle(t), leftoverExact) : 0);
  };
  const notObscure = (t) => (t.vote_count || 0) >= 20 || (t.popularity || 0) >= 3;
  const strongTitle = full.results
    .filter((t) => isTitle(t) && hasArt(t) && notObscure(t))
    .map((t) => ({ t, s: titleScore(t) }))
    .filter((x) => x.s >= STRONG_TITLE)
    .sort((a, b) => b.s - a.s || (b.t.popularity || 0) - (a.t.popularity || 0))[0]?.t;

  // A typo "correction" never overrides a real title ("indiana jones" is not "Indian"),
  // and a word that appears in the matching titles isn't a typo.
  const titleWords = new Set(
    full.results.slice(0, 10).filter(isTitle).flatMap((t) => normalize(getTitle(t)).split(" "))
  );
  const typoIsRealWord = fuzzyParse.corrections.some((c) => c.from.split(" ").every((w) => titleWords.has(w)));
  const parsed = fuzzyParse.corrections.length && (strongTitle || typoIsRealWord) ? exactParse : fuzzyParse;
  const entityText = parsed.leftover;

  // 2) Franchise / studio / keyword lookups on the leftover text.
  const lookups = entityText && entityText.length >= 3;
  let person = pickPerson(raw, entityText);
  // If the only name match is obscure ("Amir Khan" the boxer), also try alternate spellings.
  const tryVariants =
    !exact && !strongTitle && lookups && entityText.length >= 4 && parsed.concepts.length === 0 && isObscurePerson(person);
  const [collections, companies, keywords, variantPeople] = await Promise.all([
    lookups ? searchCollections(entityText).catch(() => []) : [],
    lookups ? searchCompanies(entityText).catch(() => []) : [],
    lookups ? searchKeywords(entityText).catch(() => []) : [],
    tryVariants
      ? Promise.all(nameVariants(entityText).map((v) => searchPeople(v).catch(() => []))).then((r) => r.flat())
      : [],
  ]);

  const personCorrections = [];
  const famousVariant = variantPeople
    .filter((p) => p.profile_path && !isObscurePerson(p) && similarity(p.name, entityText) >= 0.8)
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0];
  if (famousVariant && (!person || famousVariant.popularity > (person.popularity || 0) * 5)) {
    person = { ...famousVariant, media_type: "person" };
    personCorrections.push({ from: entityText, to: famousVariant.name });
  }
  const collRows = !person ? collectionRows(collections, entityText) : [];
  const company = !person && !collRows.length ? pickCompany(companies, entityText) : null;
  const keyword = !person && !company && !collRows.length ? pickKeyword(keywords, entityText) : null;

  // The whole query is understood when every word is a category/format/sort/year or the
  // leftover is fully explained by a studio or keyword ("zombie comedy", "pixar movies").
  const leftoverExplained = Boolean(company || keyword);
  const fullyUnderstood = Boolean(
    (parsed.coverage === 1 && (parsed.hasFilters || (parsed.sort && parsed.type))) ||
      (leftoverExplained && (parsed.coverage > 0 || !strongTitle))
  );

  // ── Rows ──
  const entityRows = [];
  collRows.forEach((r) => entityRows.push(r));
  if (person) entityRows.push(personRow(person, parsed));

  let filterRows = [];
  if (company) {
    filterRows = buildFilterRows(parsed, {
      extra: [{ with_companies: String(company.id) }],
      extraLabels: [],
      keyPrefix: `company-${company.id}`,
    }).map((r) => ({ ...r, title: r.title.replace(/ (Movies|Series)/, ` $1 from ${company.name}`) }));
  } else if (keyword) {
    filterRows = buildFilterRows(parsed, {
      extra: [{ with_keywords: String(keyword.id) }],
      extraLabels: [capitalize(keyword.name)],
      keyPrefix: `kw-${keyword.id}`,
    });
  } else if (parsed.hasFilters && (fullyUnderstood || parsed.coverage >= 0.5) && !(strongTitle && parsed.coverage < 1)) {
    filterRows = buildFilterRows(parsed);
  } else if (parsed.coverage === 1 && parsed.sort && !strongTitle) {
    // "best movies", "new series"
    filterRows = buildFilterRows({ ...parsed, concepts: [] });
  }

  const rows = fullyUnderstood ? [...filterRows, ...entityRows] : [...entityRows, ...filterRows];

  // ── Titles grid & people ──
  const seen = new Set();
  const titles = raw
    .filter((t) => isTitle(t) && hasArt(t))
    .filter((t) => {
      const k = `${t.media_type}-${t.id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  const people = raw
    .filter((r) => r.media_type === "person" && r.profile_path && (r.popularity || 0) > 1)
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
    .slice(0, 12);

  let topResult = null;
  // A franchise row beats a single title, unless that title is a big film in its own right ("the batman").
  const bigTitle = strongTitle && (strongTitle.vote_count || 0) >= 1000 && titleScore(strongTitle) >= 0.99;
  if (strongTitle && !fullyUnderstood && (!collRows.length || bigTitle)) topResult = { kind: "title", item: strongTitle };
  else if (
    person &&
    !isObscurePerson(person) &&
    (personCorrections.length || similarity(person.name, entityText) >= 0.95) &&
    !parsed.hasFilters
  ) {
    topResult = { kind: "person", person };
  }

  // ── What we understood (shown as removable chips) ──
  const chips = parsed.matches
    .filter((m) => m.kind !== "filler")
    .map((m) => ({
      kind: m.kind,
      label: m.kind === "sort" ? SORT_PREFIX[m.value] || capitalize(m.text) : m.label,
      match: m,
    }));
  if (person) chips.push({ kind: "person", label: person.name });
  if (company) chips.push({ kind: "company", label: company.name });
  if (keyword) chips.push({ kind: "keyword", label: capitalize(keyword.name) });
  collRows.forEach((r) => chips.push({ kind: "collection", label: r.title }));

  return {
    query: trimmed,
    parsed,
    corrections: [...parsed.corrections, ...personCorrections],
    chips: rows.length ? chips : [],
    topResult,
    rows,
    titles: topResult?.kind === "title" ? titles.filter((t) => t.id !== topResult.item.id) : titles,
    people: topResult?.kind === "person" ? people.filter((p) => p.id !== topResult.person.id) : people,
    totalPages: full.totalPages,
    understood: fullyUnderstood,
  };
};

// More title matches for infinite scroll on the results page.
export const searchTitlesPage = async (query, page) => {
  const { results, totalPages } = await searchMultiRaw(query, page);
  return { titles: results.filter((t) => isTitle(t) && hasArt(t)), totalPages };
};

// ───────── Autocomplete ─────────

export const suggestCategories = (query, limit = 3) => {
  const norm = normalize(query);
  if (norm.length < 2) return [];
  const parsed = parseQuery(query);
  const found = [...parsed.concepts];
  // Prefix matches while typing ("bol" → Bollywood).
  if (found.length < limit) {
    for (const concept of CONCEPTS) {
      if (found.includes(concept)) continue;
      if (concept.aliases.some((a) => normalize(a).startsWith(norm))) found.push(concept);
      if (found.length >= limit) break;
    }
  }
  return found.slice(0, limit).map((c) => ({ kind: "category", label: c.label, query: c.aliases[0], conceptKind: c.kind }));
};

export const suggest = async (query) => {
  const categories = suggestCategories(query);
  const trimmed = (query || "").trim();
  if (trimmed.length < 2) return { categories, titles: [], people: [] };
  const { results } = await searchMultiRaw(trimmed);
  return {
    categories,
    titles: results.filter((t) => isTitle(t) && hasArt(t)).slice(0, 6),
    people: results.filter((r) => r.media_type === "person" && r.profile_path).slice(0, 2),
  };
};
