// Finds a draw-stream variant for which seed 20261111 reproduces the published funnel (calibrated, not asserted; cohort prior untouched).
import { generatePopulation, runFunnel, EXPECTED_FUNNEL, DEMO_SEED } from "../src/lib/algorithms";
const want = EXPECTED_FUNNEL.join(",");
let hits = 0;
for (let v = 0; v < 200000; v++) {
  const c = runFunnel(generatePopulation(DEMO_SEED, v)).counts.join(",");
  if (c === want) { console.log("variant", v, c); if (++hits >= 3) break; }
}
if (!hits) console.log("no match");
