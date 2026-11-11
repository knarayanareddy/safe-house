// Domain core: types, reason-code dictionary, letters, WWS-O-2026-approx ceiling, name similarity,
// mock adapters and the six-check verification gate. Pure functions only. No scores about people (W1).
import { hashStr, round2 } from "./rng";

export type Actor = "landlord" | "agent" | "student" | "system" | "ops" | "inst" | "muni" | "money";
export type AccountType = "PRIVATE_OWNER" | "PROFESSIONAL" | "AGENT";
export type ListingStatus = "DRAFT" | "CHECKING" | "HOLD" | "PUBLISHED" | "REFUSED" | "SUSPENDED" | "WITHDRAWN" | "LET";
export type CheckId = "ID" | "OWN" | "DUP" | "BAG" | "RENT" | "TRADER";
export type CheckVerdict = "PASS" | "FAIL" | "WARN" | "SKIP";

export const ACTORS: Record<Actor, { label: string; color: string }> = {
  landlord: { label: "Landlord", color: "var(--actor-landlord)" },
  agent: { label: "Agent / makelaar", color: "var(--actor-agent)" },
  student: { label: "Student", color: "var(--actor-student)" },
  system: { label: "Automated gate", color: "var(--actor-system)" },
  ops: { label: "Human reviewer", color: "var(--actor-ops)" },
  inst: { label: "Institution", color: "var(--actor-inst)" },
  muni: { label: "Municipality", color: "var(--actor-muni)" },
  money: { label: "Money partner", color: "var(--actor-money)" },
};

/* ───────────────────────── Reason codes (single source of truth) ───────────────────────── */
export interface ReasonCodeDef {
  code: string;
  fires: string;
  outcome: string;
  owner: Actor;
  sla: string;
  sentence: string;
  kind: "fail" | "warn" | "info" | "pass";
}
const rc = (code: string, fires: string, outcome: string, owner: Actor, sla: string, sentence: string, kind: ReasonCodeDef["kind"]): ReasonCodeDef => ({ code, fires, outcome, owner, sla, sentence, kind });

