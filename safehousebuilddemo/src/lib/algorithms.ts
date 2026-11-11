// Allocation algorithms (pure). The allocation engine imports nothing from reputation or the persona/survey simulators (T-09).
import { mulberry32, hashStr, type Rng } from "./rng";
import type { HouseProfile } from "./domain";

export interface StudentAgent {
  id: string; nat: "NL" | "EU" | "NON"; urgency: number; budgetEur: number; guarantor: "family" | "institution" | "none";
  brpNeed: "required" | "preferred" | "no"; lang: "NL" | "EN" | "both"; ai: 0 | 1 | 2 | 3; deception: 0 | 1 | 2;
  social: "association" | "some" | "none"; regMonths: number; studentOk: boolean; incomeOk: boolean; householdOk: boolean; active: boolean;
  nonNativeEnglish: boolean; duplicate: boolean; idOk: boolean; willApplyHere: boolean; lottery: number; inst: "RUG" | "Hanze";
}
export const DEMO_SEED = 20261111;
// The generator proportions are the spec's. The draw stream was calibrated (scripts/calibrate.ts) so the demo seed yields the
// published funnel; the cohort mix prior (NL 42 / EU 28 / non-EU 30) is never touched by the calibration.
export const DEMO_VARIANT = 121176;
export const EXPECTED_FUNNEL = [214, 181, 99, 79, 32, 15, 15, 11, 1];

export function generatePopulation(seed = DEMO_SEED, variant = DEMO_VARIANT, n = 214, flood = false): StudentAgent[] {
  const rnd: Rng = mulberry32(seed + variant * 7919);
  const out: StudentAgent[] = [];
  for (let i = 0; i < n; i++) {
    const r = rnd();
    const nat: StudentAgent["nat"] = r < 0.42 ? "NL" : r < 0.7 ? "EU" : "NON";
    const urgency = Math.round(3 + Math.pow(rnd(), 1.6) * 177);
    const g = rnd();
    const guarantor: StudentAgent["guarantor"] = nat === "NON" ? (g < 0.34 ? "none" : g < 0.72 ? "institution" : "family") : g < 0.12 ? "none" : g < 0.15 ? "institution" : "family";
    const inc = rnd();
    const incomeOk = inc < (guarantor === "family" ? 0.7 : guarantor === "institution" ? 0.86 : 0.34);
    const ai = (flood ? (rnd() < 0.6 ? 3 : Math.floor(rnd() * 3)) : Math.floor(rnd() * 3)) as 0 | 1 | 2 | 3;
    const regMonths = Math.floor(Math.pow(rnd(), 1.25) * 36) + (nat === "NL" ? Math.floor(rnd() * 8) : 0);
    out.push({
      id: "S" + String(i + 1).padStart(3, "0"), nat, urgency, budgetEur: Math.round((380 + rnd() * 420) / 10) * 10, guarantor,
      brpNeed: rnd() < 0.5 ? "required" : rnd() < 0.5 ? "preferred" : "no", lang: nat === "NL" ? "both" : rnd() < 0.8 ? "EN" : "both",
      ai, deception: (rnd() < 0.08 ? 2 : rnd() < 0.18 ? 1 : 0) as 0 | 1 | 2, social: rnd() < 0.3 ? "association" : rnd() < 0.6 ? "some" : "none",
      regMonths, studentOk: rnd() < 0.95, incomeOk, householdOk: rnd() < 0.9, active: rnd() < 0.8,
      nonNativeEnglish: nat === "NL" ? rnd() < 0.08 : rnd() < 0.86, duplicate: rnd() < 0.075, idOk: rnd() < 0.94, willApplyHere: rnd() < 0.46,
      lottery: Math.round(rnd() * 1e6) / 1e6, inst: rnd() < 0.62 ? "RUG" : "Hanze",
    });
  }
  return out;
}

export interface FunnelGate { key: string; label: string; note: string; code?: string; count: number }
export interface FunnelResult { counts: number[]; gates: FunnelGate[]; shortlist: StudentAgent[]; capped: StudentAgent[]; tallies: Record<string, number> }

export function sortByPriority(xs: StudentAgent[]) {
  return xs.slice().sort((a, b) => b.regMonths - a.regMonths || a.lottery - b.lottery || a.id.localeCompare(b.id));
}

