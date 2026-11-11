import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { sublets } from "@/db/schema";
import { ensureSeeded } from "@/lib/server/seed";
import { appendAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  return NextResponse.json(await db.select().from(sublets).orderBy(desc(sublets.id)).limit(20));
}

// W11 / T-11 plus the three caps, enforced on the server as well as in the form.
export async function POST(req: Request) {
  await ensureSeeded();
  const b = (await req.json()) as { headTenant?: string; room?: string; headRent?: number; subletRent?: number; startsOn?: string; endsOn?: string; leaseEnd?: string; deposit?: number; consent?: string };
  const errs: { code: string; message: string }[] = [];
  if (b.consent !== "GRANTED") errs.push({ code: "SUBLET-CONSENT-01", message: "A sublet needs the owner's written consent. We have asked them." });
  if ((b.subletRent ?? 0) > (b.headRent ?? 0)) errs.push({ code: "SUBLET-CAP-02", message: "A sublet cannot cost more than your own rent." });
  if (b.endsOn && b.leaseEnd && b.endsOn > b.leaseEnd) errs.push({ code: "SUBLET-DUR-03", message: "This ends after your own tenancy does." });
  if ((b.deposit ?? 0) > 2 * (b.headRent ?? 0)) errs.push({ code: "DEP-CAP-03", message: "The deposit cannot exceed two months' rent." });
  if (errs.length) {
    await appendAudit({ actor: "system", action: "SUBLET_BLOCKED", subject: `U-${Date.now().toString(36)}`, codes: errs.map((e) => e.code), payload: {} });
    return NextResponse.json({ error: "BLOCKED", errors: errs }, { status: 422 });
  }
  const [row] = await db.insert(sublets).values({ headTenant: b.headTenant ?? "demo", room: b.room ?? "", headRent: b.headRent!, subletRent: b.subletRent!, startsOn: b.startsOn ?? "", endsOn: b.endsOn ?? "", consent: "GRANTED", status: "LIVE" }).returning();
  await appendAudit({ actor: "landlord", action: "SUBLET_CREATED", subject: `U-${row.id}`, payload: { consent: "GRANTED" } });
  return NextResponse.json(row, { status: 201 });
}
