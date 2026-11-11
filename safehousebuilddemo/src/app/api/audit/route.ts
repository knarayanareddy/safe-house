import { NextResponse } from "next/server";
import { eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { auditChainStatus } from "@/lib/server/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const { status } = await auditChainStatus();
  return NextResponse.json(status);
}

// Dev-only demo controls: tamper row 7 (the chain turns red) or restore it.
export async function POST(req: Request) {
  const { op } = (await req.json()) as { op?: "tamper" | "reset" };
  if (op === "tamper") {
    await db.execute(sql`update audit_log set orig_payload = coalesce(orig_payload, payload), payload = payload || '{"tampered":true}'::jsonb where seq = 7`);
  } else if (op === "reset") {
    await db.update(auditLog).set({ payload: sql`orig_payload`, origPayload: null }).where(eq(auditLog.seq, 7));
    void isNotNull;
  }
  const { status } = await auditChainStatus();
  return NextResponse.json(status);
}
