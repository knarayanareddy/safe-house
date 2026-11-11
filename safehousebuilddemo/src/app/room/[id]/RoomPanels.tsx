"use client";
import { useCallback, useEffect, useState } from "react";
import { DEMO_APPLICANTS, compareProfiles, type DeclaredProfile } from "@/lib/algorithms";
import { CODE_MAP, type HouseProfile, type ListingStatus } from "@/lib/domain";
import { MotivationLetter, QueuePosition } from "@/components/ui";

interface Props { listing: { id: string; status: ListingStatus; address: string; house: HouseProfile; rentEur: number; minMonths: number } }
interface AppRow { id: number; listingId: string; status: string; position: number | null; total: number | null }

export function RoomPanels({ listing }: Props) {
  const [who, setWho] = useState<string>(DEMO_APPLICANTS[0].id);
  const me = DEMO_APPLICANTS.find((a) => a.id === who)!;
  const [rows, setRows] = useState<AppRow[]>([]);
  const [live, setLive] = useState(0);
  const [msg, setMsg] = useState<{ tone: "pass" | "fail" | "warn"; text: string; letter?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [declineCode, setDeclineCode] = useState("");
  const [decl, setDecl] = useState<{ tone: "pass" | "fail"; text: string; letter?: string } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/applications?applicant=${who}`);
    const j = await r.json();
    setRows(j.rows); setLive(j.live);
  }, [who]);
  useEffect(() => { load(); setMsg(null); }, [load]);

  const mine = rows.find((r) => r.listingId === listing.id && r.status === "SUBMITTED");
  const open = listing.status === "PUBLISHED";

  async function apply() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/applications", { method: "POST", body: JSON.stringify({ applicant: who, listingId: listing.id }) });
    const j = await r.json();
    if (r.status === 409 && j.code === "CAP-EXCEEDED-09") setMsg({ tone: "warn", text: "You can hold ten live applications at a time. This is a limit on attention, not a judgement about you.", letter: j.letter });
    else if (!r.ok) setMsg({ tone: "fail", text: j.message ?? j.error });
    await load(); setBusy(false);
  }
  async function bulk() { setBusy(true); await fetch("/api/applications", { method: "POST", body: JSON.stringify({ applicant: who, bulk: 9 }) }); await load(); setBusy(false); }
  async function reset() { await fetch(`/api/applications?applicant=${who}`, { method: "DELETE" }); setMsg(null); setDecl(null); await load(); }
  async function decline(withCode: boolean) {
    const r = await fetch("/api/applications/decline", { method: "POST", body: JSON.stringify({ listingId: listing.id, applicant: who, code: withCode ? declineCode : undefined, position: mine?.position, total: mine?.total }) });
    const j = await r.json();
    if (r.status === 422) setDecl({ tone: "fail", text: `422 ${j.error} — ${j.message} No state was changed.` });
    else setDecl({ tone: "pass", text: `Decline recorded as audit row #${j.seq} with code ${declineCode}. The applicant receives the letter below.`, letter: j.letter });
  }
  async function reorder() { const r = await fetch("/api/applications/reorder", { method: "POST" }); const j = await r.json(); setDecl({ tone: "fail", text: `${r.status} ${j.error} — ${j.message}` }); }

  const profile = compareProfiles(me.profile as unknown as DeclaredProfile, { ...(listing.house as HouseProfile), budgetMaxEur: 0, durationMonths: 0, rentEur: listing.rentEur, minMonths: listing.minMonths }).slice(0, 5);
  const word = { MATCH: "same", NEAR: "similar", DIFFERENT: "differs", UNKNOWN: "not compared" } as const;

  return (
    <div style={{ marginTop: 40, display: "grid", gap: 28 }}>
      <section className="card" aria-label="Apply">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
          <h2 className="title-lg">Apply for this room</h2>
          <span className="mono faint" style={{ fontSize: 12 }}>live applications <b style={{ color: "var(--ink)" }}>{live}</b> / 10</span>
        </div>
        <p className="dense muted" style={{ marginTop: 6 }}>One tap. No cover letter — nothing you write is read, scored or ranked (W2). Pick a demo applicant:</p>
        <div className="seg" role="group" aria-label="Demo applicant" style={{ marginTop: 12, flexWrap: "wrap" }}>
          {DEMO_APPLICANTS.map((a) => <button key={a.id} aria-pressed={who === a.id} onClick={() => setWho(a.id)}>{a.name.split(" ")[0]}</button>)}
        </div>
        <p className="dense" style={{ marginTop: 10 }}>{me.blurb}</p>
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button className="btn primary" disabled={!open || busy || !!mine} onClick={apply}>{mine ? "Application submitted" : "Express interest"}</button>
          <button className="btn sm" disabled={busy} onClick={bulk} title="Demo helper: create nine other live applications">Demo: fill to 10 applications</button>
          <button className="btn sm ghost" onClick={reset}>Reset demo applicant</button>
        </div>
        {!open && <p className="dense muted" style={{ marginTop: 10 }}>Applications are closed — only published rooms accept them.</p>}
        {msg && <div className={`banner ${msg.tone}`} style={{ marginTop: 14 }} role="status"><div>{msg.text}</div></div>}
        {msg?.letter && <div style={{ marginTop: 12 }}><MotivationLetter body={msg.letter} codes={["CAP-EXCEEDED-09"]} /></div>}
        {mine && mine.position && mine.total && <div style={{ marginTop: 16 }}><QueuePosition position={mine.position} total={mine.total} /></div>}
      </section>

      {open && (
        <section aria-label="Declared profile comparison">
          <h2 className="title-lg">Declared preferences, side by side</h2>
          <p className="dense muted" style={{ marginTop: 6 }}>Display, never score: no total, no percentage, no bar out of 100. Top five differences first.</p>
          <div className="tbl-wrap" style={{ marginTop: 12 }}><table className="tbl"><thead><tr><th>Field</th><th>{me.name.split(" ")[0]}</th><th>This house</th><th>Comparison</th></tr></thead><tbody>
            {profile.map((f) => <tr key={f.field}><td>{f.field}</td><td className="mono">{f.studentValue}</td><td className="mono">{f.houseValue}</td><td><span className={`pill ${f.verdict === "DIFFERENT" ? "warn" : f.verdict === "MATCH" ? "pass" : "neutral"}`}>{f.verdict === "MATCH" ? "✓ " : f.verdict === "DIFFERENT" ? "! " : "~ "}{word[f.verdict]}</span></td></tr>)}
          </tbody></table></div>
        </section>
      )}

      {open && (
        <section className="card well" aria-label="Landlord console">
          <span className="label">Landlord console · dev toggle</span>
          <h2 className="title-md" style={{ margin: "8px 0" }}>Try to decline {me.name.split(" ")[0]} — and try to cut the queue</h2>
          <p className="dense muted">A decline must reference a published criterion. Leave the code empty to see the server refuse; pick one to see the letter.</p>
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <select className="select" style={{ maxWidth: 320 }} value={declineCode} onChange={(e) => setDeclineCode(e.target.value)} aria-label="Reason code"><option value="">— no reason code —</option>{["APP-DECLINE-07", "APP-ELIG-04", "APP-ELIG-05", "APP-ELIG-06", "CMT-MISSED-10"].map((c) => <option key={c} value={c}>{c} · {CODE_MAP[c].fires}</option>)}</select>
            <button className="btn" onClick={() => decline(!!declineCode)}>Decline applicant</button>
            <button className="btn danger" onClick={reorder}>Move applicant up</button>
          </div>
          {decl && <div className={`banner ${decl.tone}`} style={{ marginTop: 14 }} role="status"><div>{decl.text}</div></div>}
          {decl?.letter && <div style={{ marginTop: 12 }}><MotivationLetter body={decl.letter} codes={[declineCode]} /></div>}
        </section>
      )}
    </div>
  );
}
