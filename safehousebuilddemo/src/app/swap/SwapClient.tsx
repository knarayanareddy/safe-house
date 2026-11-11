"use client";
import { useEffect, useMemo, useState } from "react";
import { SWAP_AGENTS, topTradingCycles } from "@/lib/algorithms";
import { ReasonCode } from "@/components/ui";

type Consent = "NONE" | "AWAITING" | "GRANTED" | "REFUSED";
interface SubRow { id: number; room: string; headRent: number; subletRent: number; startsOn: string; endsOn: string; status: string }

export default function SwapClient() {
  const [headRent] = useState(520);
  const [rent, setRent] = useState(520);
  const [start, setStart] = useState("2027-02-01");
  const [end, setEnd] = useState("2027-07-15");
  const leaseEnd = "2027-07-31";
  const [deposit, setDeposit] = useState(520);
  const [consent, setConsent] = useState<Consent>("NONE");
  const [brp, setBrp] = useState<"yes" | "no" | "unsure">("unsure");
  const [hours, setHours] = useState(17);
  const [ack, setAck] = useState(false);
  const [out, setOut] = useState<{ tone: "pass" | "fail"; text: string } | null>(null);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const load = () => fetch("/api/sublets").then((r) => r.json()).then(setSubs);
  useEffect(() => { load(); }, []);

  const errs = useMemo(() => {
    const e: { code: string; text: string }[] = [];
    if (consent !== "GRANTED") e.push({ code: "SUBLET-CONSENT-01", text: consent === "REFUSED" ? "The owner refused. A sublet cannot exist." : "A sublet needs the owner’s written consent. We have asked them; you will see their answer here." });
    if (rent > headRent) e.push({ code: "SUBLET-CAP-02", text: `A sublet cannot cost more than your own rent (€${headRent}).` });
    if (end > leaseEnd) e.push({ code: "SUBLET-DUR-03", text: `This ends after your own tenancy does (${leaseEnd}).` });
    if (deposit > 2 * headRent) e.push({ code: "DEP-CAP-03", text: "The deposit cannot exceed two months’ rent." });
    return e;
  }, [consent, rent, end, deposit, headRent]);
  const hardBlock = errs.some((e) => e.code !== "SUBLET-CONSENT-01") || consent !== "GRANTED";
  const left = Math.max(0, 48 - hours);
  const canPublish = !hardBlock && left === 0 && ack;
  const state = consent === "GRANTED" ? (left > 0 ? "AWAITING_CONSENT → floor" : "LIVE") : consent === "AWAITING" ? "AWAITING_CONSENT" : "BLOCKED";

  async function publish(force = false) {
    const r = await fetch("/api/sublets", { method: "POST", body: JSON.stringify({ headTenant: "Noor", room: "Paddepoelsterweg 23", headRent, subletRent: rent, startsOn: start, endsOn: end, leaseEnd, deposit, consent: force ? "NONE" : consent }) });
    const j = await r.json();
    if (r.ok) { setOut({ tone: "pass", text: `Sublet #${j.id} is LIVE. Consent recorded, caps respected.` }); load(); }
    else setOut({ tone: "fail", text: `422 BLOCKED — ${j.errors.map((e: { code: string; message: string }) => `${e.code}: ${e.message}`).join(" ")} No sublet was created.` });
  }

  // swap board
  const [ran, setRan] = useState(false);
  const [exec, setExec] = useState<Record<string, "PROPOSED" | "EXECUTING" | "DONE">>({});
  const board = SWAP_AGENTS;
  const ttc = useMemo(() => topTradingCycles(board.filter((a) => a.consent !== "refused")), [board]);
  const name = (id: string) => board.find((a) => a.id === id)!;
  const advance = (key: string) => { setExec((s) => ({ ...s, [key]: "EXECUTING" })); setTimeout(() => setExec((s) => ({ ...s, [key]: "DONE" })), 1400); };

  return (
    <div className="two-pane" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
      <section>
        <h2 className="title-lg">Sublet my room</h2>
        <div className={`banner ${consent === "GRANTED" ? "pass" : consent === "REFUSED" ? "fail" : "warn"}`} style={{ marginTop: 14 }} aria-live="polite" role="status">
          <div style={{ width: "100%" }}>
            <span className="label" style={{ display: "block", marginBottom: 4 }}>Consent status · always visible</span>
            <b style={{ color: "var(--ink)" }}>{consent === "GRANTED" ? "✓ CONSENTED 12 Nov" : consent === "REFUSED" ? "✗ REFUSED" : consent === "AWAITING" ? "! AWAITING CONSENT" : "! NOT REQUESTED"}</b>
            <p className="dense" style={{ marginTop: 4 }}>{consent === "GRANTED" ? "Owner H. Smit confirmed in writing (mock e-signature)." : "A sublet needs the owner’s written consent. We have asked them; you will see their answer here."}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button className="btn sm" onClick={() => setConsent("AWAITING")} disabled={consent !== "NONE"}>Ask my landlord</button>
              <button className="btn sm" onClick={() => setConsent("GRANTED")} disabled={consent !== "AWAITING"}>Demo: landlord grants</button>
              <button className="btn sm" onClick={() => setConsent("REFUSED")} disabled={consent !== "AWAITING"}>Demo: landlord refuses</button>
              <button className="btn sm ghost" onClick={() => { setConsent("NONE"); setOut(null); setHours(17); setAck(false); }}>Reset</button>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16, display: "grid", gap: 16 }}>
          <div className="grid-2">
            <label className="field"><span className="label">Sublet rent (head rent €{headRent})</span><input className="input mono" type="number" value={rent} onChange={(e) => setRent(Number(e.target.value))} /></label>
            <label className="field"><span className="label">Deposit</span><input className="input mono" type="number" value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} /></label>
            <label className="field"><span className="label">Starts</span><input className="input mono" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label className="field"><span className="label">Ends (your lease ends {leaseEnd})</span><input className="input mono" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
          </div>
          <div aria-live="polite" style={{ display: "grid", gap: 6 }}>
            {errs.filter((e) => e.code !== "SUBLET-CONSENT-01").length === 0 ? <p className="dense"><span className="tick">✓</span>Rent, dates and deposit are within the three caps.</p> : errs.filter((e) => e.code !== "SUBLET-CONSENT-01").map((e) => <p key={e.code} className="dense" style={{ color: "var(--fail)" }}><span className="cross">✗</span><ReasonCode code={e.code} /> {e.text}</p>)}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className="btn sm" onClick={() => setRent(headRent + 80)}>Try rent €{headRent + 80}</button><button className="btn sm" onClick={() => setEnd("2027-09-01")}>Try ending Sept 2027</button><button className="btn sm ghost" onClick={() => { setRent(520); setEnd("2027-07-15"); setDeposit(520); }}>Reset</button></div>
          </div>
          <fieldset style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 12 }}>
            <legend className="label" style={{ padding: "0 6px" }}>Can the subtenant register (BRP) at this address?</legend>
            <div className="seg" role="group">{(["yes", "no", "unsure"] as const).map((v) => <button key={v} aria-pressed={brp === v} onClick={() => setBrp(v)}>{v === "unsure" ? "Not sure" : v === "yes" ? "Yes" : "No"}</button>)}</div>
            {brp !== "yes" && <p className="dense" style={{ marginTop: 8, color: "var(--warn)" }}><span className="bang">!</span>Your subtenant cannot register at this address — they usually can’t in a sublet. Exchange students may still need it for their residence permit.</p>}
          </fieldset>
          <label style={{ display: "flex", gap: 10, fontSize: 13.5 }}><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18 }} /><span>I understand the subtenant gets no rent protection and that I stay liable towards the landlord.</span></label>
          <div className="banner" style={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}><span className="label">48-hour floor</span><p className="dense" style={{ marginTop: 4 }}>{left > 0 ? `A hurried choice is how people end up with the wrong housemate. You can review candidates now; publishing opens in ${left} h.` : "The floor has passed — publishing is open."}</p></div>
            <div style={{ textAlign: "right" }}><div className="mono" style={{ fontSize: 26, fontWeight: 700, color: "var(--ink)" }}>{String(left).padStart(2, "0")}:00</div><button className="btn sm" onClick={() => setHours(48)}>Fast-forward 48 h</button></div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn primary" disabled={!canPublish} onClick={() => publish()}>Publish sublet</button>
            <button className="btn danger sm" onClick={() => publish(true)} title="Bypass the UI and call the API without consent">Dev: force-create without consent</button>
            <span className="pill neutral mono">{state}</span>
          </div>
          {out && <div className={`banner ${out.tone}`} role="status"><div>{out.text}</div></div>}
        </div>

        {subs.length > 0 && <div className="tbl-wrap" style={{ marginTop: 16 }}><table className="tbl"><thead><tr><th>Sublet</th><th>Room</th><th className="r">Rent</th><th>Window</th><th>Status</th></tr></thead><tbody>{subs.map((s) => <tr key={s.id}><td className="mono">U-{s.id}</td><td>{s.room}</td><td className="r mono">€{s.subletRent}</td><td className="mono dense">{s.startsOn} → {s.endsOn}</td><td><span className="pill pass">✓ {s.status}</span></td></tr>)}</tbody></table></div>}
      </section>

      <section>
        <h2 className="title-lg">Swap board</h2>
        <p className="dense muted" style={{ marginTop: 6 }}>Everyone below already holds a room and wants another. Top trading cycles are strategy-proof and Pareto-efficient: nobody gains by lying about what they want.</p>
        <div className="tbl-wrap" style={{ marginTop: 14 }}><table className="tbl"><thead><tr><th>I’m leaving</th><th>I need</th><th>Window</th><th>Consent</th></tr></thead><tbody>
          {board.map((a) => <tr key={a.id}><td><span className="mono faint" style={{ fontSize: 11 }}>{a.id}</span> {a.name}<div className="dense muted">{a.holdsLabel}</div></td><td className="dense">{a.wants.map((w) => board.find((b) => b.holdsRoomId === w)?.holdsLabel.split(" · ")[0]).join(" › ")}</td><td className="dense mono">{a.window}</td><td><span className={`pill ${a.consent === "granted" ? "pass" : a.consent === "pending" ? "warn" : "fail"}`}>{a.consent === "granted" ? "✓ granted" : a.consent === "pending" ? "! pending" : "✗ refused"}</span></td></tr>)}
        </tbody></table></div>
        <button className="btn primary" style={{ marginTop: 14 }} onClick={() => setRan(true)}>Detect cycles</button>
        {ran && (
          <div style={{ display: "grid", gap: 14, marginTop: 16 }} aria-live="polite">
            {ttc.moves.map((c) => {
              const key = c.join("-");
              const blocked = c.filter((id) => name(id).consent !== "granted");
              const st = exec[key] ?? "PROPOSED";
              return (
                <div key={key} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><b style={{ color: "var(--ink)" }}>{c.length === 2 ? "Mutual swap" : `${c.length}-way cycle`} · {c.map((id) => id).join(" → ")} → {c[0]}</b><span className={`pill ${st === "DONE" ? "pass" : st === "EXECUTING" ? "warn" : "neutral"}`}>{st}</span></div>
                  <p className="dense muted" style={{ marginTop: 6 }}>{c.map((id) => `${name(id).name.split(" ")[0]} (${name(id).holdsLabel.split(" · ")[0]})`).join(" → ")} — all windows align ({name(c[0]).window}).</p>
                  <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "flex", gap: 10, flexWrap: "wrap" }}>{c.map((id) => <li key={id} className={`pill ${name(id).consent === "granted" ? "pass" : "warn"}`}>{name(id).consent === "granted" ? "✓" : "!"} leg {id}: landlord consent {name(id).consent}</li>)}</ul>
                  <button className="btn sm primary" style={{ marginTop: 12 }} disabled={blocked.length > 0 || st !== "PROPOSED"} onClick={() => advance(key)}>{blocked.length ? `Waiting for consent: ${blocked.join(", ")}` : "Execute swap"}</button>
                </div>
              );
            })}
            <p className="dense muted">S091 is excluded: the landlord refused consent. Cycles ship 2-cycles first, then 3-cycles; each leg needs its own recorded consent (W11).</p>
          </div>
        )}
      </section>
    </div>
  );
}
