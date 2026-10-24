// Small shared helpers.

export const ROAD_W = 6; // half-width of the road in metres

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export const pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)];

export function pickWeighted(arr, rng = Math.random) {
  let total = 0;
  for (const a of arr) total += a.w ?? 1;
  let r = rng() * total;
  for (const a of arr) { r -= a.w ?? 1; if (r <= 0) return a; }
  return arr[arr.length - 1];
}

// First index in a list sorted by .d whose d >= value.
export function lowerBound(arr, d) {
  let lo = 0, hi = arr.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid].d < d) lo = mid + 1; else hi = mid; }
  return lo;
}
