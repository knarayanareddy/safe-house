import { NextResponse } from "next/server";
import { CODE_MAP, generateLetter, RULESET_VERSION, addressOf } from "@/lib/domain";
import { getListing } from "@/lib/listings";
import { ensureSeeded } from "@/lib/server/seed";
import { appendAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

// W9 / T-16: a decline without a published reason code is impossible — 422 and no state mutation.
export async function POST(req: Request) {
  await ensureSeeded();
  const b = (await req.json()) as { listingId?: string; applicant?: string; code?: string; position?: number; total?: number };
  if (!b.code || !CODE_MAP[b.code]) {
    return NextResponse.json({ error: "CODE_REQUIRED", message: "A decline must reference a published criterion, so the applicant can see why." }, { status: 422 });
  }
  const listing = b.listingId ? getListing(b.listingId) : undefined;
  const letter = generateLetter([b.code], { address: listing ? addressOf(listing) : "this room", ruleSetVersion: RULESET_VERSION, position: b.position, total: b.total });
  const { seq, hash } = await appendAudit({ actor: "landlord", action: "APP_DECLINED", subject: `${b.applicant}@${b.listingId}`, codes: [b.code], payload: { position: b.position ?? null, total: b.total ?? null } });
  return NextResponse.json({ ok: true, seq, hash, letter });
}
