// Text normalisation + typo distance used by smart search.

// "Sci-Fi & K-Drama's '90s!" → "sci fi and k dramas 90s"
export const normalize = (text = "") =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

// Optimal string alignment distance (Levenshtein + adjacent transpositions),
// with an early exit once it exceeds `max`.
export const editDistance = (a, b, max = Infinity) => {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  let prevPrev = null;
  let prev = Array.from({ length: cols }, (_, j) => j);
  for (let i = 1; i < rows; i += 1) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prevPrev[j - 2] + 1);
      }
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prevPrev = prev;
    prev = cur;
  }
  return prev[cols - 1];
};

// How many typos we tolerate for a word of this length. Short words must be exact,
// otherwise normal words get "corrected" into categories.
export const allowedEdits = (length) => (length >= 8 ? 2 : length >= 5 ? 1 : 0);

// 0..1 similarity between two strings (1 = identical after normalisation).
export const similarity = (a, b) => {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const longest = Math.max(x.length, y.length);
  return 1 - editDistance(x, y, longest) / longest;
};
