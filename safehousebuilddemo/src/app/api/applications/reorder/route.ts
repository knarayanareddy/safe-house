import { NextResponse } from "next/server";
import { appendAudit } from "@/lib/server/audit";
import { ensureSeeded } from "@/lib/server/seed";

export const dynamic = "force-dynamic";

// W8 / T-08: there is no reorder endpoint. The queue is the fairness.
export async function POST() {
  await ensureSeeded();
  await appendAudit({ actor: "system", action: "REORDER_ATTEMPT", subject: "queue", codes: ["APP-SKIP-02"], payload: {} });
  return NextResponse.json({ error: "NOT_IMPLEMENTED", code: "APP-SKIP-02", message: "The queue cannot be reordered by anyone." }, { status: 501 });
}
