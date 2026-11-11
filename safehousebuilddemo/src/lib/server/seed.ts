import { sql } from "drizzle-orm";
import { db, getDbSchema } from "@/db";
import { auditLog, personas as personasTable, surveyResponses } from "@/db/schema";
import { mulberry32, pick, weighted } from "@/lib/rng";
import { generatePersonas } from "@/lib/personas";
import { answerBoth } from "@/lib/survey";
import { chain, type AuditInput } from "./audit";

const DDL = [
  sql`create table if not exists audit_log (seq integer primary key, ts timestamptz not null, actor text not null, action text not null, subject text not null, codes jsonb not null, payload jsonb not null, prev_hash text not null, hash text not null, orig_payload jsonb)`,
  sql`create table if not exists personas (id text primary key, data jsonb not null)`,
  sql`create table if not exists survey_responses (id serial primary key, version text not null, persona_id text, source text not null, answers jsonb not null, created_at timestamptz not null default now())`,
  sql`create table if not exists applications (id serial primary key, applicant text not null, listing_id text not null, status text not null, position integer, total integer, code text, created_at timestamptz not null default now())`,
  sql`create table if not exists sublets (id serial primary key, head_tenant text not null, room text not null, head_rent integer not null, sublet_rent integer not null, starts_on text not null, ends_on text not null, consent text not null, status text not null, created_at timestamptz not null default now())`,
];

const T0 = Date.UTC(2026, 8, 14, 8);
const T1 = Date.UTC(2026, 10, 14, 20);

export function generateAuditEvents(seed = 20261113): AuditInput[] {
  const rnd = mulberry32(seed);
  const ev: AuditInput[] = [];
  const at = () => new Date(T0 + Math.floor(rnd() * (T1 - T0)));
  const plus = (d: Date, mins: number) => new Date(d.getTime() + mins * 60000);
  const push = (ts: Date, actor: string, action: string, subject: string, codes: string[] = [], payload: Record<string, unknown> = {}) => ev.push({ ts, actor, action, subject, codes, payload });
  const nonce = () => Math.floor(rnd() * 1e6).toString(16).padStart(5, "0");

  // Supply: listing submissions → gate → review
  for (let i = 0; i < 340; i++) {
    const id = `L-${2000 + i}`;
    const t = at();
    const kind = weighted(rnd, [["genuine", 50], ["professional", 12], ["agent", 10], ["fraud", 13], ["photo", 5], ["addr", 4], ["trader", 3], ["id", 3]] as const);
    push(t, kind === "agent" ? "agent" : "landlord", "LISTING_SUBMITTED", id, [], { kind, hood: pick(rnd, ["Binnenstad", "Oosterparkwijk", "Korrewegwijk", "Helpman", "Paddepoel", "Ebbingekwartier", "Hortusbuurt", "Zernike"]) });
    const g = plus(t, 0.2);
    const ms = 900 + Math.floor(rnd() * 1800);
    if (kind === "genuine" || kind === "professional") {
      const over = rnd() < 0.18;
      push(g, "system", "GATE_DECISION", id, over ? ["LOT-RENT-04"] : [], { status: "PUBLISH", badge: rnd() > 0.04, checks: 6, ms });
      if (rnd() < 0.008) { push(plus(g, 3000), "ops", "REVIEW_OVERRIDE", id, [], { from: "PUBLISH", to: "SUSPENDED", reviewer: "R-" + (1 + Math.floor(rnd() * 4)), reason: "report triaged" }); }
    } else if (kind === "agent" || kind === "photo") {
      const code = kind === "agent" ? "LOT-MANDATE-01" : "LOT-DUP-02";
      push(g, "system", "GATE_DECISION", id, [code], { status: "HOLD", checks: 6, ms });
      const reviewer = "R-" + (1 + Math.floor(rnd() * 4));
      push(plus(g, 1), "ops", "REVIEW_ASSIGNED", id, [code], { reviewer, slaHours: 24 });
      const minutes = Math.round(40 + Math.pow(rnd(), 1.6) * 1500);
      const approved = rnd() < 0.82;
      push(plus(g, minutes), "ops", "REVIEW_DECISION", id, approved ? [] : [code], { outcome: approved ? "PUBLISH" : "REFUSE", minutes, reviewer });
      if (minutes > 1440) push(plus(g, 1440), "system", "SLA_ESCALATION", id, ["HUM-SLA-01"], { reviewer });
    } else {
      const codes = kind === "fraud" ? ["LOT-OWNER-02", ...(rnd() < 0.7 ? ["LOT-DUP-01"] : []), ...(rnd() < 0.5 ? ["LOT-RENT-04"] : [])] : kind === "addr" ? ["LOT-ADDR-03"] : kind === "trader" ? ["TRD-INVALID-01"] : ["ID-FAIL-01"];
      const refuseCodes = codes.filter((c) => c !== "LOT-RENT-04");
      push(g, "system", "GATE_DECISION", id, codes, { status: "REFUSE", checks: 6, ms, refuseCodes });
      push(plus(g, 0.1), "system", "LETTER_SENT", id, refuseCodes, { channel: "email" });
      const reviewer = "R-" + (1 + Math.floor(rnd() * 4));
      push(plus(g, 5 + Math.floor(rnd() * 600)), "ops", "REVIEW_ASSIGNED", id, refuseCodes, { reviewer, slaHours: 24 });
      if (kind === "trader") push(plus(g, 0.2), "system", "ACCOUNT_SUSPENDED", id, ["TRD-INVALID-01"], {});
      if (rnd() < 0.045) {
        push(plus(g, 60 * 30), "landlord", "APPEAL_FILED", id, refuseCodes, {});
        push(plus(g, 60 * 40), "ops", "REVIEW_OVERRIDE", id, refuseCodes, { from: "REFUSE", to: "PUBLISH", reviewer, reason: "mandate attached" });
      }
    }
  }

  // Demand: applications
  for (let i = 0; i < 520; i++) {
    const t = at();
    const listing = `L-${2000 + Math.floor(rnd() * 340)}`;
    const applicant = `S-${nonce()}`;
    push(t, "student", "APP_SUBMITTED", `${applicant}@${listing}`, [], { listing });
    const r = rnd();
    if (r < 0.1) push(plus(t, 0.1), "system", "APP_INELIGIBLE", `${applicant}@${listing}`, [pick(rnd, ["APP-ELIG-04", "APP-ELIG-05", "APP-ELIG-05", "APP-ELIG-06"])], { rule: "Selection rules v1.2" });
    else if (r < 0.45) { const total = 15; const position = 2 + Math.floor(rnd() * 13); push(plus(t, 60 * (20 + Math.floor(rnd() * 70))), "landlord", "APP_DECLINED", `${applicant}@${listing}`, ["APP-DECLINE-07"], { position, total }); }
    else if (r < 0.52) push(plus(t, 60 * 48), "ops", "APP_ESCALATED", `${applicant}@${listing}`, ["APP-SILENT-06"], { hoursSilent: 48 });
    else if (r < 0.64) push(plus(t, 60 * (6 + Math.floor(rnd() * 66))), "landlord", "APP_OFFERED", `${applicant}@${listing}`, [], { hours: 6 + Math.floor(rnd() * 66) });
    else if (r < 0.69) push(plus(t, 60 * 24 * 14), "system", "APP_STALE", `${applicant}@${listing}`, ["APP-STALE-08"], {});
  }
  for (let i = 0; i < 74; i++) push(at(), "system", "CAP_BLOCKED", `S-${nonce()}`, ["CAP-EXCEEDED-09"], { live: 10 });
  for (let i = 0; i < 61; i++) push(at(), "system", "MSG_FLAG", `thread-${nonce()}`, ["MSG-OFFPLAT-01"], {});
  for (let i = 0; i < 13; i++) push(at(), "system", "MSG_FLAG", `thread-${nonce()}`, ["MSG-FEE-02"], { escalated: true });
  for (let i = 0; i < 9; i++) push(at(), "system", "PROF_LINT_BLOCK", `H-${nonce()}`, ["PROF-LINT-01"], { phrase: pick(rnd, ["Dutch-speaking only", "girls only", "no internationals"]) });
  for (let i = 0; i < 72; i++) push(at(), "ops", "MEETING_RECORDED", `H-${nonce()}`, [], { minutes: 20, candidates: 8 + Math.floor(rnd() * 8) });
  for (let i = 0; i < 27; i++) push(at(), "system", "SUBLET_BLOCKED", `U-${nonce()}`, [pick(rnd, ["SUBLET-CONSENT-01", "SUBLET-CONSENT-01", "SUBLET-CAP-02", "SUBLET-DUR-03"])], {});
  for (let i = 0; i < 31; i++) push(at(), "landlord", "SUBLET_CREATED", `U-${nonce()}`, [], { consent: "GRANTED" });
  for (let i = 0; i < 18; i++) { const t = at(); const id = `T-${nonce()}`; push(t, "student", "TENANCY_STARTED", id, [], {}); if (rnd() < 0.86) push(plus(t, 60), "money", "DEP_HELD", id, [], { partner: "escrow:mock", capEur: "2x rent" }); }

  ev.sort((a, b) => a.ts.getTime() - b.ts.getTime());
  return ev;
}

