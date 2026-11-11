import { NextResponse } from "next/server";
import { addressOf, generateLetter, RULESET_VERSION, runGate } from "@/lib/domain";
import { LISTINGS } from "@/lib/listings";
import { ensureSeeded } from "@/lib/server/seed";
import { appendAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await ensureSeeded();
  const b = (await req.json()) as { listingId?: string; rentEur?: number };
  const base = LISTINGS.find((l) => l.id === b.listingId);
  if (!base) return NextResponse.json({ error: "UNKNOWN_LISTING" }, { status: 404 });
  const l = { ...base, rentEur: typeof b.rentEur === "number" && b.rentEur > 0 ? Math.round(b.rentEur) : base.rentEur };
  const t0 = Date.now();
  const gate = runGate(l, LISTINGS);
  const failing = gate.results.filter((r) => r.verdict === "FAIL").map((r) => r.code!);
  const letter = gate.status === "PUBLISH" ? undefined : generateLetter(gate.status === "REFUSE" ? failing : gate.codes, { address: addressOf(l), ruleSetVersion: RULESET_VERSION });
  const subject = `${l.id}#run${Date.now().toString(36)}`;
  await appendAudit({ actor: l.landlord.type === "AGENT" ? "agent" : "landlord", action: "LISTING_SUBMITTED", subject, payload: { fixture: l.fixture } });
  const { seq } = await appendAudit({ actor: "system", action: "GATE_DECISION", subject, codes: gate.codes, payload: { status: gate.status, badge: gate.status === "PUBLISH", checks: 6, ms: gate.totalMs, ...(gate.status === "REFUSE" ? { refuseCodes: failing } : {}) } });
  if (gate.status !== "PUBLISH") await appendAudit({ actor: "ops", action: "REVIEW_ASSIGNED", subject, codes: gate.status === "REFUSE" ? failing : gate.codes, payload: { slaHours: 24, reviewer: "R-2" } });
  if (gate.status === "REFUSE") await appendAudit({ actor: "system", action: "LETTER_SENT", subject, codes: failing, payload: { channel: "email" } });
  return NextResponse.json({ gate, letter, seq, elapsedMs: Date.now() - t0, listing: { id: l.id, address: addressOf(l), rentEur: l.rentEur } });
}
