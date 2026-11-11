import { LISTINGS, HOODS } from "@/lib/listings";
import { ceilingFor, runGate, addressOf } from "@/lib/domain";
import { PageHeader } from "@/components/ui";
import DiscoverClient, { type CardData } from "./DiscoverClient";

export const dynamic = "force-dynamic";

export default async function Discover({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const cards: CardData[] = LISTINGS.map((l) => {
    const c = ceilingFor(l);
    const g = runGate(l, LISTINGS);
    return {
      id: l.id, address: addressOf(l), street: `${l.street} ${l.number}`, hood: l.hood, rent: l.rentEur, size: l.sizeM2, label: l.energyLabel, residents: l.residents, status: l.status,
      photo: l.photos[0].url, ceiling: Math.round(c.ceiling), points: c.points, over: c.over, publishedAt: l.publishedAt ?? null, bike: l.bike, codes: g.codes, gate: g.status,
      owner: l.landlord.type, availableFrom: l.availableFrom, minMonths: l.minMonths, bills: l.billsIncluded,
    };
  });
  const published = cards.filter((c) => c.status === "PUBLISHED");
  const med = published.map((c) => c.rent - c.ceiling).sort((a, b) => a - b)[Math.floor(published.length / 2)];
  return (
    <div>
      <PageHeader
        eyebrow={`${published.length} verified rooms in Groningen`}
        title={<>Rooms we can prove <em className="accent">someone owns</em></>}
        lede="Every room below passed six checks before it appeared: identity, ownership, photo integrity, address, rent disclosure and trader registration. Nothing here is ranked for you."
        meta={<><span>verified this week <b>{published.filter((c) => c.publishedAt && c.publishedAt >= "2026-11-08").length}</b></span><span>median rent vs ceiling <b>{med < 0 ? "−" : "+"}€{Math.abs(Math.round(med))}</b></span><span>refused since September <b>see Dashboard</b></span></>}
      />
      <DiscoverClient cards={cards} hoods={HOODS.map((h) => h.name)} initial={{ q: sp.q ?? "", max: sp.max ? Number(sp.max) : 900, hood: sp.hood ?? "", near: sp.near ?? "" }} />
    </div>
  );
}
