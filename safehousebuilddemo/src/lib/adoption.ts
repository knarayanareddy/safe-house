// MiroFish-style swarm: a knowledge graph of personas + institutions/platforms, belief propagation over rounds, and
// Monte-Carlo scenario frequencies (p ≈ k / N). SIMULATION ONLY — it rehearses adoption; it never selects a person.
import { mulberry32, clamp, type Rng } from "./rng";
import type { Persona, ClusterKey } from "./personas";

export type ScenarioKey = "baseline" | "rug_endorse" | "scam_wave" | "cold_start" | "rival_price";
type Target = "all" | "students" | "landlords" | ClusterKey;
export interface SimEvent { round: number; target: Target; push: number; platform: "forum" | "chat"; text: string; hub?: string }
export interface Scenario { key: ScenarioKey; label: string; blurb: string; events: SimEvent[] }

const BASE: SimEvent[] = [
  { round: 2, target: "students", push: 0.135, platform: "forum", text: "Launch thread in “Rooms in Groningen” and r/groningen: a listing only goes live after owner, address and photo checks." },
  { round: 4, target: "rug_nl", push: 0.1, platform: "chat", text: "GSb newsletter mentions the verification log — “first platform that publishes what it refused”.", hub: "GSb Student Union" },
  { round: 4, target: "movers", push: 0.09, platform: "chat", text: "Sublet-with-consent explained in a WhatsApp group of outbound exchange students." },
  { round: 6, target: "all", push: 0.135, platform: "forum", text: "First 12 verified rooms published; a fake listing is refused in 8 seconds and the reason codes are public." },
  { round: 8, target: "hanze", push: 0.05, platform: "forum", text: "Kamernet fee complaints trend among Hanze students." },
  { round: 10, target: "landlords", push: -0.1, platform: "forum", text: "Landlord thread: “Another platform to maintain. Why would I give up choosing my own tenant?”" },
];
export const SCENARIOS: Scenario[] = [
  { key: "baseline", label: "Baseline launch", blurb: "Organic launch in Facebook groups, GSb newsletter and word of mouth. No institutional endorsement.", events: BASE },
  { key: "rug_endorse", label: "RUG International Office endorses", blurb: "The international office adds safe-house to the pre-arrival welcome pack.", events: [...BASE, { round: 3, target: "rug_intl", push: 0.26, platform: "forum", text: "RUG International Office adds safe-house to the welcome pack: “Check what was verified before you pay anyone.”", hub: "RUG International Office" }, { round: 3, target: "short_stay", push: 0.2, platform: "chat", text: "Exchange coordinators forward the guide to incoming students." }, { round: 5, target: "landlords", push: 0.12, platform: "chat", text: "Landlords who rent to internationals hear that RUG recommends safe-house." }] },
  { key: "scam_wave", label: "Viral scam story", blurb: "A fake-listing wave hits Facebook; fear makes verification suddenly relevant.", events: [...BASE, { round: 3, target: "rug_intl", push: 0.22, platform: "forum", text: "Viral post: “30 students lost deposits this week to the same fake landlord.”" }, { round: 3, target: "hanze", push: 0.16, platform: "forum", text: "Hanze students share screenshots of the fake listing." }, { round: 5, target: "students", push: 0.12, platform: "chat", text: "Local news: housing scam reports up eightfold. Everyone is asking how to check a landlord." }] },
  { key: "cold_start", label: "Landlords stay away", blurb: "Students arrive but supply doesn't: the chicken-and-egg problem.", events: [{ round: 1, target: "landlords", push: -0.4, platform: "forum", text: "Landlord WhatsApp groups dismiss the platform: “We get 200 replies anyway.”" }, ...BASE.filter((e) => e.target !== "landlords")] },
  { key: "rival_price", label: "Incumbent fights back", blurb: "Kamernet drops its fee for a month and HousingAnywhere ships a badge.", events: [...BASE, { round: 3, target: "students", push: -0.11, platform: "forum", text: "Kamernet announces a one-month fee freeze. “Why switch now?”", hub: "Kamernet" }, { round: 6, target: "rug_intl", push: -0.08, platform: "chat", text: "HousingAnywhere launches its own “verified” label." }] },
];