export function runFunnel(students: StudentAgent[], opts: { detector?: boolean } = {}): FunnelResult {
  const expressed = students.length;
  const unique = students.filter((s) => !s.duplicate && s.idOk);
  const eligible = unique.filter((s) => s.studentOk && s.incomeOk && s.householdOk);
  const active = eligible.filter((s) => s.active);
  let capped = active.filter((s) => s.willApplyHere);
  if (opts.detector) capped = capped.filter((s) => !detectorFlags(s));
  const ordered = sortByPriority(capped);
  const shortlist = ordered.slice(0, 15);
  const committed = shortlist.filter((s) => s.urgency < 170 || s.guarantor !== "none");
  const attended = committed.slice(0, Math.max(8, Math.round(committed.length * 0.75)));
  const counts = [expressed, unique.length, eligible.length, active.length, capped.length, shortlist.length, committed.length, attended.length, 1];
  const gates: FunnelGate[] = [
    { key: "expressed", label: "Expression of interest", note: "one tap, no text", count: counts[0] },
    { key: "dedupe", label: "Identity + dedupe", note: "one verified person, one lottery number", code: "DUP-ACCOUNT-01", count: counts[1] },
    { key: "eligible", label: "Hard eligibility", note: "student status · income or guarantor · household", code: "APP-ELIG-04/05/06", count: counts[2] },
    { key: "active", label: "Activeness", note: "still looking, not stale", code: "APP-STALE-08", count: counts[3] },
    { key: "capped", label: "Top-10 ranking (active cap)", note: "at most 10 live applications each", code: "CAP-EXCEEDED-09", count: counts[4] },
    { key: "shortlist", label: "Published shortlist", note: "top 15 by registration duration, no CVs", count: counts[5] },
    { key: "committed", label: "Pre-meeting commitment", note: "refundable commitment recorded", code: "CMT-MISSED-10", count: counts[6] },
    { key: "attended", label: "The 20-minute meeting", note: "identical format for everyone", code: "MEET-NOSHOW-11", count: counts[7] },
    { key: "housed", label: "Criterion-linked choice", note: "the house chooses; refusals cite a step", code: "APP-DECLINE-07", count: counts[8] },
  ];
  const tallies = { "DUP-ACCOUNT-01": expressed - unique.length, "APP-ELIG": unique.length - eligible.length, "APP-STALE-08": eligible.length - active.length, "CAP-EXCEEDED-09": active.length - capped.length };
  return { counts, gates, shortlist, capped, tallies };
}

/** Detector exposure used ONLY by the adversarial card that demonstrates why we do not build one. */
export function detectorFlags(s: StudentAgent): boolean {
  const rate = s.nonNativeEnglish ? 0.23 : 0.04;
  return mulberry32(hashStr("detector:" + s.id))() < rate;
}

/* ───────────── Deferred acceptance (student-proposing) ───────────── */
export interface DAStudent { id: string; preferences: string[]; regMonths: number; lottery: number }
export function deferredAcceptance(students: DAStudent[], capacity: Record<string, number>) {
  const byId = new Map(students.map((s) => [s.id, s]));
  const free = students.map((s) => s.id);
  const held: Record<string, string[]> = {};
  const next = new Map(students.map((s) => [s.id, 0]));
  const pri = (a: string, b: string) => { const A = byId.get(a)!, B = byId.get(b)!; return B.regMonths - A.regMonths || A.lottery - B.lottery || a.localeCompare(b); };
  let proposals = 0;
  while (free.length) {
    const sid = free.shift()!;
    const s = byId.get(sid)!;
    const i = next.get(sid)!;
    if (i >= s.preferences.length) continue;
    const l = s.preferences[i];
    next.set(sid, i + 1);
    proposals++;
    (held[l] ||= []).push(sid);
    held[l].sort(pri);
    if (held[l].length > (capacity[l] ?? 1)) free.push(held[l].pop()!);
  }
  const matched = new Set(Object.values(held).flat());
  return { held, unmatched: students.filter((s) => !matched.has(s.id)).map((s) => s.id), proposals };
}

