// Offline tests for query understanding. Run: npm test (from the repo root)
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuery } from "../src/search/parse.js";
import { editDistance, normalize } from "../src/search/fuzzy.js";

const ids = (q, opts) => parseQuery(q, opts).concepts.map((c) => c.id);

test("normalize handles punctuation, accents and symbols", () => {
  assert.equal(normalize("Sci-Fi & K-Drama's '90s!"), "sci fi and k dramas 90s");
  assert.equal(normalize("Disney+"), "disney plus");
  assert.equal(normalize("Amélie"), "amelie");
});

test("edit distance counts transpositions as one edit", () => {
  assert.equal(editDistance("anmie", "anime"), 1);
  assert.equal(editDistance("bolywood", "bollywood"), 1);
});

const cases = [
  // query, concepts, type, sort, years
  ["bollywood", ["bollywood"]],
  ["Bollywood movies", ["bollywood"], "movie"],
  ["best bollywood comedy 2000s", ["bollywood", "comedy"], null, "rated", "2000s"],
  ["nollywood", ["nollywood"]],
  ["naija movies", ["nollywood"], "movie"],
  ["ghallywood", ["ghanaian"]],
  ["kumawood", ["ghanaian"]],
  ["kdrama", ["kdrama"]],
  ["k-drama", ["kdrama"]],
  ["show me some korean drama series", ["kdrama"], "tv"],
  ["korean movies", ["korean"], "movie"],
  ["anime", ["anime"]],
  ["90s horror", ["horror"], null, null, "1990s"],
  ["nineties comedy", ["comedy"], null, null, "1990s"],
  ["feel-good movies", ["feel-good"], "movie"],
  ["rom com", ["romcom"]],
  ["Disney+ series", ["disney-plus"], "tv"],
  ["netflix shows", ["netflix"], "tv"],
  ["a24 horror", ["a24", "horror"]],
  ["new turkish series", ["turkish"], "tv", "newest"],
  ["top rated anime", ["anime"], null, "rated"],
  ["telenovelas", ["telenovela"]],
];

for (const [q, concepts, type = null, sort = null, years = null] of cases) {
  test(`understands "${q}"`, () => {
    const p = parseQuery(q);
    assert.deepEqual(p.concepts.map((c) => c.id), concepts);
    assert.equal(p.type, type);
    assert.equal(p.sort, sort);
    assert.equal(p.years?.label ?? null, years);
    assert.equal(p.coverage, 1);
  });
}

const typos = [
  ["bolywood", "bollywood"],
  ["nolywood", "nollywood"],
  ["anmie", "anime"],
  ["horor", "horror"],
  ["romcon", "romcom"],
  ["sci-fy", "scifi"],
  ["documentry", "documentary"],
  ["comdy", "comedy"],
];

for (const [q, concept] of typos) {
  test(`corrects typo "${q}" → ${concept}`, () => {
    const p = parseQuery(q);
    assert.deepEqual(p.concepts.map((c) => c.id), [concept]);
    assert.equal(p.corrections.length, 1);
  });
}

test("short words are never 'corrected' into categories", () => {
  for (const q of ["heat", "cars", "jaws", "up", "her", "it"]) {
    assert.deepEqual(ids(q), [], q);
  }
});

test("exact mode turns off typo correction", () => {
  assert.deepEqual(ids("bolywood", { fuzzy: false }), []);
});

test("titles are left as free text", () => {
  for (const q of ["inception", "harry potter", "the dark knight", "mad max"]) {
    const p = parseQuery(q);
    assert.equal(p.concepts.length, 0, q);
    assert.ok(p.leftover.length > 0, q);
  }
});

test("leftover keeps inner filler words but trims edges", () => {
  assert.equal(parseQuery("lord of the rings").leftover, "lord of the rings");
  assert.equal(parseQuery("show me shah rukh khan movies").leftover, "shah rukh khan");
  assert.equal(parseQuery("zombie comedy").leftover, "zombie");
});

test("conflicting formats mean 'both'", () => {
  assert.equal(parseQuery("bollywood movies and series").type, null);
});
