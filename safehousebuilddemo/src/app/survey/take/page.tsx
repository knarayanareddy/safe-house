import { PageHeader } from "@/components/ui";
import TakeClient from "./TakeClient";

export default function Take() {
  return (
    <div>
      <PageHeader eyebrow="Survey v2 · anonymous · ~6 minutes" title={<>Help us build housing <em className="accent">that works for Groningen</em></>} lede="We’re students building a verified housing platform for Groningen. No account, no email, no ID. Your answers are stored anonymously and flagged as real, separate from the simulated personas." />
      <TakeClient />
    </div>
  );
}
