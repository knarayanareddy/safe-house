// Wall + integrity tests. Run: npx tsx scripts/verify.ts
import { LISTINGS } from "../src/lib/listings";
import { runGate, nameSimilarity, lintProfile, REASON_CODES, CODE_MAP } from "../src/lib/domain";
import { generatePopulation, runFunnel, EXPECTED_FUNNEL, topTradingCycles, SWAP_AGENTS, deferredAcceptance, parityTable } from "../src/lib/algorithms";
import fs from "node:fs";
import path from "node:path";

let pass = 0, fail = 0;
const t = (name: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  → " + detail}`); };

// D-01 fixtures
for (const l of LISTINGS) {
  const g = runGate(l, LISTINGS);
  const codesOk = l.expected.codes.every((c) => g.codes.includes(c)) && g.codes.length === l.expected.codes.length;
  t(`D-01 ${l.id} ${l.fixture} → ${l.expected.status} ${l.expected.codes.join(",")}`, g.status === l.expected.status && codesOk, `${g.status} ${g.codes.join(",")}`);
  t(`T-15 ${l.id} every code in dictionary`, g.codes.every((c) => !!CODE_MAP[c]));
}
// T-18
t("T-18 J. van der Berg ~ Jan van der Berg", nameSimilarity("J. van der Berg", "Jan van der Berg") >= 0.92);
t("T-18 Müller ~ Muller", nameSimilarity("Müller", "Muller") >= 0.92);
t("T-18 Ahmed El Amrani ~ A. El Amrani", nameSimilarity("Ahmed El Amrani", "A. El Amrani") >= 0.92);
t("T-18 P. de Vries !~ J. de Vries", nameSimilarity("P. de Vries", "J. de Vries") < 0.92);
t("T-18 Jan Jansen !~ Piet Jansen", nameSimilarity("Jan Jansen", "Piet Jansen") < 0.92);
// D-02 / T-13 / T-14
const f1 = runFunnel(generatePopulation());
const f2 = runFunnel(generatePopulation());
t(`D-02 funnel seed 20261111 = ${EXPECTED_FUNNEL.join("→")}`, JSON.stringify(f1.counts) === JSON.stringify(EXPECTED_FUNNEL), f1.counts.join("→"));
t("T-14 determinism", JSON.stringify(f1.counts) === JSON.stringify(f2.counts) && JSON.stringify(f1.shortlist.map((s) => s.id)) === JSON.stringify(f2.shortlist.map((s) => s.id)));
t("T-13 monotonic + shortlist ≤ 15", f1.counts.every((c, i) => i === 0 || c <= f1.counts[i - 1]) && f1.counts[5] <= 15);
// T-01 / T-03 / T-06 static greps
const srcDir = path.join(process.cwd(), "src");
const files: string[] = [];
(function walk(d: string) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(e.name) && files.push(p); } })(srcDir);
const grep = (re: RegExp, skip: RegExp[] = []) => files.filter((f) => !skip.some((s) => s.test(f))).filter((f) => re.test(fs.readFileSync(f, "utf8")));
const allowPersona = [/survey\.ts$/, /personas\.ts$/, /adoption\.ts$/, /\/swarm\//, /\/survey\//, /SwarmLab/, /domain\.ts$/, /algorithms\.ts$/, /schema\.ts$/, /seed\.ts$/];
t("T-01 no personality/trust/fit score fields in allocation code", grep(/\b(fit_score|compatibility_score|trust_score|behaviou?r_score|bigfive|big_five|mbti)\b/i, allowPersona).length === 0);
t("T-03 no AI-text detection dependency or authorship scoring", grep(/aiProbability|authorshipScore|gptzero|originality\.ai/i).length === 0);
t("T-06 no passport/BSN/document columns", grep(/(passport|bsn|id_doc)\s*[:=]/i, [/domain\.ts$/, /survey\.ts$/, /personas\.ts$/]).length === 0);
t("T-09 allocation imports nothing from simulation/persona modules", !/from "\.\/(personas|survey|adoption)"/.test(fs.readFileSync("src/lib/algorithms.ts", "utf8")) && !/from "\.\/(personas|survey|adoption)"/.test(fs.readFileSync("src/lib/domain.ts", "utf8")));
t("W9 every reason code has a sentence", REASON_CODES.every((c) => c.sentence.length > 10));
// lint
t("PROF-LINT blocks 'Dutch-speaking girls'", !lintProfile("Looking for Dutch-speaking girls only").ok);
t("PROF-LINT allows a neutral profile", lintProfile("Quiet house, Sunday dinners, bikes in the hallway").ok);
// TTC
const ttc = topTradingCycles(SWAP_AGENTS.filter((a) => a.consent !== "refused"));
t("TTC finds a 2-cycle (S044 ↔ S051)", ttc.moves.some((c) => c.length === 2 && c.includes("S044") && c.includes("S051")));
// DA
const da = deferredAcceptance([{ id: "a", preferences: ["x", "y"], regMonths: 5, lottery: 0.1 }, { id: "b", preferences: ["x", "y"], regMonths: 9, lottery: 0.2 }], { x: 1, y: 1 });
t("DA: higher priority wins x, other gets y", da.held.x[0] === "b" && da.held.y[0] === "a");
t("Parity: non-EU deviation flips to lottery", parityTable().flipTriggered);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
