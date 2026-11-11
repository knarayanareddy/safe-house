"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, Icon, MockBadge, StatusPill } from "@/components/ui";
import type { ListingStatus } from "@/lib/domain";

export interface CardData {
  id: string; address: string; street: string; hood: string; rent: number; size: number; label: string; residents: number; status: ListingStatus; photo: string;
  ceiling: number; points: number; over: boolean; publishedAt: string | null; bike: { rugCentre: number; zernike: number; hanze: number }; codes: string[]; gate: string;
  owner: string; availableFrom: string; minMonths: number; bills: boolean;
}

// The sort keys live in ONE object: the panel renders from it and the comparator is composed from it, so they cannot disagree.
type Key = { label: string; cmp: (a: CardData, b: CardData) => number };
const K: Record<string, Key> = {
  verified: { label: "Most recently verified first", cmp: (a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") },
  rent: { label: "Asking rent, lowest first", cmp: (a, b) => a.rent - b.rent },
  headroom: { label: "Asking rent furthest under the legal maximum", cmp: (a, b) => (a.rent - a.ceiling) - (b.rent - b.ceiling) },
  rug: { label: "Bike minutes to the RUG city centre", cmp: (a, b) => a.bike.rugCentre - b.bike.rugCentre },
  zernike: { label: "Bike minutes to Zernike campus", cmp: (a, b) => a.bike.zernike - b.bike.zernike },
  size: { label: "Room size, largest first", cmp: (a, b) => b.size - a.size },
  id: { label: "Listing id (stable tie-break)", cmp: (a, b) => a.id.localeCompare(b.id) },
};
const SORTS: Record<string, { label: string; keys: Key[] }> = {
  verified: { label: "Recently verified", keys: [K.verified, K.id] },
  rent: { label: "Rent, low to high", keys: [K.rent, K.headroom, K.id] },
  headroom: { label: "Furthest under the ceiling", keys: [K.headroom, K.rent, K.id] },
  rug: { label: "Closest to the centre", keys: [K.rug, K.rent, K.id] },
  zernike: { label: "Closest to Zernike", keys: [K.zernike, K.rent, K.id] },
  size: { label: "Largest rooms", keys: [K.size, K.rent, K.id] },
};
const compose = (keys: Key[]) => (a: CardData, b: CardData) => { for (const k of keys) { const d = k.cmp(a, b); if (d) return d; } return 0; };

export default function DiscoverClient({ cards, hoods, initial }: { cards: CardData[]; hoods: string[]; initial: { q: string; max: number; hood: string; near: string } }) {
  const [q, setQ] = useState(initial.q);
  const [max, setMax] = useState(initial.max || 900);
  const [hood, setHood] = useState(initial.hood);
  const [minSize, setMinSize] = useState(0);
  const [all, setAll] = useState(false);
  const [sort, setSort] = useState(initial.near === "zernike" ? "zernike" : initial.near === "rug" ? "rug" : "verified");
  const [loadedHint] = useState(false);
  void loadedHint;

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return cards
      .filter((c) => (all ? true : c.status === "PUBLISHED"))
      .filter((c) => c.rent <= max && c.size >= minSize && (!hood || c.hood === hood) && (!ql || (c.address + " " + c.hood).toLowerCase().includes(ql)))
      .sort(compose(SORTS[sort].keys));
  }, [cards, q, max, hood, minSize, all, sort]);
  const nearMiss = useMemo(() => cards.filter((c) => c.status === "PUBLISHED" && c.rent > max && c.size >= minSize).length, [cards, max, minSize]);
  const unlisted = cards.filter((c) => c.status !== "PUBLISHED" && c.status !== "LET").length;

  return (
    <div className="three-pane">
      <aside className="sticky card" aria-label="Filters" style={{ display: "grid", gap: 18 }}>
        <label className="field"><span className="label">Search</span><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Street or area" /></label>
        <label className="field"><span className="label">Max rent · <span className="mono">€{max}</span></span><input type="range" min={450} max={900} step={10} value={max} onChange={(e) => setMax(Number(e.target.value))} aria-label="Maximum rent" /></label>
        <label className="field"><span className="label">Min size · <span className="mono">{minSize || "any"}{minSize ? " m²" : ""}</span></span><input type="range" min={0} max={22} step={2} value={minSize} onChange={(e) => setMinSize(Number(e.target.value))} aria-label="Minimum size" /></label>
        <label className="field"><span className="label">Neighbourhood</span><select className="select" value={hood} onChange={(e) => setHood(e.target.value)}><option value="">All</option>{hoods.map((h) => <option key={h}>{h}</option>)}</select></label>
        <label className="field"><span className="label">Sort</span><select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>{Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select></label>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5 }}><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} style={{ marginTop: 4, width: 18, height: 18 }} /><span>Show rooms we held or refused <span className="faint">({unlisted})</span><br /><span className="faint" style={{ fontSize: 12 }}>Transparency: refusals are part of the product.</span></span></label>
      </aside>

      <section aria-live="polite" aria-label="Results">
        <p className="dense muted" style={{ marginBottom: 14 }}><span className="mono" style={{ color: "var(--ink)" }}>{list.length}</span> room{list.length === 1 ? "" : "s"} · sorted by <em>{SORTS[sort].label.toLowerCase()}</em></p>
        {list.length === 0 ? (
          <EmptyState why={`No rooms match — ${nearMiss} verified room${nearMiss === 1 ? " is" : "s are"} listed above €${max}. For a typical 14 m² room in these postcodes the indicative legal maximum is about €${Math.round(cards.find((c) => c.size === 14)?.ceiling ?? 640)}.`} action={<button className="btn" onClick={() => { setMax(900); setMinSize(0); setHood(""); setQ(""); }}>Clear filters</button>} />
        ) : (
          <div className="grid-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {list.map((c) => {
              const diff = c.rent - c.ceiling;
              const live = c.status === "PUBLISHED" || c.status === "LET";
              return (
                <Link key={c.id} href={`/room/${c.id}`} className="listing">
                  <div className="ph">
                    <img src={c.photo} alt={`Room at ${c.street}`} loading="lazy" />
                    <span className="tl"><StatusPill status={c.status} /></span>
                    <span className="br"><MockBadge issuer="kadaster:mock" /></span>
                  </div>
                  <div className="body">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}><h3 className="title-md" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.street}</h3><span className="price">€{c.rent}<span className="faint" style={{ fontSize: 12, fontWeight: 500 }}> / mo</span></span></div>
                    <p className="dense muted" style={{ marginTop: 2 }}>{c.hood} · <span className="mono">{c.size} m²</span> · label {c.label} · {c.residents === 1 ? "studio" : `${c.residents} housemates`}</p>
                    <p className="dense" style={{ marginTop: 8, color: diff > 0 ? "var(--warn)" : "var(--ink-2)" }}><span className="mono">{diff > 0 ? "! " : "✓ "}€{Math.abs(Math.round(diff))} {diff > 0 ? "over" : "under"}</span> the indicative maximum (€{c.ceiling}, {c.points} pts)</p>
                    <div className="trust">
                      {live ? (<><span><span className="tick">✓</span>owner matched {c.publishedAt ? new Date(c.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "12 Nov"}</span><span><span className="tick">✓</span>photos unique · address registered</span></>) : c.status === "HOLD" ? (<span><span className="bang">!</span>held for human review · {c.codes.join(", ")}</span>) : (<span><span className="cross">✗</span>refused · {c.codes.join(", ")}</span>)}
                    </div>
                    <p className="mono faint" style={{ fontSize: 11.5, marginTop: 10, display: "flex", gap: 14 }}><span title="to RUG city centre"><Icon name="bike" size={12} /> {c.bike.rugCentre}′ centre</span><span>{c.bike.zernike}′ Zernike</span></p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <aside className="sticky card well" aria-label="Why this order">
        <span className="label">Why this order</span>
        <p className="dense" style={{ margin: "10px 0" }}>These are the only sort keys in use, read from the same object as the sort function:</p>
        <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }} className="dense">{SORTS[sort].keys.map((k) => <li key={k.label}>{k.label}</li>)}</ol>
        <p className="dense muted" style={{ marginTop: 14 }}>There is no “recommended for you”, no personalisation and no promoted listing. The order is the same for everyone.</p>
      </aside>
    </div>
  );
}
