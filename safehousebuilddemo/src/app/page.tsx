import Link from "next/link";
import { CITY_PHOTOS, HOODS, LISTINGS } from "@/lib/listings";
import { Icon } from "@/components/ui";
import { computeMetrics, allAudit } from "@/lib/server/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const m = computeMetrics(await allAudit());
  const published = LISTINGS.filter((l) => l.status === "PUBLISHED");
  const hoods = HOODS.map((h) => ({ ...h, n: published.filter((l) => l.hood === h.name).length })).filter((h) => h.n > 0);
  return (
    <div style={{ paddingTop: 24 }}>
      <section className="hero">
        <img src={CITY_PHOTOS.hero} alt="Bicycles and canal in central Groningen" />
        <div className="veil" />
        <div className="inner">
          <span className="hero-pill">REAL ROOMS. REAL PEOPLE. · GRONINGEN</span>
          <h1 className="title-xl" style={{ maxWidth: 800, marginTop: 14 }}>Student housing in Groningen, <span style={{ color: "var(--lime)" }}>made safe, simple and social.</span></h1>
          <p style={{ maxWidth: 650, marginTop: 14, color: "rgba(246,243,235,0.92)", fontSize: 17 }}>safe-house checks the owner, the address, the photographs and the rent before a room goes live — then orders applicants by a rule we publish in advance. Built for RUG and Hanze students, and for the 30% who arrive from abroad.</p>
          <form action="/discover" className="searchbar" role="search">
            <label className="field"><span className="label">Where</span><input name="q" placeholder="Binnenstad, Helpman, Zernike…" aria-label="Search area or street" /></label>
            <label className="field"><span className="label">Max rent</span>
              <select name="max" defaultValue="" aria-label="Maximum rent"><option value="">Any</option><option value="550">€550</option><option value="650">€650</option><option value="750">€750</option></select></label>
            <label className="field"><span className="label">Near</span>
              <select name="near" defaultValue="" aria-label="Campus"><option value="">Anywhere</option><option value="rug">RUG centre</option><option value="zernike">Zernike</option><option value="hanze">Hanze</option></select></label>
            <button className="btn lime" style={{ minHeight: 48 }}><Icon name="search" size={16} />Search {published.length} rooms</button>
          </form>
        </div>
      </section>

      <section className="grid-4" style={{ marginTop: 28 }}>
        {[
          [String(published.length), "verified rooms live this week"],
          [String(m.refused), "listings refused since September"],
          [(m.refusalRate * 100).toFixed(0) + "%", "of gate decisions were refusals"],
          [(m.rejectionsWithCode * 100).toFixed(0) + "%", "of declines carry a written reason"],
        ].map(([n, t]) => (
          <Link key={t} href="/dashboard" className="card" style={{ display: "block" }}><div className="mono" style={{ fontSize: 34, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>{n}</div><p className="dense muted">{t}</p></Link>
        ))}
      </section>

      <section className="section">
        <header><span className="label">Neighbourhoods</span><h2 className="title-lg" style={{ marginTop: 8 }}>Where Groningen students actually live</h2></header>
        <div className="grid-3">
          {hoods.map((h, i) => (
            <Link key={h.name} href={`/discover?hood=${encodeURIComponent(h.name)}`} className="listing">
              <div className="ph" style={{ aspectRatio: "16 / 9" }}><img src={[CITY_PHOTOS.street, CITY_PHOTOS.market, CITY_PHOTOS.vera, CITY_PHOTOS.hall][i % 4]} alt="" loading="lazy" /></div>
              <div className="body"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><h3 className="title-md">{h.name}</h3><span className="mono faint" style={{ fontSize: 12 }}>{h.n} room{h.n > 1 ? "s" : ""}</span></div><p className="dense muted" style={{ marginTop: 4 }}>{h.blurb}</p><p className="mono faint" style={{ fontSize: 11.5, marginTop: 8 }}>{h.bike}</p></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <header><span className="label">How it works</span><h2 className="title-lg" style={{ marginTop: 8 }}>Five questions this product exists to answer</h2></header>
        <div className="grid-3">
          {[
            ["Can personality testing pick housemates?", "No. Residents choose — but only among people who had an equal, verified, recorded shot.", "/hospiteer"],
            ["How do 200 applicants become 10 without profiling?", "Eleven gates, a published order, a cap of 10 applications. No CVs.", "/simulate"],
            ["What about AI-written applications?", "We do not score what you write. Structure beats filtering.", "/simulate"],
            ["Can I sublet when I go on exchange?", "Yes — with the landlord's consent as a hard gate, plus a swap mechanism.", "/swap"],
            ["How do we prove any of it works?", "A deterministic simulation and a hash-chained log you can tamper with — and watch fail.", "/audit"],
            ["Will Groningen students use it?", "We ran 262 synthetic students through a redesigned survey and a swarm. Watch it.", "/swarm"],
          ].map(([q, a, href], i) => (
            <Link key={q} href={href} className="card" style={{ display: "block" }}>
              <span className="mono faint" style={{ fontSize: 12 }}>Q{i + 1}</span>
              <h3 className="title-md" style={{ margin: "6px 0 8px" }}>{q}</h3>
              <p className="dense muted">{a}</p>
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center", marginTop: 12, color: "var(--green)", fontWeight: 600, fontSize: 13 }}>Open <Icon name="arrow" size={14} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section card" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 24, alignItems: "center", background: "#113d30", borderColor: "#1d5745" }}>
        <div><span className="label" style={{ color: "#cefa00" }}>Swarm Lab · MiroFish-style</span><h2 className="title-lg" style={{ color: "#f6f3eb", marginTop: 8 }}>Watch 262 simulated Groningen students react to the safe-house launch</h2><p style={{ color: "rgba(246,243,235,0.82)", marginTop: 8, maxWidth: "62ch" }}>Personas fill out the survey, argue in two simulated communities, change their minds under pressure — and after 1,000 runs you get scenario frequencies, not a prophecy.</p></div>
        <Link href="/swarm" className="btn lime">Open the swarm</Link>
      </section>
    </div>
  );
}
