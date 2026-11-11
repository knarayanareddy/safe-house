import { PageHeader } from "@/components/ui";
import SwapClient from "./SwapClient";

export default function Swap() {
  return (
    <div>
      <PageHeader
        eyebrow="Going on exchange · art. 7:244 BW"
        title={<>Sublet when you leave. <em className="accent">Swap</em> when you can’t.</>}
        lede="Groningen loses and gains thousands of exchange students every semester, in opposite directions. A sublet needs the owner’s written consent — here it is a hard gate, not a checkbox. And where two (or three) students each want the other’s room, top trading cycles create a match from rooms that already exist."
        meta={<><span>consent <b>required</b></span><span>rent cap <b>≤ head rent</b></span><span>publish floor <b>48 h</b></span></>}
      />
      <SwapClient />
    </div>
  );
}