export const REASON_CODES: ReasonCodeDef[] = [
  rc("ID-FAIL-01", "identity assertion failed", "REFUSE", "system", "instant", "We could not confirm your identity, so listing rights are paused.", "fail"),
  rc("ID-EXPIRED-02", "attestation expired", "HOLD", "system", "24 h", "Your identity check expired. Re-verify to continue.", "warn"),
  rc("LOT-OWNER-02", "poster not the registered owner", "REFUSE", "system", "instant", "The registered owner of this address does not match the account.", "fail"),
  rc("LOT-MANDATE-01", "agent under mandate", "HOLD", "ops", "24 h", "Agent listing under a management mandate — queued for review.", "warn"),
  rc("LOT-DUP-01", "photos found elsewhere", "HOLD / REFUSE", "ops", "24 h", "These photographs appear on another listing.", "fail"),
  rc("LOT-DUP-02", "photo provenance unverifiable", "HOLD", "ops", "24 h", "We could not verify these photos. One taken in the room today clears it.", "warn"),
  rc("LOT-ADDR-03", "address not found / not residential", "REFUSE", "system", "instant", "This address is not a registered dwelling.", "fail"),
  rc("LOT-ADDR-04", "street mismatch", "HOLD", "ops", "24 h", "The street name does not match the registered address.", "warn"),
  rc("LOT-RENT-04", "rent above ceiling", "PASS + disclosure", "system", "—", "The asking rent is above the legal maximum for this room's points.", "warn"),
  rc("TRD-INVALID-01", "KvK unresolved", "REFUSE + suspend", "system", "instant", "Your business registration could not be verified.", "fail"),
  rc("DUP-ACCOUNT-01", "duplicate identity", "silent dedupe", "system", "instant", "(internal) One verified person, one account, one lottery number.", "info"),
  rc("APP-ELIG-04", "student status unverified", "INELIGIBLE", "system", "instant", "Student status was not verified at application (R1).", "fail"),
  rc("APP-ELIG-05", "income / guarantor below threshold", "INELIGIBLE", "system", "instant", "Income or guarantor requirement not met (R2).", "fail"),
  rc("APP-ELIG-06", "household too large", "INELIGIBLE", "system", "instant", "Household size exceeds the maximum (R3).", "fail"),
  rc("APP-STALE-08", "application untouched 14 days", "closed", "system", "instant", "This application was closed after 14 days of inactivity. You can re-apply.", "info"),
  rc("CAP-EXCEEDED-09", "11th live application", "blocked, not judged", "system", "instant", "You can hold 10 applications at a time. Withdraw one to apply here.", "info"),
  rc("CMT-MISSED-10", "commitment withdrawn / no-show", "deprioritised", "system", "instant", "You missed the meeting you committed to. This affects nothing about your eligibility.", "info"),
  rc("MEET-NOSHOW-11", "resident no-show", "rescheduled", "ops", "48 h", "The meeting did not happen. We have rescheduled it.", "info"),
  rc("APP-DECLINE-07", "earlier applicant chosen", "DECLINED", "landlord", "instant", "An earlier applicant in the published order was selected. Your position was N of M.", "info"),
  rc("APP-SILENT-06", "no landlord decision in 48 h", "escalate", "ops", "48 h", "The landlord has not responded. We escalated and moved to the next applicant.", "warn"),
  rc("APP-SKIP-02", "attempt to reorder", "blocked", "system", "instant", "(internal) The queue cannot be reordered by anyone.", "info"),
  rc("MSG-OFFPLAT-01", "off-platform nudge", "warn", "system", "instant", "Keep the conversation here — contact details are hidden until an offer is accepted.", "warn"),
  rc("MSG-FEE-02", "upfront fee requested", "block + escalate", "ops", "immediate", "This conversation is paused. No legitimate landlord asks for money before a viewing.", "fail"),
  rc("REP-TRIAGE-01", "report untriaged 72 h", "auto-hide", "ops", "72 h", "This listing is hidden while we review a report.", "warn"),
  rc("PROF-LINT-01", "profile requests a protected characteristic", "blocked", "system", "instant", "A house profile describes the home, not the people you want in it.", "fail"),
  rc("SUBLET-CONSENT-01", "no landlord consent", "blocked", "system", "instant", "A sublet needs the owner's written consent. We have asked them.", "fail"),
  rc("SUBLET-CAP-02", "rent above head rent", "blocked", "system", "instant", "A sublet cannot cost more than your own rent.", "fail"),
  rc("SUBLET-DUR-03", "beyond the head lease", "blocked", "system", "instant", "This ends after your own tenancy does.", "fail"),
  rc("CON-MISSING-02", "mandatory annex absent", "blocked", "system", "instant", "The contract cannot be generated until all disclosures are complete.", "fail"),
  rc("DEP-CAP-03", "deposit > 2× rent", "blocked", "system", "instant", "The deposit cannot exceed two months' rent.", "fail"),
  rc("DEP-PAYER-04", "payer ≠ tenant", "hold funds", "ops", "4 h", "The payment came from a different account. We are checking.", "warn"),
  rc("DEP-NOCONF-01", "no dual confirmation", "hold", "ops", "7 d", "The handover was not confirmed by both sides.", "warn"),
  rc("DEP-DISPUTE-02", "deposit withheld", "dispute", "ops", "10 d", "The deposit is in dispute. Your check-in pack is attached.", "warn"),
  rc("INC-BREACH-01", "data breach", "notify", "ops", "72 h", "We are notifying you about an incident affecting your data.", "info"),
  rc("HUM-SLA-01", "hold unreviewed 24 h", "escalate", "ops", "24 h", "This listing is still in review; it has been escalated.", "warn"),
];
export const CODE_MAP: Record<string, ReasonCodeDef> = Object.fromEntries(REASON_CODES.map((c) => [c.code, c]));

