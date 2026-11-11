import { NextResponse } from "next/server";
import { db } from "@/db";
import { surveyResponses } from "@/db/schema";
import { loadResponses } from "@/lib/server/data";
import { ensureSeeded } from "@/lib/server/seed";
import { V1, V2 } from "@/lib/survey";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await ensureSeeded();
  const b = (await req.json()) as { answers?: Record<string, unknown> };
  const required = V2.filter((q) => q.required);
  const missing = required.filter((q) => b.answers?.[q.id] === undefined || b.answers?.[q.id] === "" || (Array.isArray(b.answers?.[q.id]) && (b.answers![q.id] as unknown[]).length === 0));
  if (!b.answers || missing.length) return NextResponse.json({ error: "MISSING_REQUIRED", missing: missing.map((q) => q.id) }, { status: 422 });
  const [row] = await db.insert(surveyResponses).values({ version: "v2", personaId: null, source: "real", answers: b.answers }).returning({ id: surveyResponses.id });
  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}

// CSV export: /api/survey?version=v2&source=simulated|real|all
export async function GET(req: Request) {
  const u = new URL(req.url);
  const version = u.searchParams.get("version") ?? "v2";
  const source = u.searchParams.get("source") ?? "all";
  const qs = version === "v1" ? V1 : V2;
  const rows = (await loadResponses(version)).filter((r) => source === "all" || r.source === source);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const cell = (a: unknown) => (Array.isArray(a) ? a.join("|") : a && typeof a === "object" ? Object.entries(a).map(([k, x]) => `${k}=${x}`).join("|") : a);
  const head = ["response_id", "persona_id", "source", ...qs.map((q) => q.id)];
  const lines = [head.join(",")].concat(rows.map((r) => [r.id, r.personaId ?? "", r.source, ...qs.map((q) => esc(cell(r.answers[q.id])))].map((x, i) => (i < 3 ? esc(x) : x)).join(",")));
  return new NextResponse(lines.join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="verified-survey-${version}-${source}.csv"` } });
}
