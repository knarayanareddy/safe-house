import Link from "next/link";
import { PageHeader } from "@/components/ui";
import SimulateClient from "./SimulateClient";

export default function Simulate() {
  return (
    <div>
      <PageHeader
        eyebrow="Deterministic simulation · seed 20261111"
        title={<>214 applicants become 15 names — <em className="accent">without profiling</em></>}
        lede={<>The scale rehearsal is deterministic and never an LLM, so the numbers are reproducible. The eleven gates are structure, not scoring. Want the agent-based view with personas arguing? Open the <Link href="/swarm" style={{ color: "var(--green)", textDecoration: "underline" }}>Swarm Lab</Link>.</>}
      />
      <SimulateClient />
    </div>
  );
}
