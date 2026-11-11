import Link from "next/link";
import { notFound } from "next/navigation";
import { getListing, LISTINGS } from "@/lib/listings";
import { addressOf, ceilingFor, generateLetter, RULESET_VERSION, runGate } from "@/lib/domain";
import { CeilingBreakdown, GateSummary, Icon, MockBadge, StatusPill } from "@/components/ui";
import { RoomPanels } from "./RoomPanels";

export const dynamic = "force-dynamic";

export default async function Room({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const l = getListing(id);
  if (!l) notFound();
  const gate = runGate(l, LISTINGS);
  const c = ceilingFor(l);
  const fails = gate.results.filter((r) => r.verdict === "FAIL").map((r) => r.code!);
  const letter = l.status === "REFUSED" || l.status === "SUSPENDED" ? generateLetter(fails.length ? fails : gate.codes, { address: addressOf(l), ruleSetVersion: RULESET_VERSION }) : l.status === "HOLD" ? generateLetter(gate.codes, { address: addressOf(l), ruleSetVersion: RULESET_VERSION }) : undefined;
  const date = l.publishedAt ? new Date(l.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const facts: [string, string, Parameters<typeof Icon>[0]["name"]][] = [
    ["Size", `${l.sizeM2} m²`, "bed"], ["Energy label", l.energyLabel, "spark"], ["Housemates", l.residents <= 1 ? "Studio — none" : String(l.residents - 1), "users"],
    ["Available from", l.availableFrom, "calendar"], ["Minimum stay", `${l.minMonths} months`, "calendar"], ["Deposit", `€${l.depositEur} (cap 2× rent)`, "euro"],
  ];
  return (
    <div style={{ paddingTop: 28 }}>
      <p className="dense muted"><Link href="/discover" style={{ color: "var(--green)" }}>← All rooms</Link> · {l.hood}, Groningen</p>
      <div className="two-pane" style={{ marginTop: 14 }}>
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gridTemplateRows: "1fr 1fr", gap: 8, aspectRatio: "16 / 9", borderRadius: 16, overflow: "hidden", border: "1px solid var(--line)" }}>
            <img src={l.photos[0].url} alt={`Room at ${l.street} ${l.number}`} style={{ gridRow: "1 / 3", width: "100%", height: "100%", objectFit: "cover" }} />
            <img src={l.photos[1].url} alt="Shared kitchen" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <img src={l.photos[2].url} alt="Room, second angle" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <p className="faint mono" style={{ fontSize: 11, marginTop: 6 }}>Photographs are illustrative stock images in this demo. In production each is fingerprinted (sha256 + dHash) and never classified.</p>

          <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "24px 0 6px", flexWrap: "wrap" }}><StatusPill status={l.status} /><MockBadge issuer="kadaster:mock" /></div>
          <h1 className="title-xl" style={{ fontSize: "clamp(26px,3vw,38px)" }}>{l.street} {l.number}</h1>
          <p className="muted" style={{ marginTop: 4 }}>{l.postcode} {l.city} · {l.hood} · <span className="mono">{l.bike.rugCentre}′</span> by bike to the city centre, <span className="mono">{l.bike.zernike}′</span> to Zernike, <span className="mono">{l.bike.hanze}′</span> to Hanze</p>

          <div className="grid-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", marginTop: 24 }}>
            {facts.map(([k, v, ic]) => <div key={k} className="card flat" style={{ padding: 14 }}><span style={{ color: "var(--green)" }}><Icon name={ic} size={16} /></span><div className="label" style={{ marginTop: 6 }}>{k}</div><div className="mono" style={{ color: "var(--ink)", fontWeight: 600, marginTop: 2 }}>{v}</div></div>)}
          </div>

          <section className="section" style={{ marginTop: 32 }}>
            <h2 className="title-lg">About the room</h2>
            <p style={{ marginTop: 10, maxWidth: "70ch" }}>{l.description}</p>
            <dl className="kv" style={{ marginTop: 16, maxWidth: 460 }}>
              <dt>Shared</dt><dd>{l.shared.length ? l.shared.join(", ") : "nothing — self-contained"}</dd>
              <dt>Facilities</dt><dd>{l.facilities.map((f) => f.replace("_", " ")).join(", ")}</dd>
              <dt>Bills</dt><dd>{l.billsIncluded ? "included" : "not included"}</dd>
              <dt>Landlord</dt><dd>{l.landlord.type === "PRIVATE_OWNER" ? "private owner" : l.landlord.type === "AGENT" ? "agent under mandate" : "professional (KvK)"}</dd>
              <dt>Typical reply time</dt><dd>{l.landlord.responseHours} h</dd>
            </dl>
          </section>

          {l.residentsList.length > 0 && (
            <section className="section" style={{ marginTop: 32 }}>
              <h2 className="title-lg">The house</h2>
              <p className="dense muted" style={{ marginTop: 6 }}>A house profile describes the home, not the people you want in it (PROF-LINT-01).</p>
              <div className="grid-2" style={{ marginTop: 14 }}>
                <div className="card flat"><span className="label">Housemates</span><ul style={{ margin: "8px 0 0", paddingLeft: 18 }} className="dense">{l.residentsList.map((r) => <li key={r}>{r}</li>)}</ul></div>
                <div className="card flat"><span className="label">Declared house habits</span><dl className="kv" style={{ marginTop: 8 }}><dt>Sleep rhythm</dt><dd>{l.house.sleepRhythm}</dd><dt>Cleanliness</dt><dd>{l.house.cleanliness}</dd><dt>Guests</dt><dd>{l.house.guests}</dd><dt>Smoking</dt><dd>{l.house.smoking}</dd><dt>Languages at home</dt><dd>{l.house.languages.join(", ")}</dd></dl></div>
              </div>
            </section>
          )}

          <RoomPanels listing={{ id: l.id, status: l.status, address: addressOf(l), house: l.house, rentEur: l.rentEur, minMonths: l.minMonths }} />
        </div>

        <aside className="sticky" style={{ display: "grid", gap: 20 }}>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span className="price" style={{ fontSize: 28 }}>€{l.rentEur}<span className="faint" style={{ fontSize: 14, fontWeight: 500 }}> / month</span></span><StatusPill status={l.status} /></div>
            {l.status === "PUBLISHED" && <p className="dense" style={{ marginTop: 10 }}><span className="tick">✓</span>Six checks passed · owner matched {date} · photos unique · rent €{l.rentEur} against a legal maximum of about €{Math.round(c.ceiling)} for {c.points} points</p>}
            {l.status === "HOLD" && <div className="banner warn" style={{ marginTop: 12 }}><div><b style={{ color: "var(--ink)" }}>! Held for review.</b> A named human reviewer sees this within 24 hours, with the reason recorded. Next: they check the mandate or provenance and publish — or refuse with a written reason. You can’t apply until then.</div></div>}
            {l.status === "REFUSED" && <div className="banner fail" style={{ marginTop: 12 }}><div><b style={{ color: "var(--ink)" }}>✗ Refused.</b> This listing never went live. The poster received the letter below and can appeal with new evidence.</div></div>}
            {l.status === "SUSPENDED" && <div className="banner fail" style={{ marginTop: 12 }}><div><b style={{ color: "var(--ink)" }}>✗ Account suspended.</b> Trader registration lapsed (DSA Art. 30). Applying is not possible.</div></div>}
            {l.status === "LET" && <div className="banner" style={{ marginTop: 12 }}><div><b style={{ color: "var(--ink)" }}>● Let.</b> Chosen by the residents from 8 met applicants. The record is in the audit log.</div></div>}
          </div>
          <div className="card">
            <span className="label">What we checked</span>
            <div style={{ marginTop: 8 }}><GateSummary gate={gate} letter={letter} address={addressOf(l)} /></div>
            <Link href="/gate" className="btn sm" style={{ marginTop: 14 }}>Run the gate yourself</Link>
          </div>
          <div className="card">
            <span className="label">Rent against the legal maximum</span>
            <div style={{ marginTop: 10 }}><CeilingBreakdown rows={c.rows} points={c.points} ceiling={c.ceiling} rent={l.rentEur} /></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
