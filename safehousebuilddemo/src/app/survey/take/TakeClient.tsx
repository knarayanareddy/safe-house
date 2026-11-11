"use client";
import Link from "next/link";
import { useState } from "react";
import { V2, V2_SECTIONS, isVisible, type Answers } from "@/lib/survey";

export default function TakeClient() {
  const [a, setA] = useState<Answers>({});
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const set = (id: string, v: Answers[string]) => setA((x) => ({ ...x, [id]: v }));
  const toggle = (id: string, o: string, max?: number) => { const cur = (a[id] as string[]) ?? []; set(id, cur.includes(o) ? cur.filter((x) => x !== o) : max && cur.length >= max ? cur : [...cur, o]); };
  const visible = V2.filter((q) => isVisible(q, a));
  const answeredCount = visible.filter((q) => a[q.id] !== undefined && a[q.id] !== "").length;

  async function submit() {
    setBusy(true);
    const r = await fetch("/api/survey", { method: "POST", body: JSON.stringify({ answers: a }) });
    const j = await r.json();
    if (r.ok) setDone(true); else setErr(j.missing ?? ["unknown"]);
    setBusy(false);
  }
  if (done) return <div className="banner pass" role="status"><div><b style={{ color: "var(--ink)" }}>✓ Thank you.</b> Your response is stored as a real, anonymous v2 response. <Link href="/survey/results" style={{ color: "var(--green)", textDecoration: "underline" }}>See the results</Link>.</div></div>;

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ position: "sticky", top: 52, zIndex: 5, background: "var(--bg)", padding: "10px 0" }}><div className="mono faint" style={{ fontSize: 12 }}>{answeredCount} / {visible.length} answered</div><div className="hbar" style={{ gridTemplateColumns: "1fr", padding: 0 }}><span className="track"><i style={{ width: `${(answeredCount / visible.length) * 100}%` }} /></span></div></div>
      {V2_SECTIONS.map((sec) => (
        <section key={sec} style={{ marginTop: 32 }}>
          <h2 className="title-lg">{sec}</h2>
          <div style={{ display: "grid", gap: 18, marginTop: 14 }}>
            {visible.filter((q) => q.section === sec).map((q) => (
              <fieldset key={q.id} className="card" style={{ margin: 0, borderColor: err.includes(q.id) ? "var(--fail)" : undefined }}>
                <legend className="label" style={{ padding: "0 6px" }}>{q.required ? "required" : "optional"}</legend>
                <p style={{ color: "var(--ink)", fontWeight: 600 }}>{q.prompt}</p>
                {q.help && <p className="dense muted" style={{ marginTop: 6 }}>{q.help}</p>}
                {err.includes(q.id) && <p className="dense" style={{ color: "var(--fail)", marginTop: 6 }}>✗ Please answer this one before sending.</p>}
                <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                  {q.type === "single" && q.options!.map((o) => <label key={o.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", minHeight: 32 }}><input type="radio" name={q.id} checked={a[q.id] === o.id} onChange={() => set(q.id, o.id)} style={{ marginTop: 5 }} />{o.label}</label>)}
                  {(q.type === "multi" || q.type === "max3") && q.options!.map((o) => <label key={o.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", minHeight: 32 }}><input type="checkbox" checked={((a[q.id] as string[]) ?? []).includes(o.id)} onChange={() => toggle(q.id, o.id, q.type === "max3" ? 3 : undefined)} style={{ marginTop: 5 }} />{o.label}</label>)}
                  {q.type === "scale" && <div><div className="seg" style={{ flexWrap: "wrap" }} role="group">{Array.from({ length: q.max! - q.min! + 1 }, (_, i) => q.min! + i).map((n) => <button key={n} aria-pressed={a[q.id] === n} onClick={() => set(q.id, n)} className="mono">{n}</button>)}</div><div className="mono faint" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 4 }}><span>{q.minLabel}</span><span>{q.maxLabel}</span></div></div>}
                  {q.type === "matrix" && q.rows!.map((r) => <div key={r.id} style={{ display: "grid", gap: 6 }}><span className="dense">{r.label}</span><div className="seg" style={{ flexWrap: "wrap" }} role="group">{Array.from({ length: q.max! }, (_, i) => i + 1).map((n) => <button key={n} className="mono" aria-pressed={((a[q.id] as unknown as Record<string, number>) ?? {})[r.id] === n} onClick={() => set(q.id, { ...((a[q.id] as unknown as Record<string, number>) ?? {}), [r.id]: n })}>{n}</button>)}</div></div>)}
                  {q.type === "text" && <textarea className="textarea" onChange={(e) => set(q.id, e.target.value)} />}
                </div>
              </fieldset>
            ))}
          </div>
        </section>
      ))}
      <div style={{ marginTop: 28 }}><button className="btn primary" onClick={submit} disabled={busy} style={{ minHeight: 46 }}>Send my answers</button><p className="dense muted" style={{ marginTop: 10 }}>Nothing you write is scored or ranked. Not legal advice; not a marketing list.</p></div>
    </div>
  );
}
