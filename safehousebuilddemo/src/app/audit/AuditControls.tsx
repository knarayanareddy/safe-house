"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AuditControls({ broken }: { broken: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const go = async (op: "tamper" | "reset") => { setBusy(true); await fetch("/api/audit", { method: "POST", body: JSON.stringify({ op }) }); router.refresh(); setBusy(false); };
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <span className="mono faint" style={{ fontSize: 11 }}>dev only</span>
      {broken ? <button className="btn" onClick={() => go("reset")} disabled={busy}>Restore row 7</button> : <button className="btn danger" onClick={() => go("tamper")} disabled={busy}>Tamper row 7</button>}
    </div>
  );
}
