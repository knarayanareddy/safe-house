// Deterministic helpers. Used by the simulators, the persona generator and the seeders.
export function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

export function pick<T>(rnd: Rng, xs: readonly T[]): T {
  return xs[Math.floor(rnd() * xs.length) % xs.length];
}

export function weighted<T>(rnd: Rng, xs: readonly (readonly [T, number])[]): T {
  const total = xs.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [v, w] of xs) {
    r -= w;
    if (r <= 0) return v;
  }
  return xs[xs.length - 1][0];
}

export function normal(rnd: Rng, mean = 0, sd = 1) {
  const u = Math.max(1e-9, rnd());
  const v = rnd();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const fmtEur = (n: number) => "€" + Math.round(n).toLocaleString("en-NL");
export const round2 = (n: number) => Math.round(n * 100) / 100;
