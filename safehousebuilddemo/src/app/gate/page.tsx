import { LISTINGS } from "@/lib/listings";
import { addressOf } from "@/lib/domain";
import { PageHeader } from "@/components/ui";
import GateClient from "./GateClient";

export default function GatePage() {
  const fixtures = ["L-1001", "L-1002", "L-1003", "L-1004", "L-1014", "L-1015", "L-1017"].map((id) => {
    const l = LISTINGS.find((x) => x.id === id)!;
    return { id, address: addressOf(l), rent: l.rentEur, poster: l.landlord.name, blurb: l.fixture };
  });
  return (
    <div>
      <PageHeader eyebrow="Landlord · submit a room" title={<>The gate, <em className="accent">made visible</em></>} lede="Submit a room and watch six deterministic checks run. The output is a status for the listing plus reason codes — never a score for a person. A fraudulent listing is refused in seconds, with named codes and a written letter." />
      <GateClient fixtures={fixtures} />
    </div>
  );
}
