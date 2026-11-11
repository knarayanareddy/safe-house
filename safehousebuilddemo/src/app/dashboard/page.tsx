import Link from "next/link";
import { HBar, MetricTile, PageHeader, ReasonCode } from "@/components/ui";
import { allAudit, computeMetrics } from "@/lib/server/data";
import { CODE_MAP } from "@/lib/domain";

export const dynamic = "force-dynamic";
const pct = (x: number, d = 0) => (x * 100).toFixed(d) + "%";

export default async function Dashboard() {
  const rows = await allAudit();
  const m = computeMetrics(rows);
  const maxCode = Math.max(1, ...m.byCode.map((c) => c.n));
  const maxW = Math.max(1, ...m.weekly.map((w) => w.refused + w.published));
  return (
    <div>
      <PageHeader
        eyebrow="Municipality of Groningen · housing desk view"
        title={<>The number on the slide is how many listings we <em className="accent">refused</em></>}
        lede="Every figure here comes from a row in the audit log. Click any number to see the rows behind it."
        meta={<><span>audit rows <b>{m.rows.toLocaleString()}</b></span><span>gate decisions <b>{m.decisions}</b></span><span>window <b>14 Sep – 14 Nov 2026</b></span></>}
      />
      <section className="grid-4">
        <MetricTile label="Refusal rate" value={pct(m.refusalRate, 1)} sub={`${m.refused} refused of ${m.refused + m.published} decided`} href="/audit?action=GATE_DECISION" />
        <MetricTile label="Override rate" value={pct(m.overrideRate, 1)} sub={`${m.overrides} reviewer overrides — shown beside the refusal rate on purpose`} href="/audit?action=REVIEW_OVERRIDE" />
        <MetricTile label="Badge coverage" value={pct(m.coverage)} sub="published listings with a complete verification badge" href="/audit?action=GATE_DECISION" />
        <MetricTile label="Rejections with a code" value={pct(m.rejectionsWithCode)} sub="must always be 100%" href="/audit?action=APP_DECLINED" />
      </section>

      <section className="section two-pane">
        <div>
          <h2 className="title-lg">Listings refused, by reason code</h2>
          <div className="card" style={{ marginTop: 14 }}>
            {m.byCode.map((c) => <Link key={c.code} href={`/audit?code=${c.code}`} style={{ display: "block" }}><div style={{ display: "grid", gridTemplateColumns: "140px minmax(0,1fr)", gap: 12, alignItems: "center" }}><ReasonCode code={c.code} /><HBar label={CODE_MAP[c.code]?.sentence.slice(0, 56) ?? ""} value={c.n} max={maxCode} text={String(c.n)} /></div></Link>)}
          </div>
          <h2 className="title-lg" style={{ marginTop: 36 }}>Gate decisions per week</h2>
          <div className="card" style={{ marginTop: 14 }}>
            <table className="tbl"><thead><tr><th>Week of</th><th className="r">Published</th><th className="r">Refused</th><th>Volume</th></tr></thead><tbody>
              {m.weekly.map((w) => <tr key={w.week}><td className="mono">{w.week}</td><td className="r mono">{w.published}</td><td className="r mono">{w.refused}</td><td style={{ width: "40%" }}><div className="hbar" style={{ gridTemplateColumns: "1fr", padding: 0 }}><span className="track"><i style={{ width: `${((w.refused + w.published) / maxW) * 100}%` }} /></span></div></td></tr>)}
            </tbody></table>
          </div>
        </div>
        <aside className="card sticky">
          <span className="label">Operations health</span>
          <dl className="kv" style={{ marginTop: 12 }}>
            <dt>Median hold review</dt><dd>{Math.round(m.medianReviewMin)} min</dd>
            <dt>Median time to offer</dt><dd>{m.medianTimeToOfferH} h</dd>
            <dt>Escalations / 100 applications</dt><dd>{m.escalationsPer100.toFixed(1)}</dd>
            <dt>Off-platform flags / 100 apps</dt><dd>{m.offplatformPer100.toFixed(1)}</dd>
            <dt>Deposits through partner</dt><dd>{pct(m.depositsThroughPartner)}</dd>
            <dt>Applications</dt><dd>{m.apps}</dd>
            <dt>Cap blocks (not judgements)</dt><dd>{m.capBlocked}</dd>
            <dt>Profile lint blocks</dt><dd>{m.lintBlocks}</dd>
            <dt>Sublets blocked</dt><dd>{m.subletBlocked}</dd>
          </dl>
          <p className="dense muted" style={{ marginTop: 14 }}>Open item: replace the WWS-O-2026-approx model with the official Huurcommissie calculator. Appendix C question 2: do municipalities want per-code counts or per-neighbourhood overpricing? Ask three.</p>
        </aside>
      </section>
    </div>
  );
}
