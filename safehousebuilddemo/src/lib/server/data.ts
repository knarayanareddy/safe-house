import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, personas, surveyResponses } from "@/db/schema";
import type { Persona } from "@/lib/personas";
import type { Answers } from "@/lib/survey";
import { median } from "@/lib/algorithms";
import { ensureSeeded } from "./seed";
import { verifyChain } from "./audit";

export async function allAudit() {
  await ensureSeeded();
  return db.select().from(auditLog).orderBy(asc(auditLog.seq));
}
export async function auditChainStatus() {
  const rows = await allAudit();
  return { rows, status: verifyChain(rows) };
}
export async function loadPersonas(): Promise<Persona[]> {
  await ensureSeeded();
  const rows = await db.select().from(personas).orderBy(asc(personas.id));
  return rows.map((r) => r.data as unknown as Persona);
}
export async function loadResponses(version?: string) {
  await ensureSeeded();
  const q = db.select().from(surveyResponses);
  const rows = version ? await q.where(eq(surveyResponses.version, version)).orderBy(asc(surveyResponses.id)) : await q.orderBy(asc(surveyResponses.id));
  return rows.map((r) => ({ id: r.id, personaId: r.personaId, source: r.source, version: r.version, answers: r.answers as Answers, createdAt: r.createdAt }));
}
export async function countResponses() {
  await ensureSeeded();
  const rows = (await db.execute(sql`select version, source, count(*)::int as n from survey_responses group by 1,2 order by 1,2`)).rows as { version: string; source: string; n: number }[];
  return rows;
}
export async function recentAudit(limit = 8) {
  await ensureSeeded();
  return db.select().from(auditLog).orderBy(desc(auditLog.seq)).limit(limit);
}

/* Metrics derived from the audit log only (spec §13) */
export interface Metrics {
  decisions: number; refused: number; published: number; held: number; refusalRate: number; overrides: number; overrideRate: number; coverage: number;
  byCode: { code: string; n: number }[]; medianReviewMin: number; medianTimeToOfferH: number; escalationsPer100: number; rejectionsWithCode: number;
  offplatformPer100: number; depositsThroughPartner: number; apps: number; capBlocked: number; lintBlocks: number; subletBlocked: number; rows: number;
  weekly: { week: string; refused: number; published: number }[];
}
export function computeMetrics(rows: typeof auditLog.$inferSelect[]): Metrics {
  const gate = rows.filter((r) => r.action === "GATE_DECISION");
  const status = (r: (typeof rows)[number]) => (r.payload as { status?: string }).status;
  const refused = gate.filter((r) => status(r) === "REFUSE");
  const published = gate.filter((r) => status(r) === "PUBLISH");
  const held = gate.filter((r) => status(r) === "HOLD");
  const overrides = rows.filter((r) => r.action === "REVIEW_OVERRIDE").length;
  const byCodeMap = new Map<string, number>();
  refused.forEach((r) => ((r.payload as { refuseCodes?: string[] }).refuseCodes ?? r.codes).forEach((c) => byCodeMap.set(c, (byCodeMap.get(c) ?? 0) + 1)));
  const apps = rows.filter((r) => r.action === "APP_SUBMITTED").length;
  const declines = rows.filter((r) => r.action === "APP_DECLINED");
  const refusals = [...refused, ...declines];
  const weeks = new Map<string, { refused: number; published: number }>();
  gate.forEach((r) => {
    const d = new Date(r.ts); const day = (d.getUTCDay() + 6) % 7; const mon = new Date(d.getTime() - day * 86400000); const k = mon.toISOString().slice(5, 10);
    const w = weeks.get(k) ?? { refused: 0, published: 0 };
    if (status(r) === "REFUSE") w.refused++; if (status(r) === "PUBLISH") w.published++;
    weeks.set(k, w);
  });
  const started = rows.filter((r) => r.action === "TENANCY_STARTED").length;
  return {
    decisions: gate.length, refused: refused.length, published: published.length, held: held.length,
    refusalRate: refused.length / Math.max(1, refused.length + published.length), overrides, overrideRate: overrides / Math.max(1, gate.length),
    coverage: published.filter((r) => (r.payload as { badge?: boolean }).badge).length / Math.max(1, published.length),
    byCode: [...byCodeMap.entries()].map(([code, n]) => ({ code, n })).sort((a, b) => b.n - a.n),
    medianReviewMin: median(rows.filter((r) => r.action === "REVIEW_DECISION").map((r) => Number((r.payload as { minutes?: number }).minutes ?? 0))),
    medianTimeToOfferH: median(rows.filter((r) => r.action === "APP_OFFERED").map((r) => Number((r.payload as { hours?: number }).hours ?? 0))),
    escalationsPer100: (rows.filter((r) => r.action === "APP_ESCALATED").length / Math.max(1, apps)) * 100,
    rejectionsWithCode: refusals.length ? refusals.filter((r) => r.codes.length > 0).length / refusals.length : 1,
    offplatformPer100: (rows.filter((r) => r.action === "MSG_FLAG").length / Math.max(1, apps)) * 100,
    depositsThroughPartner: started ? rows.filter((r) => r.action === "DEP_HELD").length / started : 0,
    apps, capBlocked: rows.filter((r) => r.action === "CAP_BLOCKED").length, lintBlocks: rows.filter((r) => r.action === "PROF_LINT_BLOCK").length, subletBlocked: rows.filter((r) => r.action === "SUBLET_BLOCKED").length, rows: rows.length,
    weekly: [...weeks.entries()].sort().map(([week, v]) => ({ week, ...v })),
  };
}
