// Live tests against TMDB (skipped when no TMDB_KEY). Run: npm test (from the repo root)
// Uses TMDB_KEY from the environment, or from the repo-root .env file.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { configureTmdb, getTitle, smartSearch } from "../src/index.js";

const envFile = fileURLToPath(new URL("../../../.env", import.meta.url));
const fromFile = fs.existsSync(envFile)
  ? fs.readFileSync(envFile, "utf8").match(/^TMDB_KEY=(.*)$/m)?.[1]?.trim()
  : undefined;
const key = process.env.TMDB_KEY || fromFile;
configureTmdb({ getApiKey: () => key });

const live = { skip: key ? false : "TMDB_KEY not set", timeout: 60000 };
const rowTitles = (r) => r.rows.map((x) => x.title);
const firstRow = async (r) => (r.rows[0] ? (await r.rows[0].fetcher()).map(getTitle) : []);

test("category: bollywood → Bollywood rows first", live, async () => {
  const r = await smartSearch("bollywood");
  assert.ok(r.understood);
  assert.equal(r.rows[0].title, "Popular Bollywood Movies");
  assert.ok((await firstRow(r)).length >= 5);
});

test("typo in category: bolywood → corrected with notice", live, async () => {
  const r = await smartSearch("bolywood");
  assert.deepEqual(r.corrections, [{ from: "bolywood", to: "Bollywood" }]);
  assert.match(r.rows[0].title, /Bollywood/);
});

test("exact mode keeps the typo as typed", live, async () => {
  const r = await smartSearch("bolywood", { exact: true });
  assert.equal(r.corrections.length, 0);
});

test("combination: best bollywood comedy 2000s", live, async () => {
  const r = await smartSearch("best bollywood comedy 2000s");
  assert.equal(r.rows[0].title, "Top Rated Bollywood Comedy Movies from the 2000s");
  const titles = await firstRow(r);
  assert.ok(titles.includes("3 Idiots"), titles.join(", "));
});

test("decade + genre: 90s horror", live, async () => {
  const r = await smartSearch("90s horror");
  assert.match(r.rows[0].title, /Horror Movies from the 1990s/);
  assert.ok((await firstRow(r)).includes("Scream"));
});

test("person: shah rukh khan → Starring row, no talk-show appearances", live, async () => {
  const r = await smartSearch("shah rukh khan movies");
  assert.equal(r.rows[0].title, "Starring Shah Rukh Khan");
  const titles = await firstRow(r);
  assert.ok(titles.includes("Dilwale Dulhania Le Jayenge"));
  assert.ok(!titles.includes("Kaun Banega Crorepati"));
});

test("name spellings: amir khan → Aamir Khan (not the boxer)", live, async () => {
  const r = await smartSearch("amir khan");
  assert.equal(r.topResult?.person?.name, "Aamir Khan");
  assert.deepEqual(r.corrections, [{ from: "amir khan", to: "Aamir Khan" }]);
  const titles = await firstRow(r);
  assert.ok(titles.includes("3 Idiots") && titles.includes("Dangal"), titles.join(", "));
});

test("name spellings: dipika padukone → Deepika Padukone", live, async () => {
  const r = await smartSearch("dipika padukone");
  assert.equal(r.topResult?.person?.name, "Deepika Padukone");
});

test("exact names are not re-spelled: salman khan", live, async () => {
  const r = await smartSearch("salman khan");
  assert.equal(r.topResult?.person?.name, "Salman Khan");
  assert.equal(r.corrections.length, 0);
});

test("thin-data actors still get a row: ramsey nouah", live, async () => {
  const r = await smartSearch("ramsey nouah");
  assert.equal(r.rows[0]?.title, "Starring Ramsey Nouah");
  assert.ok((await firstRow(r)).length >= 3);
});

test("franchise: lord of the rings → collection in order", live, async () => {
  const r = await smartSearch("lord of the rings");
  assert.equal(r.rows[0].title, "The Lord of the Rings Collection");
  assert.match((await firstRow(r))[0], /Fellowship of the Ring/);
});

test("studio: pixar movies", live, async () => {
  const r = await smartSearch("pixar movies");
  assert.equal(r.rows[0].title, "Popular Pixar Movies");
});

test("keyword + genre: zombie comedy", live, async () => {
  const r = await smartSearch("zombie comedy");
  assert.match(r.rows[0].title, /Zombie Comedy/);
});

test("exact title wins: inception, love actually", live, async () => {
  for (const q of ["inception", "love actually"]) {
    const r = await smartSearch(q);
    assert.equal(r.topResult?.kind, "title", q);
    assert.equal(getTitle(r.topResult.item).toLowerCase(), q);
    assert.equal(r.rows.length, 0, q);
  }
});

test("a typo fix never overrides a real title: indiana jones", live, async () => {
  const r = await smartSearch("indiana jones");
  assert.equal(r.corrections.length, 0);
  assert.ok(!rowTitles(r).some((t) => /Indian /.test(t)));
  assert.match(r.rows[0]?.title || "", /Indiana Jones/);
});

test("streaming service: netflix series", live, async () => {
  const r = await smartSearch("netflix series");
  assert.equal(r.rows[0].title, "Popular Netflix Series");
});
