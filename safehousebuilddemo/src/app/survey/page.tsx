import Link from "next/link";
import { PageHeader, SimBadge } from "@/components/ui";
import { COVERAGE, V1, V1_FINDINGS, V2, V2_SECTIONS, covScore, type Cov } from "@/lib/survey";
import { countResponses } from "@/lib/server/data";

export const dynamic = "force-dynamic";
const covPill = (c: Cov) => <span className={`pill ${c === "full" ? "pass" : c === "partial" ? "warn" : "fail"}`}>{c === "full" ? "✓ covered" : c === "partial" ? "! partial" : "✗ missing"}</span>;

export default async function SurveyReview() {
  const counts = await countResponses();
  const s1 = covScore(COVERAGE, "v1"), s2 = covScore(COVERAGE, "v2");
  return (
    <div>
      <PageHeader
        eyebrow="Survey Lab · does it capture the build?"
        title={<>The current survey measures a product <em className="accent">we are not building</em></>}
        lede="We read the Google Form against the safe-house master spec, question by question. Short answer: no — it is a decent mood check, but it can’t confirm or kill a single core design decision. Below: what’s missing, the redesigned v2, and 262 persona agents’ answers to both."
        meta={<><SimBadge /><span>v1 coverage <b>{s1} / {COVERAGE.length}</b></span><span>v2 coverage <b>{s2} / {COVERAGE.length}</b></span><span>stored responses <b>{counts.reduce((s, c) => s + c.n, 0)}</b></span></>}
      />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/survey/results" className="btn primary">See simulated results (v1 vs v2)</Link>
        <Link href="/survey/take" className="btn">Take v2 yourself (stored as real)</Link>
        <Link href="/swarm" className="btn">Watch the swarm fill it in</Link>
        <a className="btn ghost" href="https://docs.google.com/forms/d/e/1FAIpQLSf3xft7pBgeSzfbP2qCxY0pmb3iZtYXFew20KXeoELAGrlzrA/viewform" target="_blank" rel="noreferrer">Original Google Form ↗</a>
        <a className="btn ghost" href="/api/survey?version=v2&source=simulated">Export v2 CSV</a>
      </div>

      <section className="section">
        <header><h2 className="title-lg">Coverage: what the spec needs to learn vs what each version asks</h2></header>
        <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Need</th><th>Why it matters</th><th>v1 (Google Form)</th><th>v2 (redesigned)</th></tr></thead><tbody>
          {COVERAGE.map((r) => (
            <tr key={r.id}><td style={{ minWidth: 200 }}><span className="mono faint" style={{ fontSize: 11 }}>{r.id}</span> <b style={{ color: "var(--ink)", fontWeight: 600 }}>{r.area}</b></td><td className="dense muted" style={{ minWidth: 200 }}>{r.why}</td><td style={{ minWidth: 220 }}>{covPill(r.v1)}<div className="dense muted" style={{ marginTop: 4 }}>{r.v1note}</div></td><td style={{ minWidth: 200 }}>{covPill(r.v2)}<div className="mono faint" style={{ fontSize: 11, marginTop: 4 }}>{r.v2qs.join(" · ")}</div></td></tr>
          ))}
        </tbody></table></div>
      </section>

      <section className="section">
        <header><h2 className="title-lg">What’s wrong with v1</h2></header>
        <div className="grid-2">
          {V1_FINDINGS.map((f) => (
            <div key={f.title} className="card">
              <span className={`pill ${f.sev === "high" ? "fail" : f.sev === "medium" ? "warn" : "neutral"}`}>{f.sev === "high" ? "✗ HIGH" : f.sev === "medium" ? "! MEDIUM" : "· LOW"}</span>
              <h3 className="title-md" style={{ margin: "10px 0 6px" }}>{f.title}</h3>
              <p className="dense muted">{f.detail}</p>
              <p className="dense" style={{ marginTop: 8 }}><b style={{ color: "var(--green)" }}>Fix in v2 →</b> {f.fix}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <header><h2 className="title-lg">v2 at a glance · {V2.length} questions, ~6–7 minutes with branching</h2><p className="dense muted" style={{ marginTop: 6 }}>Landlords skip the student-only questions and get two of their own. The free-text comment is read by humans and never scored (W2).</p></header>
        <div className="grid-2">
          {V2_SECTIONS.map((sec) => (
            <div key={sec} className="card"><span className="label">{sec}</span><ol className="dense" style={{ margin: "10px 0 0", paddingLeft: 18, display: "grid", gap: 4 }}>{V2.filter((q) => q.section === sec).map((q) => <li key={q.id}>{q.prompt.length > 90 ? q.prompt.slice(0, 88) + "…" : q.prompt} <span className="mono faint" style={{ fontSize: 10.5 }}>{q.covers?.join(" ")}</span></li>)}</ol></div>
          ))}
          <div className="card well"><span className="label">v1 · for reference ({V1.length} questions)</span><ol className="dense" style={{ margin: "10px 0 0", paddingLeft: 18, display: "grid", gap: 4 }}>{V1.map((q) => <li key={q.id}>{q.prompt}</li>)}</ol></div>
        </div>
      </section>
    </div>
  );
}