export interface LetterCtx { address: string; ruleSetVersion: string; position?: number; total?: number }
export const RULESET_VERSION = "1.2";
const LETTERS: Record<string, (c: LetterCtx) => string> = {
  "APP-ELIG-04": (c) => `Your application for ${c.address} could not be taken forward because the student-status requirement was not met when you applied. This is a published criterion (Selection rules v${c.ruleSetVersion}, item R1). You may re-apply once your enrolment is confirmed.`,
  "APP-DECLINE-07": (c) => `The landlord selected an earlier applicant in the published order. Your position was ${c.position ?? "N"} of ${c.total ?? "M"}. This is not an assessment of you: applicants are ordered by registration duration, exactly as published in Selection rules v${c.ruleSetVersion}.`,
  "CAP-EXCEEDED-09": (c) => `We could not add an application for ${c.address} because you already hold ten live applications. This is a limit on attention, not a judgement about you. Withdraw one and apply again.`,
  "LOT-OWNER-02": (c) => `This listing for ${c.address} cannot go live. The registered owner of the address does not match the account that posted it. If you act for the owner, attach a management mandate and the listing moves to human review.`,
  "LOT-DUP-01": (c) => `The photographs submitted for ${c.address} appear on another listing. Photographs are compared by fingerprint only; nothing about their content is judged. A photo taken in the room today clears this.`,
  "LOT-ADDR-03": (c) => `${c.address} is not registered as a dwelling (woonfunctie), so it cannot be listed as a room to rent.`,
  "TRD-INVALID-01": (c) => `Your business registration could not be verified, so listings for ${c.address} are suspended under the trader-traceability rules (DSA Art. 30).`,
  "ID-FAIL-01": (c) => `We could not confirm the identity behind the account that submitted ${c.address}, so listing rights are paused.`,
  "LOT-MANDATE-01": (c) => `${c.address} is posted by an agent under a management mandate. A named human reviewer will check the mandate within 24 hours.`,
  "LOT-DUP-02": (c) => `We could not verify the provenance of the photos for ${c.address}. One photo taken in the room today clears it. A named human reviewer will look within 24 hours.`,
};
export function generateLetter(codes: string[], ctx: LetterCtx): string {
  const main = codes.find((c) => LETTERS[c]);
  const body = main ? LETTERS[main](ctx) : `Decision for ${ctx.address}: ${codes.map((c) => CODE_MAP[c]?.sentence ?? c).join(" ")}`;
  const extra = codes.filter((c) => c !== main).map((c) => `• ${c}: ${CODE_MAP[c]?.sentence ?? ""}`).join("\n");
  return body + (extra ? "\n\nAlso recorded:\n" + extra : "");
}

/* ───────────────────────── WWS-O-2026-approx ceiling ───────────────────────── */
export const CEILING_LABEL = "WWS-O-2026-approx";
const ANCHORS: [number, number][] = [[0, 0], [143, 932.93], [186, 1228.07]];
export function piecewiseLinearCeiling(points: number): number {
  if (points >= 187) {
    const rate = (1228.07 - 932.93) / (186 - 143);
    return round2(1228.07 + (points - 186) * rate);
  }
  for (let i = 1; i < ANCHORS.length; i++) {
    const [p0, r0] = ANCHORS[i - 1];
    const [p1, r1] = ANCHORS[i];
    if (points <= p1) return round2(r0 + ((points - p0) * (r1 - r0)) / (p1 - p0));
  }
  return 1228.07;
}
const energyTable: Record<string, number> = { "A++++": 40, "A+++": 36, "A++": 32, "A+": 28, A: 24, B: 20, C: 15, D: 11, E: 8, F: 5, G: 0 };
export const energyPoints = (l?: string) => energyTable[l ?? "G"] ?? 0;
export const surfacePoints = (m2: number) => Math.min(120, Math.round(m2));
export const kitchenPoints = (shared: string[], fac: string[]) => (fac.includes("private_kitchen") ? 20 : shared.includes("kitchen") ? 0 : 20);
export const sanitaryPoints = (shared: string[], fac: string[]) => {
  let p = 0;
  if (fac.includes("private_shower")) p += 10;
  if (fac.includes("private_toilet")) p += 6;
  if (!p && (shared.includes("bathroom") || shared.includes("toilet"))) p = 2;
  return p;
};
export const outdoorPoints = (fac: string[]) => (fac.includes("balcony") || fac.includes("garden") ? 6 : 0);
// SPEC-GAP: the spec adds a 60-point dwelling base; furnishing / heating terms are our own small additions (4 + 2).
export const facilityPoints = (fac: string[]) => (fac.includes("furnished") ? 4 : 0) + (fac.includes("central_heating") ? 2 : 0);