declare global { var __seedPromise: Promise<void> | undefined }

async function seed() {
  const schema = getDbSchema();
  if (schema) await db.execute(sql.raw(`create schema if not exists "${schema}"`));
  for (const d of DDL) await db.execute(d);
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(8675309)`);
    const [{ n }] = (await tx.execute(sql`select count(*)::int as n from audit_log`)).rows as { n: number }[];
    if (n === 0) {
      const rows = chain(generateAuditEvents());
      for (let i = 0; i < rows.length; i += 400) await tx.insert(auditLog).values(rows.slice(i, i + 400));
    }
    const [{ p }] = (await tx.execute(sql`select count(*)::int as p from personas`)).rows as { p: number }[];
    if (p === 0) {
      const people = generatePersonas();
      for (let i = 0; i < people.length; i += 100) await tx.insert(personasTable).values(people.slice(i, i + 100).map((x) => ({ id: x.id, data: x as unknown as Record<string, unknown> })));
      const resp = people.flatMap((x) => { const a = answerBoth(x); return [{ version: "v1", personaId: x.id, source: "simulated", answers: a.v1 as Record<string, unknown> }, { version: "v2", personaId: x.id, source: "simulated", answers: a.v2 as Record<string, unknown> }]; });
      for (let i = 0; i < resp.length; i += 100) await tx.insert(surveyResponses).values(resp.slice(i, i + 100));
    }
  });
}

export function ensureSeeded(): Promise<void> {
  if (!globalThis.__seedPromise) globalThis.__seedPromise = seed().catch((e) => { globalThis.__seedPromise = undefined; throw e; });
  return globalThis.__seedPromise;
}
