import Link from "next/link";
import { notFound } from "next/navigation";
import { ActorChip, PageHeader, ReasonCode } from "@/components/ui";
import { CODE_MAP, REASON_CODES } from "@/lib/domain";

export function generateStaticParams() { return REASON_CODES.map((c) => ({ code: c.code })); }

export default async function CodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const c = CODE_MAP[code];
  if (!c) notFound();
  return (
    <div>
      <PageHeader eyebrow="Reason code" title={<span className="mono" style={{ fontSize: "0.8em" }}>{c.code}</span>} lede={c.sentence} />
      <div className="card" style={{ maxWidth: 640 }}>
        <dl className="kv"><dt>Fires when</dt><dd>{c.fires}</dd><dt>Outcome</dt><dd>{c.outcome}</dd><dt>Owner</dt><dd><ActorChip actor={c.owner} /></dd><dt>Response time</dt><dd>{c.sla}</dd><dt>Severity</dt><dd><ReasonCode code={c.code} /></dd></dl>
        <p className="dense muted" style={{ marginTop: 14 }}>Every refusal or hold carries a code and a written motivation, and reaches a named human within 24 hours (W9, W10).</p>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}><Link className="btn" href={`/audit?code=${c.code}`}>Rows with this code</Link><Link className="btn ghost" href="/audit#dictionary">Full dictionary</Link></div>
      </div>
    </div>
  );
}