export interface GNode { id: number; kind: "persona" | "hub"; label: string; cluster: ClusterKey | "hub"; role: "student" | "landlord" | "hub"; archetype?: string; skeptic: number; prior: number; personaId?: string }
export interface Graph { nodes: GNode[]; neighbors: number[][]; weights: number[][]; edges: [number, number][]; hubIds: Record<string, number>; students: number[]; landlords: number[] }

export const HUBS = [
  { label: "RUG International Office", stance: 0 }, { label: "Hanze Housing Desk", stance: 0 }, { label: "GSb Student Union", stance: 0.1 },
  { label: "Kamernet", stance: -0.15 }, { label: "Facebook: Rooms in Groningen", stance: 0 }, { label: "Gemeente Groningen", stance: 0 }, { label: "safe-house", stance: 0.35 },
];

export function buildGraph(personas: Persona[], intents: Record<string, number>, seed = 77): Graph {
  const rnd = mulberry32(seed);
  const nodes: GNode[] = personas.map((p, i) => ({ id: i, kind: "persona", label: p.name, cluster: p.cluster, role: p.role, archetype: p.archetype, skeptic: p.traits.skeptic, prior: ((intents[p.id] ?? 5) - 5.2) / 7, personaId: p.id }));
  const hubIds: Record<string, number> = {};
  HUBS.forEach((h) => { hubIds[h.label] = nodes.length; nodes.push({ id: nodes.length, kind: "hub", label: h.label, cluster: "hub", role: "hub", skeptic: 0, prior: h.stance }); });
  const edgeSet = new Set<string>();
  const edges: [number, number][] = [];
  const add = (a: number, b: number) => { if (a === b) return; const k = a < b ? `${a}-${b}` : `${b}-${a}`; if (edgeSet.has(k)) return; edgeSet.add(k); edges.push([a, b]); };
  const byCluster = new Map<string, number[]>();
  personas.forEach((p, i) => { const l = byCluster.get(p.cluster) ?? []; l.push(i); byCluster.set(p.cluster, l); });
  personas.forEach((p, i) => {
    const mates = byCluster.get(p.cluster)!;
    const k = 2 + Math.floor(p.traits.network * 3);
    for (let j = 0; j < k; j++) add(i, mates[Math.floor(rnd() * mates.length)]);
    if (rnd() < 0.35) add(i, Math.floor(rnd() * personas.length));
    // institution / platform memberships
    if (p.role === "student") {
      add(i, hubIds[p.inst === "Hanze" ? "Hanze Housing Desk" : "RUG International Office"]);
      if (p.cohort !== "NL" && p.inst === "RUG") add(i, hubIds["RUG International Office"]);
      if (rnd() < 0.55) add(i, hubIds["Facebook: Rooms in Groningen"]);
      if (rnd() < 0.5) add(i, hubIds["Kamernet"]);
      if (rnd() < 0.3 + 0.3 * p.traits.fairness) add(i, hubIds["GSb Student Union"]);
    } else {
      if (rnd() < 0.5) add(i, hubIds["Kamernet"]);
      if (rnd() < 0.5) add(i, hubIds["Facebook: Rooms in Groningen"]);
      add(i, hubIds["Gemeente Groningen"]);
    }
  });
  HUBS.forEach((h, k) => { if (h.label === "safe-house") personas.forEach((_, i) => { if (i % 9 === k) add(i, hubIds["safe-house"]); }); });
  const neighbors: number[][] = nodes.map(() => []);
  const weights: number[][] = nodes.map(() => []);
  edges.forEach(([a, b]) => {
    const hub = nodes[a].kind === "hub" || nodes[b].kind === "hub";
    const w = hub ? 0.5 : 1;
    neighbors[a].push(b); weights[a].push(nodes[b].kind === "hub" ? 0.5 : w);
    neighbors[b].push(a); weights[b].push(nodes[a].kind === "hub" ? 0.5 : w);
  });
  return { nodes, neighbors, weights, edges, hubIds, students: nodes.filter((n) => n.role === "student").map((n) => n.id), landlords: nodes.filter((n) => n.role === "landlord").map((n) => n.id) };
}

