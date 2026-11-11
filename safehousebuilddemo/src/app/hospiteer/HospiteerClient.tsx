"use client";
import { useMemo, useState } from "react";
import { DEMO_SEED, DEMO_VARIANT, generatePopulation, parityTable, runFunnel } from "@/lib/algorithms";
import { generateLetter, lintProfile, RULESET_VERSION } from "@/lib/domain";
import { MotivationLetter, ReasonCode } from "@/components/ui";

const STEPS = [
  ["Publish", "How to apply, how many are invited and on what objective grounds — on this page, before the room opens."],
  ["Pre-select", "Verified student status, then the first 15 by registration duration (or lottery). No CVs, no motivation letters."],
  ["Profile", "Residents publish a house profile — what it is like to live here. A lint blocks any request about who they want."],
  ["Meet", "Every candidate gets the same format and the same 20 minutes. Slots are assigned by the pre-selection order."],
  ["Choose", "Residents choose among the pre-selected pool. The choice happens after everyone had an equal, recorded shot."],
  ["Record", "A refusal cites a published step. The meeting record is stored and the monthly parity is published."],
];
const COHORT: Record<string, string> = { NL: "NL", EU: "EU/EEA", NON: "non-EU" };

export default function HospiteerClient() {
  const f = useMemo(() => runFunnel(generatePopulation(DEMO_SEED, DEMO_VARIANT)), []);
  const parity = useMemo(() => parityTable(), []);
  const [profile, setProfile] = useState("Quiet, tidy house by the Hortus. Sunday dinners, bikes in the hallway, two of us work early shifts. Looking for someone respectful and easy-going.");
  const lint = lintProfile(profile);
  const [chosen, setChosen] = useState<string | null>(null);
  const attended = f.shortlist.slice(0, 11);
  const declinedExample = chosen ? f.shortlist.findIndex((s) => s.id !== chosen && attended.includes(s)) : -1;
  const [lintLog, setLintLog] = useState<string[]>([]);

  return (
    <div style={{ display: "grid", gap: 56 }}>
      <section>
        <h2 className="title-lg">The procedure</h2>
        <ol className="grid-3" style={{ listStyle: "none", padding: 0, margin: "18px 0 0" }}>
          {STEPS.map(([t, d], i) => <li key={t} className="card"><span className="mono faint" style={{ fontSize: 12 }}>step {i + 1}</span><h3 className="title-md" style={{ margin: "4px 0 6px" }}>{t}</h3><p className="dense muted">{d}</p></li>)}
        </ol>
      </section>

      <section>
        <h2 className="title-lg">This house</h2>
        <p className="dense muted" style={{ marginTop: 6 }}>Oosterstraat 54a · four residents. Edit the profile — then try asking for a nationality.</p>
        <div className="two-pane" style={{ marginTop: 16 }}>
          <div className="card">
            <label className="field"><span className="label">House profile (describes the home, not the people you want in it)</span>
              <textarea className="textarea" value={profile} onChange={(e) => setProfile(e.target.value)} aria-describedby="lint-msg" /></label>
            <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn primary" onClick={() => { if (!lint.ok) setLintLog((l) => [`${new Date().toLocaleTimeString()} · blocked “${lint.hits[0]}” → PROF-LINT-01 · attempt logged`, ...l]); }} disabled={false}>Save profile</button>
              <button className="btn sm" onClick={() => setProfile("Looking for Dutch-speaking girls only, no internationals please.")}>Try: “Dutch-speaking girls only”</button>
              <button className="btn sm ghost" onClick={() => setProfile("Quiet, tidy house by the Hortus. Sunday dinners, bikes in the hallway.")}>Reset</button>
            </div>
            <div id="lint-msg" aria-live="polite" className={`banner ${lint.ok ? "pass" : "fail"}`} style={{ marginTop: 14 }}>
              {lint.ok ? <div><b style={{ color: "var(--ink)" }}>✓ Lint passed.</b> This describes the home. It would save.</div> : <div><b style={{ color: "var(--ink)" }}>✗ Save blocked — <ReasonCode code="PROF-LINT-01" /></b><br />“{lint.hits.join("”, “")}” asks for a protected characteristic. A house profile describes the home, not the people you want in it (AWGB). We do not rewrite your text; we log the attempt.</div>}
            </div>
            {lintLog.length > 0 && <ul className="mono faint" style={{ fontSize: 11.5, margin: "12px 0 0", paddingLeft: 16 }}>{lintLog.map((l) => <li key={l}>{l}</li>)}</ul>}
          </div>
          <div className="card well">
            <span className="label">Schedule · identical slots</span>
            <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0 }} className="dense">
              {Array.from({ length: 8 }, (_, i) => { const m = 19 * 60 + i * 20; return <li key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line)" }}><span className="mono">{String(Math.floor(m / 60)).padStart(2, "0")}:{String(m % 60).padStart(2, "0")} – {String(Math.floor((m + 20) / 60)).padStart(2, "0")}:{String((m + 20) % 60).padStart(2, "0")}</span><span className="muted">{f.shortlist[i]?.id} · same format</span></li>; })}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="title-lg">The pool · 15 names, 0 CVs</h2>
        <div className="tbl-wrap" style={{ marginTop: 14 }}><table className="tbl"><thead><tr><th>#</th><th>Applicant</th><th>Cohort</th><th>Verified facts</th><th className="r">Registered</th><th className="r">Lottery no.</th><th>Met</th></tr></thead><tbody>
          {f.shortlist.map((s, i) => (
            <tr key={s.id}><td className="mono">{i + 1}</td><td className="mono">{s.id}</td><td><span className="pill neutral">{COHORT[s.nat]}</span></td><td className="dense"><span className="tick">✓</span>student status · <span className="tick">✓</span>{s.guarantor === "none" ? "income ok" : `${s.guarantor} guarantee`}</td><td className="r mono">{s.regMonths} mo</td><td className="r mono">{s.lottery.toFixed(4)}</td><td>{attended.includes(s) ? <span className="pill pass">✓ met</span> : <span className="pill neutral">– no show</span>}</td></tr>
          ))}
        </tbody></table></div>
        <div className="card" style={{ marginTop: 20 }}>
          <span className="label">Simulate a resident preference</span>
          <p className="dense muted" style={{ margin: "6px 0 12px" }}>Residents pick one of the 11 candidates they met. Everyone else gets a criterion-linked refusal.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{attended.slice(0, 6).map((s) => <button key={s.id} className="btn sm" aria-pressed={chosen === s.id} style={chosen === s.id ? { background: "var(--ink)", color: "var(--bg)" } : undefined} onClick={() => setChosen(s.id)}>{s.id}</button>)}</div>
          {chosen && declinedExample >= 0 && (
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              <div className="banner pass"><div><b style={{ color: "var(--ink)" }}>✓ Residents chose {chosen}.</b> Recorded with the meeting record; 10 refusals generated, each with <ReasonCode code="APP-DECLINE-07" />.</div></div>
              <MotivationLetter body={generateLetter(["APP-DECLINE-07"], { address: "Oosterstraat 54a", ruleSetVersion: RULESET_VERSION, position: declinedExample + 1, total: 15 })} codes={["APP-DECLINE-07"]} />
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="title-lg">Parity · the product</h2>
        <p className="dense muted" style={{ marginTop: 6, maxWidth: "74ch" }}>Published monthly: chosen ÷ invited per cohort. If any band’s ratio deviates more than 1.5× from the pool ratio for two consecutive months, the listing flips to <b>lottery</b> allocation by default.</p>
        {parity.flipTriggered && <div className="banner warn" style={{ marginTop: 14 }}><div><b style={{ color: "var(--ink)" }}>! Flip rule triggered.</b> Non-EU candidates were chosen at about 0.6× the pool rate in September and October. November runs as a lottery — and the ratio recovers.</div></div>}
        <div className="tbl-wrap" style={{ marginTop: 14 }}><table className="tbl"><thead><tr><th>Month</th><th>Mode</th><th>Cohort</th><th className="r">Invited</th><th className="r">Chosen</th><th className="r">Ratio</th><th className="r">vs pool</th><th>Flag</th></tr></thead><tbody>
          {parity.rows.map((r) => <tr key={r.month + r.band}><td>{r.month}</td><td className="dense">{r.mode}</td><td>{COHORT[r.band]}</td><td className="r mono">{r.invited}</td><td className="r mono">{r.chosen}</td><td className="r mono">{r.ratio.toFixed(2)}</td><td className="r mono">{r.deviation.toFixed(2)}×</td><td>{r.flagged ? <span className="pill warn">! deviates</span> : <span className="pill pass">✓ within 1.5×</span>}</td></tr>)}
        </tbody></table></div>
      </section>
    </div>
  );
}
