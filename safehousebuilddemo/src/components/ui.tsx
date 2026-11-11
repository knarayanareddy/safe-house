import Link from "next/link";
import type { ReactNode } from "react";
import { ACTORS, CODE_MAP, type Actor, type CheckResult, type GateResult, type ListingStatus, CEILING_LABEL } from "@/lib/domain";

export function Icon({ name, size = 18 }: { name: "shield" | "home" | "search" | "swap" | "users" | "chart" | "log" | "spark" | "check" | "x" | "alert" | "arrow" | "pin" | "bike" | "bed" | "euro" | "calendar"; size?: number }) {
  const p: Record<string, ReactNode> = {
    shield: <><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></>,
    home: <><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /></>,
    search: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4-4" /></>,
    swap: <><path d="M4 8h14l-3-3" /><path d="M20 16H6l3 3" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14c3 0 5 2 5 5" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></>,
    log: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
    spark: <><circle cx="12" cy="12" r="2" /><circle cx="5" cy="6" r="1.5" /><circle cx="19" cy="7" r="1.5" /><circle cx="6" cy="18" r="1.5" /><circle cx="18" cy="18" r="1.5" /><path d="M10.5 11L6 7M13.5 11l4.5-3M10.5 13L7 17M13.5 13l3.5 4" /></>,
    check: <path d="M5 12l4 4 10-10" />, x: <path d="M6 6l12 12M18 6L6 18" />, alert: <><path d="M12 4l9 16H3L12 4z" /><path d="M12 10v4M12 17v.5" /></>,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />, pin: <><path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.4" /></>,
    bike: <><circle cx="6" cy="16" r="3.5" /><circle cx="18" cy="16" r="3.5" /><path d="M6 16l4-8h5l3 8M10 8H8" /></>,
    bed: <><path d="M3 18V7M3 14h18v4M21 14v-3a3 3 0 00-3-3h-7v6" /><circle cx="7" cy="11" r="1.6" /></>,
    euro: <><path d="M17 7a6 6 0 100 10" /><path d="M5 10h8M5 14h8" /></>,
    calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p[name]}</svg>;
}

export function MockBadge({ issuer }: { issuer: string }) {
  if (!issuer) throw new Error("MockBadge requires an issuer (W12)");
  return <span className="mock" title="Simulated in this demo">{issuer}</span>;
}

const STATUS: Record<ListingStatus, { cls: string; icon: string }> = {
  DRAFT: { cls: "neutral", icon: "·" }, CHECKING: { cls: "neutral", icon: "…" }, HOLD: { cls: "warn", icon: "!" }, PUBLISHED: { cls: "pass", icon: "✓" },
  REFUSED: { cls: "fail", icon: "✗" }, SUSPENDED: { cls: "fail", icon: "✗" }, WITHDRAWN: { cls: "neutral", icon: "–" }, LET: { cls: "green", icon: "●" },
};
export function StatusPill({ status }: { status: ListingStatus }) {
  const s = STATUS[status];
  return <span className={`pill ${s.cls}`}><span aria-hidden="true">{s.icon}</span>{status}</span>;
}

export function ReasonCode({ code, variant }: { code: string; variant?: "fail" | "warn" | "pass" }) {
  const def = CODE_MAP[code];
  const v = variant ?? (def?.kind === "fail" ? "fail" : def?.kind === "warn" ? "warn" : undefined);
  return <Link href={`/codes/${code}`} className={`code ${v ?? ""}`} title={def ? def.sentence : code}>{code}</Link>;
}

export function ActorChip({ actor, size = "sm" }: { actor: Actor; size?: "sm" | "md" }) {
  const a = ACTORS[actor] ?? ACTORS.system;
  return <span className="chip" style={{ fontSize: size === "md" ? 14 : 12.5 }}><i className="dot" style={{ background: a.color }} />{a.label}</span>;
}