export interface SimState { round: number; stance: number[]; adopted: boolean[]; scenario: Scenario; rnd: Rng; mult: number }
export interface Post { round: number; platform: "forum" | "chat"; who: string; text: string; tone: "pos" | "neg" | "sys" | "neutral"; node?: number }
export interface RoundResult { round: number; studentAdoption: number; landlordAdoption: number; flipsUp: number[]; flipsDown: number[]; posts: Post[]; pulses: [number, number][]; eventIdx: number[] }
export const ROUNDS = 12;
export const STUDENT_T = 0.2;
export const SUCCESS = { students: 0.4, landlords: 0.3 };

export function createSim(g: Graph, scenario: Scenario, seed: number, jitter = 0.08, multVar = 0): SimState {
  const rnd = mulberry32(seed);
  const stance = g.nodes.map((n) => clamp(n.prior * 0.9 + (rnd() - 0.5) * 2 * jitter, -1, 1));
  return { round: 0, stance, adopted: stance.map((s) => s > STUDENT_T), scenario, rnd, mult: 1 + (rnd() - 0.5) * 2 * multVar };
}

const inTarget = (n: GNode, t: Target) => t === "all" ? n.role !== "hub" : t === "students" ? n.role === "student" : t === "landlords" ? n.role === "landlord" : n.cluster === t;

export function stepSim(g: Graph, s: SimState, withText = false, personaOf?: (i: number) => Persona | undefined): RoundResult {
  s.round++;
  const r = s.round;
  const rnd = s.rnd;
  const next = s.stance.slice();
  const evs = s.scenario.events.map((e, i) => [e, i] as const).filter(([e]) => e.round === r);
  const supply = g.landlords.filter((i) => s.adopted[i]).length / Math.max(1, g.landlords.length);
  const demand = g.students.filter((i) => s.adopted[i]).length / Math.max(1, g.students.length);
  for (const n of g.nodes) {
    const i = n.id;
    if (n.kind === "hub") {
      for (const [e] of evs) if (e.hub === n.label) next[i] = clamp(next[i] + Math.abs(e.push) * (e.push < 0 ? -1 : 1) * s.mult, -1, 1);
      continue;
    }
    let influence = 0, wsum = 0;
    const nb = g.neighbors[i], w = g.weights[i];
    for (let k = 0; k < nb.length; k++) { influence += s.stance[nb[k]] * w[k]; wsum += w[k]; }
    const peer = wsum ? influence / wsum : 0;
    let d = 0.2 * (peer - s.stance[i]);
    for (const [e] of evs) if (inTarget(n, e.target)) d += e.push * s.mult * (1 - n.skeptic * 0.45);
    // two-sided market: students follow supply, landlords follow demand
    if (n.role === "student") d += (supply - 0.3) * 0.12;
    else d += (demand - 0.3) * 0.08;
    d += (rnd() - 0.5) * 0.06;
    next[i] = clamp(s.stance[i] + d, -1, 1);
  }
  const flipsUp: number[] = [], flipsDown: number[] = [];
  const adopted = next.map((v, i) => (g.nodes[i].kind === "hub" ? false : v > STUDENT_T));
  adopted.forEach((a, i) => { if (a && !s.adopted[i]) flipsUp.push(i); if (!a && s.adopted[i] && g.nodes[i].kind !== "hub") flipsDown.push(i); });
  const posts: Post[] = [];
  const pulses: [number, number][] = [];
  if (withText) {
    evs.forEach(([e]) => posts.push({ round: r, platform: e.platform, who: e.hub ?? "Event", text: e.text, tone: e.push < 0 ? "neg" : "sys" }));
    flipsUp.slice(0, 6).forEach((i) => { const p = personaOf?.(i); posts.push({ round: r, platform: rnd() < 0.55 ? "forum" : "chat", who: g.nodes[i].label, node: i, tone: "pos", text: line(p, true, rnd) }); });
    flipsDown.slice(0, 3).forEach((i) => { const p = personaOf?.(i); posts.push({ round: r, platform: "forum", who: g.nodes[i].label, node: i, tone: "neg", text: line(p, false, rnd) }); });
  }
  [...flipsUp, ...flipsDown].slice(0, 40).forEach((i) => { const nb = g.neighbors[i]; for (let k = 0; k < 2 && nb.length; k++) pulses.push([i, nb[Math.floor(rnd() * nb.length)]]); });
  for (let k = 0; k < 14; k++) { const e = g.edges[Math.floor(rnd() * g.edges.length)]; pulses.push(rnd() < 0.5 ? [e[0], e[1]] : [e[1], e[0]]); }
  s.stance = next;
  s.adopted = adopted;
  const sa = g.students.filter((i) => adopted[i]).length / Math.max(1, g.students.length);
  const la = g.landlords.filter((i) => adopted[i]).length / Math.max(1, g.landlords.length);
  return { round: r, studentAdoption: sa, landlordAdoption: la, flipsUp, flipsDown, posts, pulses, eventIdx: evs.map(([, i]) => i) };
}

