import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { ensureSeeded } from "@/lib/server/seed";
import { appendAudit } from "@/lib/server/audit";
import { getListing } from "@/lib/listings";
import { addressOf, generateLetter, RULESET_VERSION } from "@/lib/domain";
import { DEMO_APPLICANTS, generatePopulation, queuePosition, runFunnel } from "@/lib/algorithms";

export const dynamic = "force-dynamic";
const CAP = 10;

export async function GET(req: Request) {
  await ensureSeeded();
  const applicant = new URL(req.url).searchParams.get("applicant") ?? "";
  const rows = await db.select().from(applications).where(eq(applications.applicant, applicant));
  const live = rows.filter((r) => r.status === "SUBMITTED").length;
  return NextResponse.json({ rows, live, cap: CAP });
}

export async function POST(req: Request) {
  await ensureSeeded();
  const body = (await req.json()) as { applicant?: string; listingId?: string; bulk?: number };
  const me = DEMO_APPLICANTS.find((a) => a.id === body.applicant);
  if (!me) return NextResponse.json({ error: "UNKNOWN_APPLICANT" }, { status: 400 });
  // Demo helper: simulate nine other live applications so the cap can be shown.
  if (body.bulk) {
    const [{ n }] = (await db.execute(sql`select count(*)::int as n from applications where applicant = ${me.id} and status = 'SUBMITTED'`)).rows as { n: number }[];
    const toAdd = Math.max(0, Math.min(body.bulk, CAP - n));
    for (let i = 0; i < toAdd; i++) await db.insert(applications).values({ applicant: me.id, listingId: `L-demo-${n + i + 1}`, status: "SUBMITTED", position: 5 + i, total: 15 });
    await appendAudit({ actor: "student", action: "APP_SUBMITTED", subject: `${me.id}@bulk-demo`, payload: { added: toAdd } });
    return NextResponse.json({ added: toAdd, live: n + toAdd, cap: CAP });
  }
  const listing = body.listingId ? getListing(body.listingId) : undefined;
  if (!listing) return NextResponse.json({ error: "UNKNOWN_LISTING" }, { status: 404 });
  if (listing.status !== "PUBLISHED") return NextResponse.json({ error: "LISTING_NOT_OPEN", message: "Only published listings accept applications." }, { status: 409 });
  const existing = await db.select().from(applications).where(and(eq(applications.applicant, me.id), eq(applications.listingId, listing.id)));
  const live = (await db.select().from(applications).where(and(eq(applications.applicant, me.id), eq(applications.status, "SUBMITTED")))).length;
  if (existing.some((e) => e.status === "SUBMITTED")) return NextResponse.json({ ...existing[0], live, cap: CAP, already: true });
  if (live >= CAP) {
    const letter = generateLetter(["CAP-EXCEEDED-09"], { address: addressOf(listing), ruleSetVersion: RULESET_VERSION });
    await appendAudit({ actor: "system", action: "CAP_BLOCKED", subject: me.id, codes: ["CAP-EXCEEDED-09"], payload: { live, listing: listing.id } });
    return NextResponse.json({ error: "CAP-EXCEEDED-09", code: "CAP-EXCEEDED-09", live, cap: CAP, letter }, { status: 409 });
  }
  // The pool for this room: the capped applicant pool under the published rule (deterministic per listing).
  const salt = Number(listing.id.slice(2)) % 997;
  const pool = runFunnel(generatePopulation(20261111, 121176 + salt)).capped;
  const { position, total } = queuePosition(pool, me);
  const [row] = await db.insert(applications).values({ applicant: me.id, listingId: listing.id, status: "SUBMITTED", position, total }).returning();
  await appendAudit({ actor: "student", action: "APP_SUBMITTED", subject: `${me.id}@${listing.id}`, payload: { position, total, rule: `Selection rules v${RULESET_VERSION}` } });
  return NextResponse.json({ ...row, live: live + 1, cap: CAP }, { status: 201 });
}

export async function DELETE(req: Request) {
  await ensureSeeded();
  const applicant = new URL(req.url).searchParams.get("applicant") ?? "";
  await db.delete(applications).where(eq(applications.applicant, applicant));
  return NextResponse.json({ ok: true });
}
