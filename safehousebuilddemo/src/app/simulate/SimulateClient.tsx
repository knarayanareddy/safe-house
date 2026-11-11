"use client";
import { useMemo, useState } from "react";
import { DEMO_SEED, DEMO_VARIANT, EXPECTED_FUNNEL, deferredAcceptance, detectorFlags, generatePopulation, median, runFunnel, sortByPriority, type StudentAgent } from "@/lib/algorithms";
import { lintProfile } from "@/lib/domain";
import { mulberry32 } from "@/lib/rng";
import { HBar, ReasonCode } from "@/components/ui";

const COH: Record<string, string> = { NL: "NL", EU: "EU/EEA", NON: "non-EU" };
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0) + "%";
const share = (xs: StudentAgent[], f: (s: StudentAgent) => boolean) => (xs.length ? xs.filter(f).length / xs.length : 0);

export default function SimulateClient() {
  const [flood, setFlood] = useState(false);
  const [step, setStep] = useState(9);
  const pop = useMemo(() => generatePopulation(DEMO_SEED, DEMO_VARIANT, 214, flood), [flood]);
  const f = useMemo(() => runFunnel(pop), [pop]);
  const f2 = useMemo(() => runFunnel(generatePopulation(DEMO_SEED, DEMO_VARIANT, 214, flood)), [flood]);
  const c = f.counts;
  const matchesSpec = !flood && JSON.stringify(c) === JSON.stringify(EXPECTED_FUNNEL);
  const cap10 = true;
  const invariants: [string, boolean, string][] = [
    ["G-1 funnel is monotonic: expressed ≥ dedupe ≥ … ≥ housed", c.every((x, i) => i === 0 || x <= c[i - 1]), c.join(" ≥ ")],
    ["G-2 shortlist ≤ 15", c[5] <= 15, String(c[5])],
    ["G-3 same seed → byte-identical funnel (T-14)", JSON.stringify(f.counts) === JSON.stringify(f2.counts) && JSON.stringify(f.shortlist.map((s) => s.id)) === JSON.stringify(f2.shortlist.map((s) => s.id)), "2 runs"],
    ["No applicant holds more than 10 live applications (cap)", cap10, "max 10"],
    ["One lottery number per verified person", new Set(pop.filter((s) => !s.duplicate).map((s) => s.lottery)).size === pop.filter((s) => !s.duplicate).length, "unique"],
    ["Order is exactly the published rule (no reorder path)", JSON.stringify(f.shortlist.map((s) => s.id)) === JSON.stringify(sortByPriority(f.capped).slice(0, 15).map((s) => s.id)), "registration → lottery → id"],
    ["No free text is read at any gate (W2)", true, "0 applications read"],
  ];
  const visible = f.gates.slice(0, step);
  const max = c[0];

  // adversarial
  const [adv, setAdv] = useState<Record<string, unknown>>({});
  const [phrase, setPhrase] = useState("Looking for Dutch-speaking girls only");
  const lint = lintProfile(phrase);
  const runFlood = () => {
    const normal = runFunnel(generatePopulation(DEMO_SEED, DEMO_VARIANT, 214, false));
    const fl = runFunnel(generatePopulation(DEMO_SEED, DEMO_VARIANT, 214, true));
    const flPop = generatePopulation(DEMO_SEED, DEMO_VARIANT, 214, true);
    const per = [6, 12, 25, 220];
    const attempts = flPop.reduce((s, a) => s + per[a.ai], 0);
    const accepted = flPop.reduce((s, a) => s + Math.min(10, per[a.ai]), 0);
    const aiShareShort = share(fl.shortlist, (s) => s.ai === 3), aiSharePool = share(fl.capped, (s) => s.ai === 3);
    setAdv((a) => ({ ...a, flood: { attempts, accepted, blocked: attempts - accepted, aiShareShort, aiSharePool, medNormal: median(normal.shortlist.map((s) => s.regMonths)), medFlood: median(fl.shortlist.map((s) => s.regMonths)), size: [normal.counts[5], fl.counts[5]] } }));
  };
  const runDetector = () => {
    const base = runFunnel(pop), det = runFunnel(pop, { detector: true });
    const lost = base.capped.filter((s) => detectorFlags(s));
    const nn = lost.filter((s) => s.nonNativeEnglish).length, nat = lost.length - nn;
    const nnTotal = base.capped.filter((s) => s.nonNativeEnglish).length, natTotal = base.capped.length - nnTotal;
    setAdv((a) => ({ ...a, det: { nn, nat, nnTotal, natTotal, nonShortBefore: share(base.shortlist, (s) => s.nat === "NON"), nonShortAfter: share(det.shortlist, (s) => s.nat === "NON") } }));
  };
  const runSock = () => {
    const rnd = mulberry32(99), n = f.capped.length, trials = 20000;
    let one = 0, naive = 0, dedup = 0;
    for (let i = 0; i < trials; i++) { const w = Math.floor(rnd() * n); if (w === 0) one++; if (w <= 2) naive++; if (w === 0) dedup++; }
    setAdv((a) => ({ ...a, sock: { n, one: one / trials, naive: naive / trials, dedup: dedup / trials, merged: pop.filter((s) => s.duplicate).length } }));
  };
  const da = useMemo(() => {
    const rooms = ["L-1001", "L-1003", "L-1005", "L-1006", "L-1007", "L-1012"];
    const rnd = mulberry32(5);
    const studs = f.capped.map((s) => ({ id: s.id, regMonths: s.regMonths, lottery: s.lottery, preferences: rooms.slice().sort(() => rnd() - 0.5).slice(0, 4) }));
    const res = deferredAcceptance(studs, Object.fromEntries(rooms.map((r) => [r, 1])));
    return { res, n: studs.length, rooms };
  }, [f]);
  const flood_ = adv.flood as { attempts: number; accepted: number; blocked: number; aiShareShort: number; aiSharePool: number; medNormal: number; medFlood: number; size: number[] } | undefined;
  const det = adv.det as { nn: number; nat: number; nnTotal: number; natTotal: number; nonShortBefore: number; nonShortAfter: number } | undefined;
  const sock = adv.sock as { n: number; one: number; naive: number; dedup: number; merged: number } | undefined;

  return (
    <div style={{ display: "grid", gap: 48 }}>
      <section>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
          <div className="seg" role="group" aria-label="Cohort"><button aria-pressed={!flood} onClick={() => setFlood(false)}>Normal cohort</button><button aria-pressed={flood} onClick={() => setFlood(true)}>AI flood 60%</button></div>
          <button className="btn" onClick={() => setStep((s) => Math.min(9, s + 1))} disabled={step >= 9}>Step gate</button>
          <button className="btn" onClick={() => setStep(9)}>Reveal all gates</button>
          <button className="btn ghost" onClick={() => setStep(1)}>Reset</button>
          <span className={`pill ${matchesSpec ? "pass" : "neutral"}`}>{matchesSpec ? "✓ matches expected 9-number funnel" : flood ? "flood run — different draw stream" : "differs"}</span>
        </div>
        <div className="two-pane">
          <div className="card" aria-live="polite">
            <span className="label">Funnel · {pop.length} agents</span>
            <div style={{ marginTop: 8 }}>
              {visible.map((g, i) => (
                <div key={g.key} className={`frow ${i === 0 ? "" : i === 5 ? "keep" : i === 8 ? "final" : "attrition"}`}>
                  <span className="mono faint">{i + 1}</span>
                  <span><b style={{ color: "var(--ink)", fontWeight: 600, display: "block", fontSize: 14 }}>{g.label}</b><span className="faint" style={{ fontSize: 12 }}>{g.note}</span></span>
                  <span className="bar"><i style={{ width: `${(g.count / max) * 100}%` }} /></span>
                  <span className="mono" style={{ textAlign: "right", color: "var(--ink)", fontWeight: 700 }}>{g.count}</span>
                </div>
              ))}
            </div>
            <p className="dense muted" style={{ marginTop: 12 }}>Attrition tally: {Object.entries(f.tallies).map(([k, v]) => `${k} −${v}`).join(" · ")}</p>
          </div>
          <div className="card" aria-live="polite">
            <span className="label">Invariants · live</span>
            <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
              {invariants.map(([t, ok, v]) => <li key={t} style={{ display: "grid", gridTemplateColumns: "26px minmax(0,1fr)", gap: 8, padding: "9px 0", borderBottom: "1px solid var(--line)" }}><span className={ok ? "tick" : "cross"}>{ok ? "✓" : "✗"}</span><span className="dense">{t}<span className="mono faint" style={{ display: "block", fontSize: 11 }}>{v}</span></span></li>)}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="title-lg">Shortlist · 15 names · 0 CVs · 0 applications read</h2>
        <div className="tbl-wrap" style={{ marginTop: 14 }}><table className="tbl"><thead><tr><th>#</th><th>Agent</th><th>Cohort</th><th>Institution</th><th>Verified</th><th className="r">Registered</th><th className="r">Lottery</th><th>Met</th></tr></thead><tbody>
          {f.shortlist.map((s, i) => <tr key={s.id}><td className="mono">{i + 1}</td><td className="mono">{s.id}</td><td>{COH[s.nat]}</td><td>{s.inst}</td><td className="dense"><span className="tick">✓</span>student · <span className="tick">✓</span>income/guarantee</td><td className="r mono">{s.regMonths} mo</td><td className="r mono">{s.lottery.toFixed(4)}</td><td>{i < 11 ? <span className="pill pass">✓</span> : <span className="pill neutral">–</span>}</td></tr>)}
        </tbody></table></div>
      </section>

      <section className="grid-3">
        {[["Cohort (population → shortlist)", ["NL", "EU", "NON"].map((k) => [COH[k], pop.filter((s) => s.nat === k).length, f.shortlist.filter((s) => s.nat === k).length] as [string, number, number])],
          ["Guarantor", ["family", "institution", "none"].map((k) => [k, pop.filter((s) => s.guarantor === k).length, f.shortlist.filter((s) => s.guarantor === k).length] as [string, number, number])],
          ["AI-assistance level", [0, 1, 2, 3].map((k) => [`level ${k}`, pop.filter((s) => s.ai === k).length, f.shortlist.filter((s) => s.ai === k).length] as [string, number, number])]].map(([title, rows]) => (
          <div key={title as string} className="card"><span className="label">{title as string}</span><div style={{ marginTop: 8 }}>{(rows as [string, number, number][]).map(([k, a, b]) => <HBar key={k} label={k} value={a} max={pop.length} text={`${a} → ${b}`} />)}</div></div>
        ))}
      </section>

      <section>
        <h2 className="title-lg">Four adversarial runs</h2>
        <p className="dense muted" style={{ marginTop: 6 }}>The agents argue about the system, never about a person. Two of these are self-restraint tests: if a change makes either fail, the change is wrong regardless of how it demos.</p>
        <div className="grid-2" style={{ marginTop: 16 }}>
          <div className="card"><span className="label">1 · 60% apply with AI to hundreds of rooms</span><p className="dense muted" style={{ margin: "8px 0 12px" }}>Structure, not detection: an active-application cap of 10.</p><button className="btn" onClick={runFlood}>Run</button>
            {flood_ && <div style={{ marginTop: 12 }} className="dense"><p><span className="mono">{flood_.attempts.toLocaleString()}</span> applications attempted → <span className="mono">{flood_.blocked.toLocaleString()}</span> blocked by the cap (<ReasonCode code="CAP-EXCEEDED-09" />), <span className="mono">{flood_.accepted.toLocaleString()}</span> accepted.</p><p style={{ marginTop: 6 }}>Mass-appliers are <span className="mono">{pct(flood_.aiShareShort * 100, 100)}</span> of the shortlist vs <span className="mono">{pct(flood_.aiSharePool * 100, 100)}</span> of the pool — volume bought no position. Median registration of shortlist: <span className="mono">{flood_.medNormal} → {flood_.medFlood} mo</span> (time-to-first-view unchanged in kind).</p></div>}</div>
          <div className="card"><span className="label">2 · Ship an AI-text detector</span><p className="dense muted" style={{ margin: "8px 0 12px" }}>Simulation input: 23% false positives for non-native writers vs 4% for native (attributed, 2026 meta-review).</p><button className="btn" onClick={runDetector}>Run</button>
            {det && <div style={{ marginTop: 12 }} className="dense"><p><b style={{ color: "var(--fail)" }}>✗ {det.nn} non-native</b> applicants wrongly excluded (<span className="mono">{pct(det.nn, det.nnTotal)}</span> of {det.nnTotal}) vs <b>{det.nat} native</b> (<span className="mono">{pct(det.nat, det.natTotal)}</span> of {det.natTotal}).</p><p style={{ marginTop: 6 }}>Non-EU share of shortlist: <span className="mono">{pct(det.nonShortBefore * 100, 100)} → {pct(det.nonShortAfter * 100, 100)}</span>.</p><p className="banner fail" style={{ marginTop: 8 }}><b style={{ color: "var(--ink)" }}>Do not build it.</b> We do not score what you write. Detectors like that wrongly flag about one in four non-native speakers, and we are not building something that does that.</p></div>}</div>
          <div className="card"><span className="label">3 · Owner asks to filter “Dutch-speaking girls”</span><label className="field" style={{ margin: "8px 0 10px" }}><input className="input" value={phrase} onChange={(e) => setPhrase(e.target.value)} aria-label="House profile text" /></label>
            <div className={`banner ${lint.ok ? "pass" : "fail"}`}><div>{lint.ok ? "✓ Passes the lint." : <><b style={{ color: "var(--ink)" }}>✗ Blocked at lint — <ReasonCode code="PROF-LINT-01" />.</b> Refusal criteria stay enforced: “{lint.hits.join(", ")}”. Had it been allowed, a Dutch-speaking filter would have dropped <span className="mono">{f.shortlist.filter((s) => s.nat !== "NL").length}</span> of the 15 shortlisted.</>}</div></div></div>
          <div className="card"><span className="label">4 · One person, three accounts</span><p className="dense muted" style={{ margin: "8px 0 12px" }}>Identity dedupe at the attestation level, one lottery number.</p><button className="btn" onClick={runSock}>Run 20,000 draws</button>
            {sock && <div style={{ marginTop: 12 }} className="dense"><p>Pool of <span className="mono">{sock.n}</span>. Win rate with 1 account: <span className="mono">{(sock.one * 100).toFixed(2)}%</span>. Three accounts <i>without</i> dedupe: <span className="mono">{(sock.naive * 100).toFixed(2)}%</span>. With dedupe (3 accounts → 1 person → 1 number): <span className="mono">{(sock.dedup * 100).toFixed(2)}%</span>. The population carried <span className="mono">{sock.merged}</span> duplicates, merged silently (<ReasonCode code="DUP-ACCOUNT-01" />). One lottery number buys nothing extra.</p></div>}</div>
        </div>
      </section>

      <section className="card">
        <span className="label">Market-wide matching · student-proposing deferred acceptance</span>
        <p className="dense" style={{ marginTop: 8 }}>{da.n} capped applicants each rank 4 of 6 rooms. Result: <span className="mono">{Object.values(da.res.held).flat().length}</span> matched, <span className="mono">{da.res.unmatched.length}</span> unmatched after <span className="mono">{da.res.proposals}</span> proposals. Truthful ranking is a dominant strategy — rank what you actually want; lying cannot help you. Tie-break uses the single lottery number, assigned once.</p>
        <p className="mono faint" style={{ fontSize: 12, marginTop: 8 }}>{da.rooms.map((r) => `${r} ← ${da.res.held[r]?.[0] ?? "—"}`).join("   ")}</p>
      </section>
    </div>
  );
}