const POS: Record<string, string[]> = {
  student: ["Okay, being able to see what was actually checked changes things. I'd try it.", "Fine if the queue rule is published. At least I'd know where I stand.", "My friends are on it now, so I'm in.", "If it really refuses fake listings, that alone is worth it."],
  landlord: ["If it saves me reading 200 replies, I'll list one room.", "Defensible selection records? That's actually useful for the new rules.", "Verified tenants only — I'll give it a go."],
};
const NEG: string[] = ["Another platform. I'll stay with my WhatsApp groups.", "Not enough rooms on it yet — sticking with Kamernet.", "I don't trust a new site with my details.", "Cap on applications? That's not how this market works."];
function line(p: Persona | undefined, pos: boolean, rnd: Rng) {
  const pool = pos ? POS[p?.role === "landlord" ? "landlord" : "student"] : NEG;
  return pool[Math.floor(rnd() * pool.length)];
}

export interface MCResult { runs: number; finals: number[]; successes: number; p: number; mean: number; p10: number; p90: number; bins: number[]; landlordMean: number }
export function monteCarlo(g: Graph, scenario: Scenario, runs = 1000, seed = 4242): MCResult {
  const finals: number[] = [];
  let successes = 0, lsum = 0;
  for (let k = 0; k < runs; k++) {
    const sim = createSim(g, scenario, seed + k * 131, 0.12, 0.35);
    let res: RoundResult | null = null;
    for (let r = 0; r < ROUNDS; r++) res = stepSim(g, sim, false);
    finals.push(res!.studentAdoption);
    lsum += res!.landlordAdoption;
    if (res!.studentAdoption >= SUCCESS.students && res!.landlordAdoption >= SUCCESS.landlords) successes++;
  }
  const sorted = finals.slice().sort((a, b) => a - b);
  const bins = new Array(20).fill(0);
  finals.forEach((f) => bins[Math.min(19, Math.floor(f * 20))]++);
  return { runs, finals, successes, p: successes / runs, mean: finals.reduce((s, x) => s + x, 0) / runs, p10: sorted[Math.floor(runs * 0.1)], p90: sorted[Math.floor(runs * 0.9)], bins, landlordMean: lsum / runs };
}