const VERDICT = { PASS: { icon: "✓", cls: "pass" }, FAIL: { icon: "✗", cls: "fail" }, WARN: { icon: "!", cls: "warn" }, SKIP: { icon: "–", cls: "neutral" } } as const;
export function CheckRow({ r }: { r: CheckResult }) {
  const v = VERDICT[r.verdict];
  return (
    <details className="check" style={{ borderBottom: "1px solid var(--line)", padding: "12px 0" }}>
      <summary style={{ display: "grid", gridTemplateColumns: "72px minmax(0,1fr) auto", gap: 12, alignItems: "start", cursor: "pointer", listStyle: "none" }}>
        <span className={`pill ${v.cls}`} style={{ justifyContent: "center" }}><span aria-hidden>{v.icon}</span>{r.verdict}</span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", color: "var(--ink)", fontWeight: 600, fontSize: 14 }}>{r.name} <span className="mono faint" style={{ fontWeight: 500, fontSize: 11 }}>{r.id}</span></span>
          <span className="dense muted" style={{ display: "block" }}>{r.evidence}</span>
          {(r.code || r.disclosure) && <span style={{ display: "inline-flex", gap: 6, marginTop: 6 }}>{r.code && <ReasonCode code={r.code} />}{r.disclosure && <ReasonCode code={r.disclosure} variant="warn" />}</span>}
        </span>
        <span className="mono faint" style={{ fontSize: 11 }}>{r.ms} ms</span>
      </summary>
      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}><MockBadge issuer={r.issuer} /><span className="faint dense">raw payload — exactly what the check received</span></div>
      <pre className="mono" style={{ margin: "8px 0 0", padding: 12, background: "var(--bg-2)", borderRadius: 8, fontSize: 11.5, overflow: "auto", color: "var(--ink-2)" }}>{JSON.stringify(r.payload, null, 2)}</pre>
    </details>
  );
}

export function GateSummary({ gate, letter, address }: { gate: GateResult; letter?: string; address?: string }) {
  const tone = gate.status === "PUBLISH" ? "pass" : gate.status === "HOLD" ? "warn" : "fail";
  const word = gate.status === "PUBLISH" ? "✓ PUBLISH" : gate.status === "HOLD" ? "! HOLD" : "✗ REFUSE";
  const copy = gate.status === "PUBLISH" ? "Six checks passed. What we verified, and when, is shown on the listing." : gate.status === "HOLD" ? "This listing is held for a named human reviewer. It reaches them within 24 hours, with the reason recorded." : `This listing cannot go live. ${gate.results.filter((r) => r.verdict === "FAIL").length} checks failed${gate.codes.some((c) => CODE_MAP[c]?.code === "LOT-RENT-04") ? " and one needs disclosure" : ""} — the reasons are below and have been sent to the poster.`;
  return (
    <section aria-live="polite" aria-label="Verification gate result">
      <div className={`banner ${tone}`} style={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}><span className="label" style={{ display: "block", marginBottom: 4 }}>Gate decision{address ? ` · ${address}` : ""}</span><p style={{ color: "var(--ink)" }}>{copy}</p></div>
        <div style={{ textAlign: "right" }}><span className={`pill ${tone}`} style={{ fontSize: 13 }}>{word}</span><div className="mono faint" style={{ fontSize: 11, marginTop: 6 }}>{gate.totalMs} ms · no score, no weight</div></div>
      </div>
      <div style={{ marginTop: 8 }}>{gate.results.map((r) => <CheckRow key={r.id} r={r} />)}</div>
      {gate.codes.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>{gate.codes.map((c) => <ReasonCode key={c} code={c} />)}</div>}
      {letter && <div style={{ marginTop: 16 }}><MotivationLetter body={letter} codes={gate.codes} /></div>}
    </section>
  );
}

export function MotivationLetter({ body, codes }: { body: string; codes: string[] }) {
  return <div className="letter"><span className="label" style={{ display: "block", marginBottom: 8, fontFamily: "var(--sans)" }}>Written motivation (generated)</span>{body}<footer>{codes.join(" · ") || "no codes"} · Selection rules v1.2</footer></div>;
}