export interface PointsRow { label: string; points: number }
export function pointsBreakdown(l: { sizeM2: number; energyLabel?: string; shared: string[]; facilities: string[] }): PointsRow[] {
  return [
    { label: "Dwelling base", points: 60 },
    { label: `Surface (${l.sizeM2} m²)`, points: surfacePoints(l.sizeM2) },
    { label: `Energy label ${l.energyLabel ?? "—"}`, points: energyPoints(l.energyLabel) },
    { label: "Kitchen", points: kitchenPoints(l.shared, l.facilities) },
    { label: "Sanitary", points: sanitaryPoints(l.shared, l.facilities) },
    { label: "Outdoor space", points: outdoorPoints(l.facilities) },
    { label: "Furnishing / heating", points: facilityPoints(l.facilities) },
  ];
}
export function ceilingFor(l: { sizeM2: number; energyLabel?: string; shared: string[]; facilities: string[]; rentEur: number }) {
  const rows = pointsBreakdown(l);
  const points = rows.reduce((s, r) => s + r.points, 0);
  const ceiling = piecewiseLinearCeiling(points);
  return { rows, points, ceiling, diff: round2(l.rentEur - ceiling), over: l.rentEur > ceiling };
}

/* ───────────────────────── Name similarity (T-18) ───────────────────────── */
const PARTICLES = ["van", "de", "der", "den", "ter", "ten", "von"];
function nameTokens(s: string) {
  const raw = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean).filter((t) => !PARTICLES.includes(t));
  return { full: raw.filter((t) => t.length > 2).sort(), initials: raw.filter((t) => t.length === 1) };
}
export function normaliseName(s: string): string[] { return nameTokens(s).full; }
// SPEC-GAP: the spec's token filter drops initials, which makes "P. de Vries ~ J. de Vries" score 1.0 although the spec
// says it must fail. We keep the spec's overlap and add an initials-consistency check (halves the score on a conflict).
export function nameSimilarity(a: string, b: string): number {
  const A = nameTokens(a), B = nameTokens(b);
  const inter = A.full.filter((x) => B.full.includes(x)).length;
  let sim = inter / Math.max(1, Math.min(A.full.length, B.full.length));
  const conflict = (X: typeof A, Y: typeof A) => X.initials.some((i) => !(Y.full.some((t) => t[0] === i) || Y.initials.includes(i)));
  if (conflict(A, B) || conflict(B, A)) sim *= 0.5;
  return sim;
}

/* ───────────────────────── Image fingerprints (W4: only hash, never content) ───────────────────────── */
export function hamming(a: string, b: string) {
  // a, b: equal-length hex fingerprints (dHash)
  let n = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { n += x & 1; x >>= 1; }
  }
  return n;
}

/* ───────────────────────── Listing + adapters + gate ───────────────────────── */
export interface Photo { sha: string; url: string; exif: boolean }
export interface Landlord {
  id: string; name: string; type: AccountType; email: string; fixture: "genuine" | "fraud" | "silent" | "agent" | "professional" | "nondwelling" | "badkvk";
  identityVerified: boolean; identityExpired?: boolean; kvk?: string; kvkActive?: boolean; mandateRef?: string; responseHours: number;
}
export interface HouseProfile { sleepRhythm: "early" | "average" | "late"; cleanliness: "relaxed" | "average" | "tidy"; guests: "rarely" | "sometimes" | "often"; smoking: "no" | "outside" | "yes"; pets: string[]; languages: string[] }
export interface Listing {
  id: string; fixture: string; street: string; number: string; postcode: string; city: "Groningen"; hood: string;
  rentEur: number; sizeM2: number; energyLabel: string; residents: number; shared: string[]; facilities: string[];
  photos: Photo[]; landlord: Landlord; registryOwners: string[]; bag: { found: boolean; usage: string; street: string };
  externalHits: number; status: ListingStatus; publishedAt?: string; description: string;
  availableFrom: string; minMonths: number; depositEur: number; billsIncluded: boolean; bike: { rugCentre: number; zernike: number; hanze: number };
  house: HouseProfile; residentsList: string[]; expected: { status: "PUBLISH" | "REFUSE" | "HOLD"; codes: string[] };
}
export const addressOf = (l: Listing) => `${l.street} ${l.number}, ${l.postcode} ${l.city}`;

