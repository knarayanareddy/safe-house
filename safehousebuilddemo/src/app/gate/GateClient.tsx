"use client";
import { useState } from "react";
import { CHECK_NAMES, type GateResult } from "@/lib/domain";
import { GateSummary } from "@/components/ui";

interface Fx { id: string; address: string; rent: number; poster: string; blurb: string }
const LABEL: Record<string, string> = { genuine: "Genuine private owner", fraud: "Fraud: stolen photos, wrong owner", silent: "Genuine, slow-replying owner", agent: "Agent under a management mandate", holdphoto: "Photos without provenance", nondwelling: "Office, not a dwelling", badkvk: "Professional with lapsed KvK" };
const ORDER = ["ID", "OWN", "DUP", "BAG", "RENT", "TRADER"] as const;

export default function GateClient({ fixtures }: { fixtures: Fx[] }) {
  const [id, setId] = useState("L-1002");
  const fx = fixtures.find((f) => f.id === id)!;
  const [rent, setRent] = useState<number | "">("");
  const [running, setRunning] = useState(false);
  const [shown, setShown] = useState(0);
  const [res, setRes] = useState<{ gate: GateResult; letter?: string; seq: number; elapsedMs: number } | null>(null);
  const [clock, setClock] = useState(0);

  async function run() {
    setRunning(true); setRes(null); setShown(0);
    const t0 = performance.now();
    const p = fetch("/api/gate", { method: "POST", body: JSON.stringify({ listingId: id, rentEur: rent === "" ? undefined : rent }) }).then((r) => r.json());
    const tick = setInterval(() => setClock(performance.now() - t0), 50);
    for (let i = 1; i <= 6; i++) { await new Promise((r) => setTimeout(r, 330)); setShown(i); }
    const j = await p;
    clearInterval(tick);
    setClock(performance.now() - t0);
    setRes(j); setRunning(false);
  }

  return (
    <div className="two-pane">
      <div>
        <h2 className="title-lg">1 · Choose a submission</h2>
        <div style={{ display: "grid", gap: 10, marginTop: 14 }} role="radiogroup" aria-label="Fixture">
          {fixtures.map((f) => (
            <button key={f.id} role="radio" aria-checked={id === f.id} onClick={() => { setId(f.id); setRes(null); setShown(0); }} className="card" style={{ textAlign: "left", borderColor: id === f.id ? "var(--green)" : undefined, outline: id === f.id ? "1px solid var(--green)" : undefined, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ color: "var(--ink)", fontWeight: 600 }}>{f.address}</span><span className="mono faint">€{f.rent}</span></div>
              <div className="dense muted">{LABEL[f.blurb] ?? f.blurb} · posted by {f.poster} · <span className="mono">{f.id}</span></div>
            </button>
          ))}
        </div>
        <h2 className="title-lg" style={{ marginTop: 28 }}>2 · Optional: change the asking rent</h2>
        <label className="field" style={{ marginTop: 10, maxWidth: 260 }}><span className="label">Asking rent (€)</span><input className="input mono" type="number" value={rent} placeholder={String(fx.rent)} onChange={(e) => setRent(e.target.value === "" ? "" : Number(e.target.value))} /></label>
        <p className="dense muted" style={{ marginTop: 6 }}>Try €900 on the genuine room: it still publishes, with a rent disclosure — the gate discloses, it does not refuse.</p>
        <button className="btn primary" style={{ marginTop: 20, minHeight: 46 }} onClick={run} disabled={running}>{running ? "Running checks…" : "Run the gate"}</button>
      </div>

      <div aria-live="polite">
        <h2 className="title-lg">3 · Result</h2>
        <div className="card" style={{ marginTop: 14 }}>
          <div className="mono faint" style={{ fontSize: 12, display: "flex", justifyContent: "space-between" }}><span>{fx.address}</span><span>{(clock / 1000).toFixed(1)} s</span></div>
          {!res && (
            <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "grid", gap: 8 }}>
              {ORDER.map((c, i) => (
                <li key={c} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)", color: i < shown ? "var(--ink)" : "var(--faint)" }}>
                  <span>{CHECK_NAMES[c]} <span className="mono faint" style={{ fontSize: 11 }}>{c}</span></span>
                  <span className="mono" style={{ fontSize: 12 }}>{i < shown ? "✓ ran" : running && i === shown ? "…checking" : "queued"}</span>
                </li>
              ))}
            </ul>
          )}
          {res && (
            <div style={{ marginTop: 14 }}>
              <GateSummary gate={res.gate} letter={res.letter} address={fx.address} />
              <p className="mono faint" style={{ fontSize: 11.5, marginTop: 12 }}>Written to the audit chain as row #{res.seq}. Result in {(clock / 1000).toFixed(1)} s.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
