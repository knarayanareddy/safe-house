import { PageHeader } from "@/components/ui";
import HospiteerClient from "./HospiteerClient";

export default function Hospiteer() {
  return (
    <div>
      <PageHeader
        eyebrow="Housemate selection · lawful by design"
        title={<>Residents choose. Only among people who had an <em className="accent">equal shot</em>.</>}
        lede="Groningen’s hospiteer evenings are a tradition — and a black box. We keep the human choice and make everything around it auditable: a published procedure, an objective pool of 15, identical 20-minute meetings, criterion-linked refusals and a monthly parity report. No personality test is involved, ever."
        meta={<><span>procedure <b>v1.2</b></span><span>pool size <b>15</b></span><span>meeting length <b>20 min</b></span></>}
      />
      <HospiteerClient />
    </div>
  );
}
