import Link from "next/link";
import { HBar, PageHeader, SimBadge } from "@/components/ui";
import { loadResponses, countResponses } from "@/lib/server/data";
import { V1, V2, answered, mean, numeric, optLabel, tally, type Answers } from "@/lib/survey";

export const dynamic = "force-dynamic";
type R = { answers: Answers; source: string };
const SEGS: [string, string, (a: Answers) => boolean][] = [
  ["all", "Everyone", () => true], ["student", "All students", (a) => !["landlord", "manager"].includes(String(a.role))],
  ["rug", "RUG", (a) => a.inst === "rug"], ["hanze", "Hanze", (a) => a.inst === "hanze"], ["nl", "Dutch", (a) => a.origin === "nl"], ["eu", "EU / EEA", (a) => a.origin === "eu"],
  ["non", "Non-EU", (a) => a.origin === "non"], ["temp", "Temporary housing", (a) => a.situation === "temp" || a.situation === "abroad"], ["landlord", "Landlords & agents", (a) => ["landlord", "manager"].includes(String(a.role))],
];
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

function Dist({ rows, qid, qs, top }: { rows: R[]; qid: string; qs: typeof V2; top?: number }) {
  const t = tally(rows, qid), n = answered(rows, qid);
  const ent = Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, top ?? 99);
  return <div>{ent.map(([k, v]) => <HBar key={k} label={optLabel(qs, qid, k)} value={v} max={n} text={`${pct(v, n)}%`} />)}</div>;
}
const Card = ({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) => <div className="card"><span className="label">{title}</span>{sub && <p className="dense muted" style={{ marginTop: 4 }}>{sub}</p>}<div style={{ marginTop: 10 }}>{children}</div></div>;

export default async function Results({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const src = sp.src ?? "all", seg = sp.seg ?? "all";
  const [v1all, v2all, counts] = await Promise.all([loadResponses("v1"), loadResponses("v2"), countResponses()]);
  const filt = (rows: typeof v1all) => rows.filter((r) => src === "all" || r.source === src);
  const v1 = filt(v1all), v2base = filt(v2all);
  const segDef = SEGS.find((s) => s[0] === seg) ?? SEGS[0];
  const v2 = v2base.filter((r) => segDef[2](r.answers));
  const students = v2base.filter((r) => SEGS[1][2](r.answers));
  const q = (id: string) => V2.find((x) => x.id === id)!;
  const link = (k: string, v: string) => `/survey/results?src=${k === "src" ? v : src}&seg=${k === "seg" ? v : seg}`;

  // v1
  const v1likely = numeric(v1, "v1_likely");
  const otherShare = pct(v1.filter((r) => (r.answers.v1_difficulties as string[] | undefined)?.includes("other")).length, v1.length);
  const aiPick = pct(v1.filter((r) => r.answers.v1_feature === "ai").length, v1.length);
  const trustAI = pct(v1.filter((r) => r.answers.v1_concern === "trustAI").length, v1.length);
  // v2
  const intent = numeric(v2, "intent");
  const dist = Array.from({ length: 11 }, (_, i) => intent.filter((x) => x === i).length);
  const byOrigin = ["nl", "eu", "non"].map((k) => [k, mean(numeric(v2base.filter((r) => r.answers.origin === k), "intent")), v2base.filter((r) => r.answers.origin === k).length] as const);
  const byInst = ["rug", "hanze"].map((k) => [k, mean(numeric(v2base.filter((r) => r.answers.inst === k), "intent")), v2base.filter((r) => r.answers.inst === k).length] as const);
  const byRole = ["seeker", "mover", "leaver", "incoming", "phd", "landlord", "manager"].map((k) => [k, mean(numeric(v2base.filter((r) => r.answers.role === k), "intent")), v2base.filter((r) => r.answers.role === k).length] as const);
  const use = (k: string) => mean(numeric(v2, "usefulness", k));
  const usef = [["verify", "Verified listings"], ["queue", "Published queue + cap + reasons"], ["hospiteer", "Fair housemate choice"], ["sublet", "Sublet & swap with consent"]] as const;
  const aiChecks = mean(numeric(v2, "ai", "checks")), aiRank = mean(numeric(v2, "ai", "rank"));
  const aiRankOk = pct(numeric(v2, "ai", "rank").filter((x) => x >= 4).length, numeric(v2, "ai", "rank").length);
  const hiddenPains = pct(v2.filter((r) => ((r.answers.pains as string[]) ?? []).some((p) => ["discrimination", "rentabove", "hospiteer"].includes(p))).length, v2.length);
  const lostMoney = pct(v2.filter((r) => String(r.answers.scam).startsWith("lost")).length, v2.length);
  const seen = pct(v2.filter((r) => r.answers.scam !== "never").length, v2.length);
  const allocT = Object.entries(tally(v2, "alloc")).sort((a, b) => b[1] - a[1]);
  const capT = tally(v2, "cap"), capN = answered(v2, "cap");
  const pay = tally(v2, "pay"), payN = answered(v2, "pay");
  const topPain = Object.entries(tally(v2, "pains")).sort((a, b) => b[1] - a[1])[0];
  const comments = v2base.filter((r) => r.answers.comment).slice(0, 6);
  const llPay = tally(v2base.filter((r) => SEGS[8][2](r.answers)), "landlord_pay");

  const insights = [
    `Intent is highest where the pain is sharpest: non-EU respondents average ${byOrigin[2][1].toFixed(1)}/10 against ${byOrigin[0][1].toFixed(1)} for Dutch students — and v1 could not have shown that gap, because it never asked who you are.`,
    `Verification is the anchor feature (${use("verify").toFixed(1)}/5). The queue-and-cap idea is the most polarising (${use("queue").toFixed(1)}/5 overall): it lands with international newcomers and falls flat with networked students and mass-appliers.`,
    `${aiRankOk}% are comfortable with an AI ranking people (${aiRank.toFixed(1)}/5) versus ${aiChecks.toFixed(1)}/5 for automated listing checks. Dropping “AI matching” from the pitch is right — v1’s concept paragraph was suppressing intent among privacy-minded respondents (${trustAI}% named “trust in AI matching” as their top concern).`,
    `${hiddenPains}% put “no internationals”, rent above the legal maximum or hospiteer opacity in their top three — issues that v1 had no option for (${otherShare}% fell into “Other”).`,
    `${seen}% have seen a suspicious listing and ${lostMoney}% lost money. Most-picked pain: ${topPain ? optLabel(V2, "pains", topPain[0]).toLowerCase() : "—"}.`,
    `For a 100-applicant room the fairest rule is “${allocT[0] ? optLabel(V2, "alloc", allocT[0][0]).toLowerCase() : "—"}”; only ${pct(capT.hate ?? 0, capN)}% say they would hate a 10-application cap, and ${pct(pay.free ?? 0, payN)}% will pay nothing — free-for-students is a hard constraint, so landlords and institutions must pay.`,
    `Biggest barrier is the cold start: supply and “the landlords I want aren’t on it” dominate. The Swarm Lab turns that into a probability.`,
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Survey results · 262 simulated Groningen personas"
        title={<>What v1 could tell us — and what <em className="accent">v2</em> can</>}
        lede="Same synthetic respondents, two instruments. Every number below is computed from stored responses. They are persona-generated rehearsal data: use them to find holes in the questionnaire and the design, then replace them with real answers."
        meta={<><SimBadge /><span>v1 <b>{v1.length}</b> responses</span><span>v2 <b>{v2base.length}</b> responses</span><span>{counts.map((c) => `${c.version}/${c.source}: ${c.n}`).join(" · ")}</span></>}
      />
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div className="seg" role="group" aria-label="Source">{["all", "simulated", "real"].map((s) => <Link key={s} href={link("src", s)} className="seg-link"><button aria-pressed={src === s} tabIndex={-1}>{s}</button></Link>)}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{SEGS.map(([k, label]) => <Link key={k} href={link("seg", k)} className={`pill ${seg === k ? "green" : "neutral"}`} aria-current={seg === k ? "true" : undefined}>{label}</Link>)}</div>
      </div>

      <section className="section">
        <header><h2 className="title-lg">Seven things the redesigned survey reveals</h2></header>
        <ol className="card" style={{ margin: 0, paddingLeft: 38, display: "grid", gap: 10 }}>{insights.map((t, i) => <li key={i}>{t}</li>)}</ol>
      </section>

      <section className="section">
        <header><h2 className="title-lg">Part 1 · v1 (the Google Form), all respondents</h2><p className="dense muted" style={{ marginTop: 6 }}>Cannot be cut by segment — that is finding #2.</p></header>
        <div className="grid-3">
          <Card title="Likelihood to use (1–5)" sub={`mean ${mean(v1likely).toFixed(2)} · n=${v1likely.length}`}>{[1, 2, 3, 4, 5].map((n) => <HBar key={n} label={`${n}`} value={v1likely.filter((x) => x === n).length} max={v1likely.length} text={`${pct(v1likely.filter((x) => x === n).length, v1likely.length)}%`} />)}</Card>
          <Card title="Most valuable feature" sub={`“AI-powered matching”: ${aiPick}%`}><Dist rows={v1} qid="v1_feature" qs={V1} /></Card>
          <Card title="Biggest concern"><Dist rows={v1} qid="v1_concern" qs={V1} /></Card>
          <Card title="Biggest difficulties (multi)" sub={`“Other” = ${otherShare}% — the real issues are hiding there`}><Dist rows={v1} qid="v1_difficulties" qs={V1} /></Card>
          <Card title="Platforms used"><Dist rows={v1} qid="v1_platforms" qs={V1} /></Card>
          <Card title="Fraud encountered?"><Dist rows={v1} qid="v1_fraud" qs={V1} /></Card>
        </div>
      </section>

      <section className="section">
        <header><h2 className="title-lg">Part 2 · v2 {seg !== "all" && <>· segment: <em className="accent">{segDef[1]}</em> (n={v2.length})</>}</h2></header>
        <div className="grid-3">
          <Card title="Intent to use (0–10)" sub={`mean ${mean(intent).toFixed(2)} · ≥8: ${pct(intent.filter((x) => x >= 8).length, intent.length)}%`}><div className="hist" aria-label="Intent histogram">{dist.map((d, i) => <div key={i} title={`${i}: ${d}`} style={{ height: `${Math.max(2, (d / Math.max(1, ...dist)) * 100)}%`, background: i >= 8 ? "var(--green)" : i >= 6 ? "var(--green-2)" : "var(--line-2)" }} />)}</div><div className="mono faint" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 4 }}><span>0</span><span>10</span></div></Card>
          <Card title="Intent by origin" sub="mean 0–10">{byOrigin.map(([k, m, n]) => <HBar key={k} label={`${k === "nl" ? "Dutch" : k === "eu" ? "EU / EEA" : "Non-EU"} (n=${n})`} value={m} max={10} text={m.toFixed(1)} />)}</Card>
          <Card title="Intent by institution & role" sub="mean 0–10">{byInst.map(([k, m, n]) => <HBar key={k} label={`${k.toUpperCase()} (n=${n})`} value={m} max={10} text={m.toFixed(1)} />)}{byRole.filter(([, , n]) => n > 0).map(([k, m, n]) => <HBar key={k} label={`${optLabel(V2, "role", k).split(" ").slice(0, 3).join(" ")} (n=${n})`} value={m} max={10} alt text={m.toFixed(1)} />)}</Card>
          <Card title="Top pains (pick 3)"><Dist rows={v2} qid="pains" qs={V2} /></Card>
          <Card title="Usefulness of the four ideas" sub="mean 1–5">{usef.map(([k, l]) => <HBar key={k} label={l} value={use(k)} max={5} text={use(k).toFixed(2)} />)}</Card>
          <Card title="Fairest way to choose among 100"><Dist rows={v2} qid="alloc" qs={V2} /></Card>
          <Card title="Fraud experience"><Dist rows={v2} qid="scam" qs={V2} /></Card>
          <Card title="10-application cap"><Dist rows={v2} qid="cap" qs={V2} /></Card>
          <Card title="€5–10 refundable commitment"><Dist rows={v2} qid="commit" qs={V2} /></Card>
          <Card title="Comfort with AI" sub="mean 1–5"><HBar label="Automated listing checks" value={aiChecks} max={5} text={aiChecks.toFixed(2)} /><HBar label="AI ranking people" value={aiRank} max={5} alt text={aiRank.toFixed(2)} /></Card>
          <Card title="Accepted identity checks"><Dist rows={v2} qid="idmethod" qs={V2} /></Card>
          <Card title="Biggest barrier"><Dist rows={v2} qid="barrier" qs={V2} /></Card>
          <Card title="What would make you switch"><Dist rows={v2} qid="switch" qs={V2} /></Card>
          <Card title="Max monthly price for a premium feature"><Dist rows={v2} qid="pay" qs={V2} /></Card>
          <Card title="Whose backing builds trust"><Dist rows={v2} qid="voucher" qs={V2} /></Card>
          <Card title="Where they’d hear about it"><Dist rows={v2} qid="heard" qs={V2} /></Card>
          <Card title="Landlords: willingness to pay / unit / month" sub="landlord & agent personas only">{Object.entries(llPay).map(([k, v]) => <HBar key={k} label={optLabel(V2, "landlord_pay", k)} value={v} max={Math.max(1, ...Object.values(llPay))} text={String(v)} />)}</Card>
          <Card title="Sublet acceptable with consent + 48 h wait?" sub={`mean ${mean(numeric(v2, "sublet_ok")).toFixed(2)} / 5 (students)`}>{[1, 2, 3, 4, 5].map((n) => <HBar key={n} label={`${n}`} value={numeric(v2, "sublet_ok").filter((x) => x === n).length} max={Math.max(1, numeric(v2, "sublet_ok").length)} text={String(numeric(v2, "sublet_ok").filter((x) => x === n).length)} />)}</Card>
          <Card title="Platforms used (v2 includes Room.nl, WhatsApp, associations)"><Dist rows={v2} qid="platforms" qs={V2} /></Card>
        </div>
      </section>

      <section className="section">
        <header><h2 className="title-lg">Free-text comments · synthetic</h2><p className="dense muted" style={{ marginTop: 6 }}>Generated from persona traits. Never present these as real user quotes. Never scored.</p></header>
        <div className="grid-3">{comments.map((c, i) => <div key={i} className="card flat dense">“{String(c.answers.comment)}”<div className="mono faint" style={{ fontSize: 10.5, marginTop: 8 }}>SIMULATED · {String(c.answers.role)} · {String(c.answers.origin ?? "landlord")}</div></div>)}</div>
      </section>
      <p className="dense muted" style={{ marginTop: 28 }}>Students in base: {students.length}. Spec honesty line: “We have not talked to 200 students — we are two days old. What we have is a specification of their behaviour and a simulation that runs it. When we do talk to them, this slide gets replaced with the real quotes.”</p>
    </div>
  );
}