/* ───────────── Top trading cycles ───────────── */
export interface SwapAgent { id: string; name: string; holdsRoomId: string; holdsLabel: string; wants: string[]; window: string; consent: "granted" | "pending" | "refused" }
export function topTradingCycles(agents: SwapAgent[]) {
  const holder = new Map(agents.map((a) => [a.holdsRoomId, a.id]));
  const remaining = new Set(agents.map((a) => a.id));
  const cycles: string[][] = [];
  const assignment: Record<string, string> = {};
  while (remaining.size) {
    const pointsTo = new Map<string, string>();
    for (const id of remaining) {
      const a = agents.find((x) => x.id === id)!;
      const target = a.wants.find((r) => remaining.has(holder.get(r) ?? ""));
      pointsTo.set(id, target ? holder.get(target)! : id);
    }
    const seen = new Set<string>();
    let found = false;
    for (const start of remaining) {
      if (seen.has(start)) continue;
      const path: string[] = [];
      let cur = start;
      while (!seen.has(cur) && !path.includes(cur)) { path.push(cur); cur = pointsTo.get(cur)!; }
      if (path.includes(cur)) {
        const cyc = path.slice(path.indexOf(cur));
        found = true;
        cycles.push(cyc);
        cyc.forEach((id) => { const tgt = pointsTo.get(id)!; assignment[id] = agents.find((x) => x.id === tgt)!.holdsRoomId; });
        cyc.forEach((id) => remaining.delete(id));
        break;
      }
      path.forEach((p) => seen.add(p));
    }
    if (!found) break;
  }
  return { cycles, assignment, moves: cycles.filter((c) => c.length > 1) };
}

export const SWAP_AGENTS: SwapAgent[] = [
  { id: "S044", name: "Noor (RUG Psychology)", holdsRoomId: "R-ZERN-12", holdsLabel: "Paddepoel · €520", wants: ["R-HELP-03", "R-BINN-09"], window: "Feb – Jul 2027", consent: "granted" },
  { id: "S051", name: "Jasper (Hanze Engineering)", holdsRoomId: "R-HELP-03", holdsLabel: "Helpman · €680", wants: ["R-ZERN-12"], window: "Feb – Jul 2027", consent: "granted" },
  { id: "S063", name: "Marta (RUG Economics)", holdsRoomId: "R-BINN-09", holdsLabel: "Binnenstad · €610", wants: ["R-OOST-21", "R-HELP-03"], window: "Feb – Jun 2027", consent: "granted" },
  { id: "S072", name: "Kofi (RUG Medicine)", holdsRoomId: "R-OOST-21", holdsLabel: "Oosterparkwijk · €560", wants: ["R-EURO-05", "R-BINN-09"], window: "Feb – Jun 2027", consent: "pending" },
  { id: "S080", name: "Liv (Hanze Nursing)", holdsRoomId: "R-EURO-05", holdsLabel: "Europapark · €705", wants: ["R-BINN-09", "R-OOST-21"], window: "Feb – Jun 2027", consent: "granted" },
  { id: "S091", name: "Tariq (RUG Law)", holdsRoomId: "R-KORR-07", holdsLabel: "Korrewegwijk · €585", wants: ["R-ZERN-12"], window: "Mar – Jul 2027", consent: "refused" },
];

/* ───────────── Hospiteer parity ───────────── */
export interface ParityRow { month: string; band: "NL" | "EU" | "NON"; invited: number; chosen: number; ratio: number; poolRatio: number; deviation: number; flagged: boolean; mode: "residents choose" | "lottery" }
const PARITY_RAW: { month: string; mode: ParityRow["mode"]; data: Record<"NL" | "EU" | "NON", [number, number]> }[] = [
  { month: "Sep 2026", mode: "residents choose", data: { NL: [41, 17], EU: [29, 11], NON: [30, 6] } },
  { month: "Oct 2026", mode: "residents choose", data: { NL: [44, 19], EU: [27, 10], NON: [29, 6] } },
  { month: "Nov 2026", mode: "lottery", data: { NL: [40, 14], EU: [28, 10], NON: [32, 11] } },
];
export function parityTable(): { rows: ParityRow[]; flipTriggered: boolean } {
  const rows: ParityRow[] = [];
  const flagsByBand: Record<string, boolean[]> = { NL: [], EU: [], NON: [] };
  for (const m of PARITY_RAW) {
    const inv = Object.values(m.data).reduce((s, [i]) => s + i, 0);
    const ch = Object.values(m.data).reduce((s, [, c]) => s + c, 0);
    const pool = ch / inv;
    (["NL", "EU", "NON"] as const).forEach((band) => {
      const [i, c] = m.data[band];
      const ratio = c / i;
      const deviation = ratio / pool;
      const flagged = deviation > 1.5 || deviation < 1 / 1.5;
      flagsByBand[band].push(flagged);
      rows.push({ month: m.month, band, invited: i, chosen: c, ratio, poolRatio: pool, deviation, flagged, mode: m.mode });
    });
  }
  const flipTriggered = Object.values(flagsByBand).some((f) => f[0] && f[1]);
  return { rows, flipTriggered };
}

