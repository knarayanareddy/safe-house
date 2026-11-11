import { generatePersonas } from "../src/lib/personas";
import { answerBoth, tally, numeric, mean } from "../src/lib/survey";
import { buildGraph, SCENARIOS, monteCarlo } from "../src/lib/adoption";

const ps = generatePersonas();
const rows = ps.map((p) => ({ p, a: answerBoth(p) }));
const intents: Record<string, number> = {};
rows.forEach(({ p, a }) => (intents[p.id] = a.v2.intent as number));
const t0 = Date.now();
const g = buildGraph(ps, intents);
console.log("nodes", g.nodes.length, "edges", g.edges.length, "students", g.students.length, "landlords", g.landlords.length);
for (const s of SCENARIOS) { const r = monteCarlo(g, s, 300); console.log(s.key.padEnd(12), "p=", r.p.toFixed(3), "mean=", r.mean.toFixed(3), "p10", r.p10.toFixed(2), "p90", r.p90.toFixed(2), "landlords", r.landlordMean.toFixed(2)); }
console.log("ms", Date.now() - t0);
const v2 = rows.map((r) => ({ answers: r.a.v2 })), v1 = rows.map((r) => ({ answers: r.a.v1 }));
console.log("v2 intent mean", mean(numeric(v2, "intent")).toFixed(2), "v1 likely mean", mean(numeric(v1, "v1_likely")).toFixed(2));
console.log("v1 feature", tally(v1, "v1_feature"));
console.log("v1 concern", tally(v1, "v1_concern"));
console.log("v1 difficulties", tally(v1, "v1_difficulties"));
console.log("v2 pains", tally(v2, "pains"));
console.log("v2 alloc", tally(v2, "alloc"), "cap", tally(v2, "cap"), "commit", tally(v2, "commit"));
console.log("usefulness", ["verify", "queue", "hospiteer", "sublet"].map((k) => k + ":" + mean(numeric(v2, "usefulness", k)).toFixed(2)).join(" "));
console.log("ai", mean(numeric(v2, "ai", "checks")).toFixed(2), mean(numeric(v2, "ai", "rank")).toFixed(2));
console.log("scam", tally(v2, "scam"), "barrier", tally(v2, "barrier"), "pay", tally(v2, "pay"));
console.log("role", tally(v2, "role"), "arch");
console.log(ps.slice(0, 3).map((p) => p.bio));
console.log(rows.filter((r) => r.a.v2.comment).slice(0, 4).map((r) => r.a.v2.comment));
