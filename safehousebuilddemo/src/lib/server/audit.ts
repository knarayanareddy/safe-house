import { createHash } from "node:crypto";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/schema";

export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonicalJson).join(",") + "]";
  const o = v as Record<string, unknown>;
  return "{" + Object.keys(o).sort().map((k) => JSON.stringify(k) + ":" + canonicalJson(o[k])).join(",") + "}";
}
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export interface AuditInput { ts: Date; actor: string; action: string; subject: string; codes: string[]; payload: Record<string, unknown> }
export function hashRow(r: AuditInput, seq: number, prevHash: string) {
  return sha256(canonicalJson({ ts: r.ts.toISOString(), actor: r.actor, action: r.action, subject: r.subject, codes: r.codes, payload: r.payload, seq, prevHash }));
}
export function chain(events: AuditInput[]) {
  let prev = "GENESIS";
  return events.map((e, i) => {
    const seq = i + 1;
    const hash = hashRow(e, seq, prev);
    const row = { seq, ts: e.ts, actor: e.actor, action: e.action, subject: e.subject, codes: e.codes, payload: e.payload, prevHash: prev, hash, origPayload: null as Record<string, unknown> | null };
    prev = hash;
    return row;
  });
}

type Row = typeof auditLog.$inferSelect;
export function verifyChain(rows: Row[]) {
  let prev = "GENESIS";
  let brokenAt: number | null = null;
  let verified = 0;
  for (const r of rows) {
    const ok = r.prevHash === prev && hashRow({ ts: r.ts, actor: r.actor, action: r.action, subject: r.subject, codes: r.codes, payload: r.payload }, r.seq, r.prevHash) === r.hash;
    if (!ok && brokenAt === null) brokenAt = r.seq;
    if (brokenAt === null) verified++;
    prev = r.hash;
  }
  return { total: rows.length, verified, brokenAt };
}

export async function appendAudit(e: { actor: string; action: string; subject: string; codes?: string[]; payload?: Record<string, unknown> }) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(424242)`);
    const [last] = await tx.select().from(auditLog).orderBy(desc(auditLog.seq)).limit(1);
    const input: AuditInput = { ts: new Date(), actor: e.actor, action: e.action, subject: e.subject, codes: e.codes ?? [], payload: e.payload ?? {} };
    const seq = (last?.seq ?? 0) + 1;
    const prevHash = last?.hash ?? "GENESIS";
    const hash = hashRow(input, seq, prevHash);
    await tx.insert(auditLog).values({ seq, ...input, prevHash, hash, origPayload: null });
    return { seq, hash };
  });
}
