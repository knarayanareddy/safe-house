import { PageHeader, SimBadge } from "@/components/ui";
import { countResponses, loadPersonas, loadResponses } from "@/lib/server/data";
import SwarmLab, { type SwarmPersona } from "./SwarmLab";

export const dynamic = "force-dynamic";

export default async function SwarmPage() {
  const [personas, resp, counts] = await Promise.all([loadPersonas(), loadResponses("v2"), countResponses()]);
  const byPersona = new Map(resp.filter((r) => r.personaId).map((r) => [r.personaId!, r.answers]));
  const data: SwarmPersona[] = personas.map((p) => ({ ...p, v2: byPersona.get(p.id) ?? {} }));
  return (
    <div>
      <PageHeader
        eyebrow="Swarm Lab · MiroFish-style simulation"
        title={<>Not one forecast. A <em className="accent">frequency</em> of futures.</>}
        lede="We build a graph from Groningen’s students, landlords, institutions and platforms, fill it with 262 persona agents, let them fill out the survey, argue, form camps and change their minds under pressure — then re-run the world a thousand times. You don’t get a prophecy; you get scenario frequencies."
        meta={<><SimBadge /><span>agents <b>{personas.length}</b></span><span>stored responses <b>{counts.reduce((s, c) => s + c.n, 0)}</b></span></>}
      />
      <SwarmLab personas={data} counts={counts} />
    </div>
  );
}
