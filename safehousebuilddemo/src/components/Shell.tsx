"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./ui";

const TABS = [
  { href: "/discover", label: "Discover", match: ["/discover", "/room", "/gate"] },
  { href: "/hospiteer", label: "Hospiteer" },
  { href: "/swap", label: "Sublet & Swap" },
  { href: "/simulate", label: "Simulation" },
  { href: "/swarm", label: "Swarm Lab", tag: "live" },
  { href: "/survey", label: "Survey", tag: "new", match: ["/survey"] },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/audit", label: "Audit", match: ["/audit", "/codes"] },
];

const MOCKS = [
  ["iDIN identity (idin:mock-bank)", "A Dutch bank-backed iDIN assertion via a certified broker. Returns verified / assurance level / date only."],
  ["Kadaster ownership (kadaster:mock)", "Kadaster owner lookup per address. Paid per query; cost at volume is an open question."],
  ["BAG address register (bag:mock)", "Public BAG API: confirms the address exists and has a residential usage (woonfunctie)."],
  ["KvK trader register (kvk:mock)", "KvK Handelsregister API for professional landlords (DSA Art. 30 traceability)."],
  ["Image fingerprints (phash:mock / tineye:mock)", "Our own sha256 + dHash plus an external reverse-image API. Images are never classified (AI Act Art. 5)."],
  ["Rent ceiling (huurcommissie:approx)", "WWS-O-2026-approx piecewise model. Real version: the official Huurcommissie calculation."],
  ["Escrow (escrow:mock)", "A licensed partner holds deposits. We never hold funds (PSD2)."],
  ["Survey respondents & the swarm", "262 synthetic Groningen personas answer the survey and drive the swarm. Labelled SIMULATED everywhere. Not user research."],
];

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => { setDark(document.documentElement.getAttribute("data-theme") === "dark"); }, []);
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, []);
  const toggle = () => { const n = !dark; setDark(n); document.documentElement.setAttribute("data-theme", n ? "dark" : "light"); try { localStorage.setItem("theme", n ? "dark" : "light"); } catch {} };
  return (
    <>
      <div className="topbar">
        <div className="wrap">
          <Link href="/" className="brand" aria-label="Verified home"><span className="brand-mark"><Icon name="shield" size={17} /></span>Verified</Link>
          <span className="city-pill"><Icon name="pin" size={14} />Groningen</span>
          <span className="spacer" />
          <Link href="/gate" className="btn sm" style={{ display: "inline-flex" }}>List a room</Link>
          <button className="btn sm" onClick={toggle} aria-pressed={dark} aria-label="Toggle dark theme">{dark ? "Light" : "Dark"}</button>
          <button className="city-pill" onClick={() => setOpen(true)} style={{ cursor: "pointer", borderColor: "var(--copper)", color: "var(--copper)", fontWeight: 600 }} aria-haspopup="dialog">
            <span className="dot" style={{ background: "var(--copper)" }} />Demo mode
          </button>
        </div>
      </div>
      <nav className="tabbar" aria-label="Main">
        <div className="wrap">
          {TABS.map((t) => {
            const on = (t.match ?? [t.href]).some((m) => path === m || path.startsWith(m + "/"));
            return <Link key={t.href} href={t.href} className="tab" aria-current={on ? "page" : undefined}>{t.label}{t.tag && <span className="new">{t.tag}</span>}</Link>;
          })}
        </div>
      </nav>
      <main className="wrap" style={{ paddingBottom: 24 }}>{children}</main>
      <footer className="footer">
        <div className="wrap">
          <p>Working demo for a hackathon. Checks are simulated where marked. Detector figures are used as a simulation input, attributed. Not legal advice.</p>
          <p style={{ marginTop: 6 }}>Demo environment. Identity, ownership, address and register checks are simulated; the issuer is shown on every result. Survey respondents are synthetic personas — SIMULATED, rehearsal for design, not user research.</p>
        </div>
      </footer>
      {open && (
        <>
          <div className="drawer-bg" onClick={() => setOpen(false)} />
          <aside className="drawer" role="dialog" aria-modal="true" aria-label="What is mocked in this demo">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="label">Demo mode</span><button className="btn sm ghost" onClick={() => setOpen(false)} aria-label="Close">Close</button></div>
            <h2 className="title-lg" style={{ margin: "12px 0" }}>What is simulated here</h2>
            <p className="dense muted">Every simulated value carries its issuer. Nothing below is a real lookup, and nothing is shown as one.</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "18px 0 0", display: "grid", gap: 14 }}>
              {MOCKS.map(([k, v]) => <li key={k} style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}><span className="mock">{k.split("(")[1]?.replace(")", "") ?? "simulated"}</span><div style={{ color: "var(--ink)", fontWeight: 600, margin: "6px 0 2px" }}>{k.split(" (")[0]}</div><div className="dense muted">{v}</div></li>)}
            </ul>
          </aside>
        </>
      )}
    </>
  );
}