export function CeilingBreakdown({ rows, points, ceiling, rent }: { rows: { label: string; points: number }[]; points: number; ceiling: number; rent: number }) {
  const diff = rent - ceiling;
  return (
    <div>
      <div className="tbl-wrap"><table className="tbl"><tbody>
        {rows.map((r) => <tr key={r.label}><td>{r.label}</td><td className="r mono">{r.points}</td></tr>)}
        <tr><td style={{ fontWeight: 700, color: "var(--ink)" }}>Total points</td><td className="r mono" style={{ fontWeight: 700, color: "var(--ink)" }}>{points}</td></tr>
        <tr><td>Indicative legal maximum</td><td className="r mono">≈ €{Math.round(ceiling)}</td></tr>
        <tr><td>Asking rent</td><td className="r mono">€{rent}</td></tr>
        <tr><td style={{ fontWeight: 700, color: "var(--ink)" }}>{diff > 0 ? "Over" : "Under"} the maximum</td><td className="r mono" style={{ fontWeight: 700, color: diff > 0 ? "var(--warn)" : "var(--pass)" }}>{diff > 0 ? "! +" : "✓ −"}€{Math.abs(Math.round(diff))}</td></tr>
      </tbody></table></div>
      <p className="faint" style={{ fontSize: 12, marginTop: 8 }}><span className="mock" style={{ marginRight: 6 }}>{CEILING_LABEL}</span>An approximation for demonstration. Asking above the maximum is not automatically unlawful, but you should know the number. Open item: replace with the official Huurcommissie calculator.</p>
    </div>
  );
}

export function PageHeader({ eyebrow, title, lede, meta, accent }: { eyebrow: string; title: ReactNode; lede?: ReactNode; meta?: ReactNode; accent?: string }) {
  void accent;
  return (
    <header className="page-head">
      <span className="label">{eyebrow}</span>
      <h1 className="title-xl">{title}</h1>
      {lede && <p className="lede">{lede}</p>}
      {meta && <div className="meta-row">{meta}</div>}
    </header>
  );
}

export function MetricTile({ label, value, sub, href }: { label: string; value: ReactNode; sub?: ReactNode; href?: string }) {
  const body = (
    <div className="card" style={{ height: "100%" }}>
      <span className="label">{label}</span>
      <div className="mono" style={{ fontSize: 32, fontWeight: 700, color: "var(--ink)", marginTop: 8, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <p className="dense muted" style={{ marginTop: 4 }}>{sub}</p>}
    </div>
  );
  return href ? <Link href={href} style={{ display: "block" }} aria-label={`${label}: open the audit rows behind this number`}>{body}</Link> : body;
}

export function QueuePosition({ position, total, rule = "registration duration (R4)", tieBreak = "single lottery number (R5)" }: { position: number; total: number; rule?: string; tieBreak?: string }) {
  return (
    <div aria-live="polite" className="card well">
      <span className="label">Your queue position</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "6px 0" }}><span className="mono" style={{ fontSize: 44, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.03em" }}>{position}</span><span className="mono muted" style={{ fontSize: 18 }}>of {total}</span></div>
      <p className="dense">You are number {position} of {total}. Applications are ordered by {rule}, as published in Selection rules v1.2. Nothing about you personally affected this position.</p>
      <p className="faint mono" style={{ fontSize: 11.5, marginTop: 8 }}>tie-break: {tieBreak}</p>
    </div>
  );
}

export function EmptyState({ why, action }: { why: string; action?: ReactNode }) {
  return <div className="card flat" style={{ textAlign: "center", padding: 36 }}><p style={{ maxWidth: "52ch", margin: "0 auto" }}>{why}</p>{action && <div style={{ marginTop: 16 }}>{action}</div>}</div>;
}

export function HBar({ label, value, max, text, alt }: { label: string; value: number; max: number; text?: string; alt?: boolean }) {
  return (
    <div className="hbar">
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={label}>{label}</span>
      <span className="track"><i className={alt ? "alt" : ""} style={{ width: `${Math.min(100, (value / Math.max(1e-9, max)) * 100)}%` }} /></span>
      <span className="mono" style={{ textAlign: "right", color: "var(--ink)" }}>{text ?? value}</span>
    </div>
  );
}

export function SimBadge({ children }: { children?: ReactNode }) {
  return <span className="mock" style={{ letterSpacing: "0.04em" }} title="Synthetic personas — rehearsal for design, not user research">{children ?? "SIMULATED — rehearsal for design, not user research"}</span>;
}