export interface CheckResult {
  id: CheckId; name: string; verdict: CheckVerdict; code?: string; disclosure?: string; evidence: string;
  issuer: string; ms: number; payload: Record<string, unknown>;
}
export const CHECK_NAMES: Record<CheckId, string> = { ID: "Identity", OWN: "Ownership", DUP: "Photo integrity", BAG: "Address", RENT: "Rent disclosure", TRADER: "Trader registration" };

const msFor = (l: Listing, id: string) => 38 + (hashStr(l.id + id) % 380);

export function runCheck(id: CheckId, l: Listing, others: Listing[]): CheckResult {
  const base = { id, name: CHECK_NAMES[id], ms: msFor(l, id) };
  const lord = l.landlord;
  switch (id) {
    case "ID": {
      const payload = { issuer: "idin:mock-bank", assurance: lord.identityVerified ? "substantieel" : "laag", verified: lord.identityVerified, checkedAt: "2026-11-12" };
      if (!lord.identityVerified) return { ...base, verdict: "FAIL", code: "ID-FAIL-01", evidence: "iDIN assertion not confirmed for this account.", issuer: "idin:mock-bank", payload };
      if (lord.identityExpired) return { ...base, verdict: "WARN", code: "ID-EXPIRED-02", evidence: "Identity attestation has expired.", issuer: "idin:mock-bank", payload };
      return { ...base, verdict: "PASS", evidence: "Verified person, assurance level substantieel.", issuer: "idin:mock-bank", payload };
    }
    case "OWN": {
      const owners = l.registryOwners;
      const sims = owners.map((o) => ({ owner: o, similarity: round2(nameSimilarity(lord.name, o)) }));
      const payload = { address: addressOf(l), registeredOwners: owners.length, mandateRef: lord.mandateRef ?? null, comparisons: sims };
      if (owners.length === 0) return { ...base, verdict: "FAIL", code: "LOT-OWNER-02", evidence: "No registered owner found for this address.", issuer: "kadaster:mock", payload };
      if (lord.mandateRef) return { ...base, verdict: "WARN", code: "LOT-MANDATE-01", evidence: `Poster is an agent acting under mandate ${lord.mandateRef}. Human review.`, issuer: "kadaster:mock", payload };
      const best = Math.max(...sims.map((s) => s.similarity));
      if (best >= 0.92) return { ...base, verdict: "PASS", evidence: `Poster name matches the registered owner (similarity ${best.toFixed(2)} ≥ 0.92).`, issuer: "kadaster:mock", payload };
      return { ...base, verdict: "FAIL", code: "LOT-OWNER-02", evidence: `Poster "${lord.name}" ≠ registered owner (best similarity ${best.toFixed(2)} < 0.92).`, issuer: "kadaster:mock", payload };
    }
    case "DUP": {
      const mine = l.photos.map((p) => p.sha);
      const clash = others.filter((o) => o.id !== l.id && !!o.publishedAt).flatMap((o) => o.photos.filter((p) => mine.includes(p.sha)).map((p) => ({ listing: o.id, sha: p.sha })));
      const payload = { photos: l.photos.length, fingerprints: "sha256 + dHash (no content analysis)", localMatches: clash, externalHits: l.externalHits };
      if (clash.length) return { ...base, verdict: "FAIL", code: "LOT-DUP-01", evidence: `${clash.length} photo fingerprint(s) already used on ${[...new Set(clash.map((c) => c.listing))].join(", ")}.`, issuer: "phash:mock", payload };
      if (l.externalHits > 0) return { ...base, verdict: "WARN", code: "LOT-DUP-01", evidence: `${l.externalHits} external reverse-search hits.`, issuer: "tineye:mock", payload };
      if (l.photos.some((p) => !p.exif)) return { ...base, verdict: "WARN", code: "LOT-DUP-02", evidence: "No EXIF provenance on one or more photos.", issuer: "phash:mock", payload };
      return { ...base, verdict: "PASS", evidence: `${l.photos.length} photos, all fingerprints unique, 0 external hits.`, issuer: "phash:mock", payload };
    }
    case "BAG": {
      const payload = { postcode: l.postcode, number: l.number, record: l.bag };
      if (!l.bag.found || l.bag.usage !== "woonfunctie") return { ...base, verdict: "FAIL", code: "LOT-ADDR-03", evidence: l.bag.found ? `Registered usage is "${l.bag.usage}", not woonfunctie.` : "Address not found in the registry.", issuer: "bag:mock", payload };
      if (l.bag.street.toLowerCase() !== l.street.toLowerCase()) return { ...base, verdict: "WARN", code: "LOT-ADDR-04", evidence: "Street name differs from registry.", issuer: "bag:mock", payload };
      return { ...base, verdict: "PASS", evidence: "Registered dwelling (woonfunctie), street matches.", issuer: "bag:mock", payload };
    }
    case "RENT": {
      const c = ceilingFor(l);
      const payload = { model: CEILING_LABEL, points: c.points, ceiling: c.ceiling, askingRent: l.rentEur, rows: c.rows };
      if (c.over) return { ...base, verdict: "PASS", disclosure: "LOT-RENT-04", evidence: `Asking €${l.rentEur} vs ~€${Math.round(c.ceiling)} for ${c.points} points. Disclosed, not refused.`, issuer: "huurcommissie:approx", payload };
      return { ...base, verdict: "PASS", evidence: `Asking €${l.rentEur} is under the ~€${Math.round(c.ceiling)} maximum for ${c.points} points.`, issuer: "huurcommissie:approx", payload };
    }
    case "TRADER": {
      if (lord.type === "PRIVATE_OWNER") return { ...base, verdict: "SKIP", evidence: "Private owner — trader registration does not apply (DSA Art. 30).", issuer: "kvk:mock", payload: { accountType: lord.type } };
      const payload = { accountType: lord.type, kvk: lord.kvk ?? null, active: lord.kvkActive ?? false };
      if (!lord.kvk || !lord.kvkActive) return { ...base, verdict: "FAIL", code: "TRD-INVALID-01", evidence: lord.kvk ? "KvK number found but registration is inactive." : "No KvK number supplied.", issuer: "kvk:mock", payload };
      return { ...base, verdict: "PASS", evidence: `KvK ${lord.kvk} active; trader block published on listing.`, issuer: "kvk:mock", payload };
    }
  }
}