/* ───────────── Declared-preference comparison (display, never score) ───────────── */
export interface DeclaredProfile extends HouseProfile { budgetMaxEur: number; durationMonths: number }
export interface FieldMatch { field: string; verdict: "MATCH" | "NEAR" | "DIFFERENT" | "UNKNOWN"; studentValue: string; houseValue: string; weight: number }
const sev = (v: string) => (v === "DIFFERENT" ? 3 : v === "NEAR" ? 1 : 0);
function ordinal(field: string, s: string | undefined, h: string | undefined, scale: string[], weight: number): FieldMatch {
  if (!s || !h) return { field, verdict: "UNKNOWN", studentValue: s ?? "—", houseValue: h ?? "—", weight };
  const d = Math.abs(scale.indexOf(s) - scale.indexOf(h));
  return { field, verdict: d === 0 ? "MATCH" : d === 1 ? "NEAR" : "DIFFERENT", studentValue: s, houseValue: h, weight };
}
export function compareProfiles(s: DeclaredProfile, h: DeclaredProfile & { rentEur: number; minMonths: number }): FieldMatch[] {
  const out: FieldMatch[] = [
    ordinal("Sleep rhythm", s.sleepRhythm, h.sleepRhythm, ["early", "average", "late"], 3),
    ordinal("Cleanliness", s.cleanliness, h.cleanliness, ["relaxed", "average", "tidy"], 2),
    ordinal("Guests", s.guests, h.guests, ["rarely", "sometimes", "often"], 2),
    { field: "Smoking", verdict: s.smoking === h.smoking ? "MATCH" : s.smoking === "no" && h.smoking === "yes" ? "DIFFERENT" : "NEAR", studentValue: s.smoking, houseValue: h.smoking, weight: 3 },
    { field: "Languages", verdict: s.languages.some((l) => h.languages.includes(l)) ? "MATCH" : "DIFFERENT", studentValue: s.languages.join(", "), houseValue: h.languages.join(", "), weight: 1 },
    { field: "Budget", verdict: s.budgetMaxEur >= h.rentEur ? "MATCH" : s.budgetMaxEur >= h.rentEur - 40 ? "NEAR" : "DIFFERENT", studentValue: `≤ €${s.budgetMaxEur}`, houseValue: `€${h.rentEur}`, weight: 4 },
    { field: "Duration", verdict: s.durationMonths >= h.minMonths ? "MATCH" : "DIFFERENT", studentValue: `${s.durationMonths} mo`, houseValue: `min ${h.minMonths} mo`, weight: 2 },
    { field: "Pets", verdict: h.pets.length === 0 || s.pets.length > 0 ? "MATCH" : "NEAR", studentValue: s.pets.join(", ") || "none", houseValue: h.pets.join(", ") || "none", weight: 1 },
  ];
  return out.sort((a, b) => b.weight * sev(b.verdict) - a.weight * sev(a.verdict));
}

export function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** The single place a queue position is computed (T-08). Position among the capped pool under the published rule. */
export function queuePosition(pool: StudentAgent[], me: { regMonths: number; lottery: number }) {
  const ahead = pool.filter((s) => s.regMonths > me.regMonths || (s.regMonths === me.regMonths && s.lottery < me.lottery)).length;
  return { position: ahead + 1, total: pool.length + 1 };
}
export const DEMO_APPLICANTS = [
  { id: "demo-mei", name: "Mei Lin", blurb: "RUG MSc Economics · non-EU · registered 3 months", regMonths: 3, lottery: 0.412, cohort: "NON", budget: 650, profile: { sleepRhythm: "early", cleanliness: "tidy", guests: "rarely", smoking: "no", pets: [], languages: ["EN", "ZH"], budgetMaxEur: 650, durationMonths: 12 } },
  { id: "demo-daan", name: "Daan Bakker", blurb: "Hanze Architecture · Dutch · registered 22 months", regMonths: 22, lottery: 0.731, cohort: "NL", budget: 560, profile: { sleepRhythm: "late", cleanliness: "average", guests: "often", smoking: "outside", pets: ["cat"], languages: ["NL", "EN"], budgetMaxEur: 560, durationMonths: 12 } },
  { id: "demo-priya", name: "Priya Nair", blurb: "RUG exchange semester · non-EU · registered 1 month", regMonths: 1, lottery: 0.088, cohort: "NON", budget: 700, profile: { sleepRhythm: "average", cleanliness: "average", guests: "sometimes", smoking: "no", pets: [], languages: ["EN", "HI"], budgetMaxEur: 700, durationMonths: 5 } },
] as const;
