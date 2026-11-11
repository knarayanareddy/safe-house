import Link from "next/link";
import { ActorChip, EmptyState, PageHeader, ReasonCode } from "@/components/ui";
import { auditChainStatus } from "@/lib/server/data";
import { REASON_CODES, type Actor } from "@/lib/domain";
import AuditControls from "./AuditControls";

export const dynamic = "force-dynamic";
const PAGE = 60;

export default async function Audit({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { rows, status } = await auditChainStatus();
  const actions = Array.from(new Set(rows.map((r) => r.action))).sort();
  let list = rows.slice().reverse();
  if (sp.action) list = list.filter((r) => r.action === sp.action);
  if (sp.actor) list = list.filter((r) => r.actor === sp.actor);
  if (sp.code) list = list.filter((r) => r.codes.includes(sp.code!));
  if (sp.q) list = list.filter((r) => r.subject.toLowerCase().includes(sp.q!.toLowerCase()));
  const page = Math.max(1, Number(sp.page ?? 1));
  const shown = list.slice((page - 1) * PAGE, page * PAGE);
  const broken = status.brokenAt !== null;
  const qs = (o: Record<string, string | undefined>) => "?" + Object.entries({ ...sp, ...o }).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&");
  return (
    <div>
      <PageHeader eyebrow="Append-only · hash-chained" title={<>The proof is a log you can <em className="accent">break</em></>} lede="Each row’s hash covers its content and the previous row’s hash. Change one row and every row after it stops verifying. Try it." />
      <section aria-live="polite" className={`banner ${broken ? "fail" : "pass"}`} style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <div><span className="label" style={{ display: "block" }}>Chain status</span><span className="mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>{broken ? "✗ " : "✓ "}{status.verified.toLocaleString()} / {status.total.toLocaleString()} rows verified</span><p className="dense" style={{ marginTop: 4 }}>{broken ? `Chain broken at row #${status.brokenAt}. Rows ${status.brokenAt}–${status.total} can no longer be trusted.` : "Every row recomputes to its stored hash, and every link matches."}</p></div>
        <AuditControls broken={broken} />
      </section>

      <form className="card" style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }} method="get">
        <label className="field"><span className="label">Action</span><select className="select" name="action" defaultValue={sp.action ?? ""}><option value="">All</option>{actions.map((a) => <option key={a}>{a}</option>)}</select></label>
        <label className="field"><span className="label">Actor</span><select className="select" name="actor" defaultValue={sp.actor ?? ""}><option value="">All</option>{["landlord", "agent", "student", "system", "ops", "money"].map((a) => <option key={a}>{a}</option>)}</select></label>
        <label className="field"><span className="label">Code</span><select className="select" name="code" defaultValue={sp.code ?? ""}><option value="">Any</option>{REASON_CODES.map((c) => <option key={c.code}>{c.code}</option>)}</select></label>
        <label className="field"><span className="label">Subject contains</span><input className="input" name="q" defaultValue={sp.q ?? ""} /></label>
        <button className="btn primary">Filter</button><Link className="btn ghost" href="/audit">Clear</Link>
        <span className="dense muted" style={{ marginLeft: "auto" }}>{list.length.toLocaleString()} rows</span>
      </form>

      <div className="tbl-wrap" style={{ marginTop: 16 }}>
        {shown.length === 0 ? <EmptyState why="No audit rows match these filters." action={<Link className="btn" href="/audit">Clear filters</Link>} /> : (
          <table className="tbl"><thead><tr><th className="r">#</th><th>When (UTC)</th><th>Actor</th><th>Action</th><th>Subject</th><th>Codes</th><th>Hash</th><th>✓</th></tr></thead><tbody>
            {shown.map((r) => {
              const bad = broken && r.seq >= status.brokenAt!;
              return <tr key={r.seq}><td className="r mono">{r.seq}</td><td className="mono dense">{r.ts.toISOString().slice(0, 16).replace("T", " ")}</td><td><ActorChip actor={r.actor as Actor} /></td><td className="mono dense">{r.action}</td><td className="mono dense" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.subject}</td><td><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{r.codes.map((c) => <ReasonCode key={c} code={c} />)}</div></td><td className="mono faint" style={{ fontSize: 11 }}>{r.hash.slice(0, 10)}…</td><td>{bad ? <span className="pill fail">✗ {r.seq === status.brokenAt ? "tampered" : "unverifiable"}</span> : <span className="tick">✓</span>}</td></tr>;
            })}
          </tbody></table>
        )}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
        {page > 1 && <Link className="btn sm" href={qs({ page: String(page - 1) })}>← Newer</Link>}
        <span className="mono faint" style={{ fontSize: 12 }}>page {page} / {Math.max(1, Math.ceil(list.length / PAGE))}</span>
        {page * PAGE < list.length && <Link className="btn sm" href={qs({ page: String(page + 1) })}>Older →</Link>}
      </div>

      <section className="section" id="dictionary">
        <header><h2 className="title-lg">Reason-code dictionary · {REASON_CODES.length} codes</h2><p className="dense muted" style={{ marginTop: 6 }}>Generated from a single source of truth. A decline without a code is impossible.</p></header>
        <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Code</th><th>Fires when</th><th>Outcome</th><th>Owner</th><th>SLA</th><th>Plain-language sentence</th></tr></thead><tbody>
          {REASON_CODES.map((c) => <tr key={c.code} id={c.code}><td><ReasonCode code={c.code} /></td><td className="dense">{c.fires}</td><td className="dense">{c.outcome}</td><td><ActorChip actor={c.owner} /></td><td className="mono dense">{c.sla}</td><td className="dense">{c.sentence}</td></tr>)}
        </tbody></table></div>
      </section>
    </div>
  );
}