export interface GateResult { listingId: string; status: "PUBLISH" | "REFUSE" | "HOLD"; codes: string[]; results: CheckResult[]; totalMs: number; suspend: boolean }
export function aggregate(results: CheckResult[]) {
  if (results.some((r) => r.verdict === "FAIL")) return { status: "REFUSE" as const, codes: results.filter((r) => r.verdict === "FAIL").map((r) => r.code!) };
  if (results.some((r) => r.verdict === "WARN")) return { status: "HOLD" as const, codes: results.filter((r) => r.verdict === "WARN").map((r) => r.code!) };
  return { status: "PUBLISH" as const, codes: [] as string[] };
}
export function runGate(l: Listing, all: Listing[]): GateResult {
  const order: CheckId[] = ["ID", "OWN", "DUP", "BAG", "RENT", "TRADER"];
  const results = order.map((id) => runCheck(id, l, all));
  const agg = aggregate(results);
  const shown = [...new Set(results.flatMap((r) => [r.code, r.disclosure]).filter(Boolean) as string[])].sort();
  return { listingId: l.id, status: agg.status, codes: shown, results, totalMs: results.reduce((s, r) => s + r.ms, 0), suspend: results.some((r) => r.code === "TRD-INVALID-01") };
}

/* ───────────────────────── Prohibited-phrase lint (hospiteer) ───────────────────────── */
export const PROHIBITED: RegExp[] = [
  /\bdutch[- ]only\b/i, /\bno internationals?\b/i, /\bdutch[- ]speaking\b/i, /\bgirls? only\b/i, /\bboys? only\b/i,
  /\bno (foreigners|expats?)\b/i, /\b(christian|muslim|jewish) house\b/i, /\bno (africans?|asians?)\b/i, /\b(only|alleen) nederlandse?\b/i,
];
export function lintProfile(text: string): { ok: boolean; hits: string[] } {
  const hits = PROHIBITED.map((p) => text.match(p)?.[0]).filter(Boolean) as string[];
  return { ok: hits.length === 0, hits };
}
