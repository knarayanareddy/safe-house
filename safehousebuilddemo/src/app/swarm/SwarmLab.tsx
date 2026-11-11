"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CLUSTERS, ARCH, type ClusterKey, type Persona } from "@/lib/personas";
import { ROUNDS, SCENARIOS, SUCCESS, buildGraph, createSim, monteCarlo, stepSim, type MCResult, type Post, type SimState, type ScenarioKey } from "@/lib/adoption";
import { mulberry32 } from "@/lib/rng";
import { mean, type Answers } from "@/lib/survey";
import { HBar } from "@/components/ui";

export interface SwarmPersona extends Persona { v2: Answers }
type Mode = "survey" | "adoption";
interface Pulse { a: number; b: number; t: number; speed: number; color: string; toCenter?: boolean }

const PAIN: Record<string, string> = { scams: "Scams", ghosting: "Ghosting", competition: "Too many applicants", discrimination: "“No internationals”", unclear: "Unclear selection", rentabove: "Rent above legal max", hospiteer: "Hospiteer auditions", fees: "Platform fees", shortstay: "Short-stay contracts", info: "No landlord info" };
const BARRIER: Record<string, string> = { supply: "Not enough rooms on it", landlord_adoption: "Landlords I want aren't on it", privacy: "Privacy / data security", verification: "Doubt the verification", existing: "Prefer current platforms", none: "Nothing" };
const SWITCH: Record<string, string> = { partner: "if RUG, Hanze or the municipality endorse it", landlords_here: "if I see good rooms I can't find elsewhere", friends: "if my friends or housemates use it", free_forever: "a written promise it stays free for students", verified_proof: "being able to see exactly what was checked", cheaper: "lower prices than the alternatives" };
const POS = "#cefa00", NEG = "#ff5a00", NEU = "#708a7e", GOLD = "#cefa00";

function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`;
}
const stanceColor = (s: number) => (s >= 0 ? mix(NEU, POS, Math.min(1, s * 1.8)) : mix(NEU, NEG, Math.min(1, -s * 1.8)));

export default function SwarmLab({ personas, counts }: { personas: SwarmPersona[]; counts: { version: string; source: string; n: number }[] }) {
  const intents = useMemo(() => Object.fromEntries(personas.map((p) => [p.id, Number(p.v2.intent ?? 5)])), [personas]);
  const graph = useMemo(() => buildGraph(personas, intents), [personas, intents]);
  const [mode, setMode] = useState<Mode>("survey");
  const [scenario, setScenario] = useState<ScenarioKey>("baseline");
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [tab, setTab] = useState<"feed" | "persona" | "report">("feed");
  const [sel, setSel] = useState<number | null>(null);
  const [answer, setAnswer] = useState<string>("");
  const [hud, setHud] = useState({ round: 0, sa: 0, la: 0, responded: 0 });
  const [posts, setPosts] = useState<Post[]>([]);
  const [mc, setMc] = useState<Record<string, MCResult>>({});
  const [mcBusy, setMcBusy] = useState(false);

  const wrap = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const S = useRef({
    x: new Float32Array(0), y: new Float32Array(0), vx: new Float32Array(0), vy: new Float32Array(0), w: 900, h: 600, alpha: 1,
    pulses: [] as Pulse[], sim: null as SimState | null, responded: new Set<number>(), flash: new Map<number, number>(), order: [] as number[], hover: -1, sel: -1, mode: "survey" as Mode,
    stance: [] as number[], adopted: [] as boolean[], centers: [] as { x: number; y: number }[], hubPos: new Map<number, { x: number; y: number }>(),
  });
  const personaAt = useCallback((i: number) => personas[i], [personas]);

  // layout targets
  const place = useCallback(() => {
    const s = S.current, n = graph.nodes.length;
    const cx = s.w / 2, cy = s.h / 2, R = Math.min(s.w, s.h) * 0.34;
    const keys = Object.keys(CLUSTERS) as ClusterKey[];
    s.centers = keys.map((_, i) => ({ x: cx + Math.cos((i / keys.length) * Math.PI * 2 - Math.PI / 2) * R * 1.25, y: cy + Math.sin((i / keys.length) * Math.PI * 2 - Math.PI / 2) * R * 0.95 }));
    const hubs = graph.nodes.filter((nd) => nd.kind === "hub");
    hubs.forEach((h, k) => s.hubPos.set(h.id, { x: cx + Math.cos((k / hubs.length) * Math.PI * 2) * R * 0.42, y: cy + Math.sin((k / hubs.length) * Math.PI * 2) * R * 0.34 }));
    if (s.x.length !== n) {
      s.x = new Float32Array(n); s.y = new Float32Array(n); s.vx = new Float32Array(n); s.vy = new Float32Array(n);
      const rnd = mulberry32(5);
      graph.nodes.forEach((nd, i) => {
        const c = nd.kind === "hub" ? s.hubPos.get(nd.id)! : s.centers[keys.indexOf(nd.cluster as ClusterKey)];
        s.x[i] = c.x + (rnd() - 0.5) * 120; s.y[i] = c.y + (rnd() - 0.5) * 120;
      });
    }
    s.alpha = 1;
  }, [graph]);

  const reset = useCallback((m: Mode, sc: ScenarioKey) => {
    const s = S.current;
    s.mode = m; s.responded = new Set(); s.flash = new Map(); s.pulses = [];
    const rnd = mulberry32(31);
    s.order = graph.students.concat(graph.landlords).map((i) => [i, rnd()] as const).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
    s.sim = m === "adoption" ? createSim(graph, SCENARIOS.find((x) => x.key === sc)!, 2026) : null;
    s.stance = s.sim ? s.sim.stance.slice() : graph.nodes.map((n) => n.prior);
    s.adopted = s.sim ? s.sim.adopted.slice() : graph.nodes.map(() => false);
    setPosts([]); setHud({ round: 0, sa: m === "adoption" ? s.adopted.filter((a, i) => a && graph.nodes[i].role === "student").length / graph.students.length : 0, la: 0, responded: 0 }); setRunning(false); s.alpha = Math.max(s.alpha, 0.4);
  }, [graph]);

  useEffect(() => { reset(mode, scenario); }, [mode, scenario, reset]);

  // resize + render loop
  useEffect(() => {
    const el = wrap.current, c = cvs.current;
    if (!el || !c) return;
    const resize = () => { const w = el.clientWidth, h = Math.max(440, Math.min(660, w * 0.68)); const dpr = Math.min(2, window.devicePixelRatio || 1); c.width = w * dpr; c.height = h * dpr; c.style.height = h + "px"; S.current.w = w; S.current.h = h; place(); };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    let raf = 0, last = performance.now();
    const keys = Object.keys(CLUSTERS) as ClusterKey[];
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const s = S.current, g = graph, n = g.nodes.length, ctx = c.getContext("2d")!;
      const dpr = c.width / s.w;
      // forces
      const a = Math.max(0.06, s.alpha);
      for (let i = 0; i < n; i++) {
        const nd = g.nodes[i];
        const tgt = nd.kind === "hub" ? s.hubPos.get(i)! : s.centers[keys.indexOf(nd.cluster as ClusterKey)];
        s.vx[i] += (tgt.x - s.x[i]) * (nd.kind === "hub" ? 0.03 : 0.012) * a; s.vy[i] += (tgt.y - s.y[i]) * (nd.kind === "hub" ? 0.03 : 0.012) * a;
        s.vx[i] += (Math.random() - 0.5) * 0.05; s.vy[i] += (Math.random() - 0.5) * 0.05;
        for (let j = i + 1; j < n; j++) {
          const dx = s.x[i] - s.x[j], dy = s.y[i] - s.y[j], d2 = dx * dx + dy * dy;
          const r = nd.kind === "hub" || g.nodes[j].kind === "hub" ? 46 : 20;
          if (d2 < r * r * 4 && d2 > 0.01) { const f = (r * r) / d2 * 0.35 * a; s.vx[i] += dx * f * 0.02; s.vy[i] += dy * f * 0.02; s.vx[j] -= dx * f * 0.02; s.vy[j] -= dy * f * 0.02; }
        }
      }
      for (const [p, q] of g.edges) {
        const dx = s.x[q] - s.x[p], dy = s.y[q] - s.y[p], d = Math.sqrt(dx * dx + dy * dy) || 1;
        const hub = g.nodes[p].kind === "hub" || g.nodes[q].kind === "hub";
        const L = hub ? 120 : 34, f = (d - L) * (hub ? 0.0012 : 0.01) * a;
        s.vx[p] += (dx / d) * f; s.vy[p] += (dy / d) * f; s.vx[q] -= (dx / d) * f; s.vy[q] -= (dy / d) * f;
      }
      for (let i = 0; i < n; i++) { s.vx[i] *= 0.84; s.vy[i] *= 0.84; s.x[i] = Math.max(12, Math.min(s.w - 12, s.x[i] + s.vx[i])); s.y[i] = Math.max(12, Math.min(s.h - 12, s.y[i] + s.vy[i])); }
      s.alpha *= 0.992;

      // draw
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#0b241c"; ctx.fillRect(0, 0, s.w, s.h);
      ctx.strokeStyle = "rgba(255,255,255,0.025)"; ctx.lineWidth = 1;
      for (let gx = 0; gx < s.w; gx += 48) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, s.h); ctx.stroke(); }
      for (let gy = 0; gy < s.h; gy += 48) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(s.w, gy); ctx.stroke(); }
      // cluster halos
      keys.forEach((k, i) => { const cc = s.centers[i]; const gr = ctx.createRadialGradient(cc.x, cc.y, 0, cc.x, cc.y, 92); gr.addColorStop(0, CLUSTERS[k].color + "22"); gr.addColorStop(1, CLUSTERS[k].color + "00"); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cc.x, cc.y, 92, 0, 7); ctx.fill(); ctx.fillStyle = CLUSTERS[k].color + "aa"; ctx.font = "10.5px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.fillText(CLUSTERS[k].label.toUpperCase(), cc.x, cc.y - 98); });
      // edges
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = "rgba(160,175,200,0.08)"; ctx.beginPath();
      for (const [p, q] of g.edges) { if (g.nodes[p].kind === "hub" || g.nodes[q].kind === "hub") continue; ctx.moveTo(s.x[p], s.y[p]); ctx.lineTo(s.x[q], s.y[q]); }
      ctx.stroke();
      ctx.strokeStyle = "rgba(214,174,74,0.07)"; ctx.beginPath();
      for (const [p, q] of g.edges) { if (g.nodes[p].kind !== "hub" && g.nodes[q].kind !== "hub") continue; ctx.moveTo(s.x[p], s.y[p]); ctx.lineTo(s.x[q], s.y[q]); }
      ctx.stroke();
      // survey hub
      if (s.mode === "survey") { ctx.strokeStyle = "rgba(95,212,166,0.5)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(s.w / 2, s.h / 2, 14 + Math.sin(now / 400) * 1.5, 0, 7); ctx.stroke(); ctx.fillStyle = "rgba(95,212,166,0.9)"; ctx.font = "10px ui-monospace, monospace"; ctx.fillText("SURVEY v2", s.w / 2, s.h / 2 + 30); ctx.beginPath(); ctx.arc(s.w / 2, s.h / 2, 4, 0, 7); ctx.fill(); }
      // pulses
      s.pulses = s.pulses.filter((p) => p.t < 1);
      for (const p of s.pulses) {
        p.t += dt * p.speed; if (p.t < 0) continue;
        const bx = p.toCenter ? s.w / 2 : s.x[p.b], by = p.toCenter ? s.h / 2 : s.y[p.b];
        const px = s.x[p.a] + (bx - s.x[p.a]) * p.t, py = s.y[p.a] + (by - s.y[p.a]) * p.t;
        ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(px, py, 2.2, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      }
      // nodes
      for (let i = 0; i < n; i++) {
        const nd = g.nodes[i];
        if (nd.kind === "hub") {
          const st = s.stance[i] ?? 0;
          ctx.strokeStyle = GOLD; ctx.lineWidth = 1.4; ctx.fillStyle = "#0b241c"; ctx.beginPath(); ctx.arc(s.x[i], s.y[i], 8, 0, 7); ctx.fill(); ctx.stroke();
          ctx.fillStyle = st > 0.05 ? POS : st < -0.05 ? NEG : GOLD; ctx.beginPath(); ctx.arc(s.x[i], s.y[i], 3.2, 0, 7); ctx.fill();
          ctx.fillStyle = "#c8d0da"; ctx.font = "10.5px -apple-system, Segoe UI, sans-serif"; ctx.textAlign = "center"; ctx.fillText(nd.label, s.x[i], s.y[i] - 13);
          continue;
        }
        const deg = g.neighbors[i].length, r = 2.6 + Math.min(3, deg * 0.16);
        let col: string, alpha = 1;
        if (s.mode === "survey") { const done = s.responded.has(i); col = CLUSTERS[nd.cluster as ClusterKey].color; alpha = done ? 1 : 0.28; } else col = stanceColor(s.stance[i]);
        const fl = s.flash.get(i) ?? 0;
        if (fl > 0) { s.flash.set(i, fl - dt * 1.6); ctx.strokeStyle = col; ctx.globalAlpha = Math.max(0, fl); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x[i], s.y[i], r + 14 * (1 - fl), 0, 7); ctx.stroke(); }
        ctx.globalAlpha = alpha; ctx.fillStyle = col;
        if (s.mode === "adoption" && s.adopted[i]) { ctx.shadowColor = POS; ctx.shadowBlur = 10; }
        if (nd.role === "landlord") { ctx.save(); ctx.translate(s.x[i], s.y[i]); ctx.rotate(Math.PI / 4); ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore(); } else { ctx.beginPath(); ctx.arc(s.x[i], s.y[i], r, 0, 7); ctx.fill(); }
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        if (i === s.sel || i === s.hover) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(s.x[i], s.y[i], r + 4, 0, 7); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.font = "11px -apple-system, sans-serif"; ctx.textAlign = "center"; ctx.fillText(nd.label, s.x[i], s.y[i] - r - 9); }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [graph, place]);

  // tick engine
  const respondedRows = useRef<number[]>([]);
  const tick = useCallback(() => {
    const s = S.current;
    if (s.mode === "survey") {
      const batch = s.order.slice(s.responded.size, s.responded.size + 4);
      if (!batch.length) { setRunning(false); setTab("report"); return; }
      batch.forEach((i, k) => { s.responded.add(i); s.flash.set(i, 1); s.pulses.push({ a: i, b: i, t: -k * 0.12, speed: 0.9, color: CLUSTERS[graph.nodes[i].cluster as ClusterKey].color, toCenter: true }); });
      respondedRows.current = [...s.responded];
      const newPosts: Post[] = batch.filter((i) => personas[i].v2.comment && Math.random() < 0.5).slice(0, 2).map((i) => ({ round: s.responded.size, platform: "chat", who: personas[i].name, node: i, tone: "neutral", text: String(personas[i].v2.comment) }));
      if (newPosts.length) setPosts((p) => [...newPosts, ...p].slice(0, 60));
      setHud((h) => ({ ...h, responded: s.responded.size }));
    } else if (s.sim) {
      if (s.sim.round >= ROUNDS) { setRunning(false); setTab("report"); return; }
      const res = stepSim(graph, s.sim, true, personaAt);
      s.stance = s.sim.stance.slice(); s.adopted = s.sim.adopted.slice(); s.alpha = Math.max(s.alpha, 0.25);
      res.flipsUp.concat(res.flipsDown).forEach((i) => s.flash.set(i, 1));
      res.pulses.forEach(([a, b], k) => s.pulses.push({ a, b, t: -k * 0.015, speed: 0.8, color: res.flipsDown.includes(a) ? NEG : POS }));
      setPosts((p) => [...res.posts.slice().reverse(), ...p].slice(0, 80));
      setHud((h) => ({ ...h, round: res.round, sa: res.studentAdoption, la: res.landlordAdoption }));
    }
  }, [graph, personas, personaAt]);
  useEffect(() => { if (!running) return; const id = setInterval(tick, (mode === "survey" ? 230 : 1500) / speed); return () => clearInterval(id); }, [running, tick, mode, speed]);

  // pointer
  const pick = (e: { clientX: number; clientY: number }) => {
    const r = cvs.current!.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, s = S.current;
    let best = -1, bd = 14 * 14;
    graph.nodes.forEach((_, i) => { const d = (s.x[i] - x) ** 2 + (s.y[i] - y) ** 2; if (d < bd) { bd = d; best = i; } });
    return best;
  };

  const runMC = () => {
    setMcBusy(true);
    const list = SCENARIOS.slice();
    const out: Record<string, MCResult> = {};
    let k = 0;
    const next = () => { if (k >= list.length) { setMc(out); setMcBusy(false); return; } out[list[k].key] = monteCarlo(graph, list[k], 1000); setMc({ ...out }); k++; setTimeout(next, 30); };
    setTimeout(next, 30);
  };

  const selected = sel != null ? personas[sel] : null;
  const interview = (q: "use" | "worry" | "change") => {
    if (!selected) return;
    const a = selected.v2;
    const intent = Number(a.intent ?? 5);
    const barrier = String(a.barrier ?? "none"), pain = (a.pains as string[] | undefined)?.[0] ?? "scams";
    const sw = (a.switch as string[] | undefined)?.[0] ?? "landlords_here";
    const txt = q === "use" ? `${intent}/10, honestly. ${intent >= 7 ? "My search is bad enough that I'd try anything that refuses fake listings." : intent >= 5 ? "I'd try it once, but only if there are real rooms on it." : "I'd probably stick to what I already use."} What would stop me: ${BARRIER[barrier].toLowerCase()}.`
      : q === "worry" ? `Mostly: ${BARRIER[barrier].toLowerCase()}. And the thing I can't stand in this market is ${PAIN[pain].toLowerCase()}.`
      : `${SWITCH[sw][0].toUpperCase() + SWITCH[sw].slice(1)}. ${selected.traits.skeptic > 0.55 ? "I've heard 'new platform' promises before." : "That would be enough for me."}`;
    setAnswer(txt);
  };

  // live survey aggregates
  const agg = useMemo(() => {
    const idx = respondedRows.current.length ? respondedRows.current : [];
    void hud.responded;
    const rows = idx.map((i) => personas[i]).filter(Boolean);
    const intent = rows.map((p) => Number(p.v2.intent)).filter((x) => !isNaN(x));
    const pains: Record<string, number> = {}, bar: Record<string, number> = {};
    rows.forEach((p) => { ((p.v2.pains as string[]) ?? []).forEach((x) => (pains[x] = (pains[x] ?? 0) + 1)); const b = p.v2.barrier as string; if (b) bar[b] = (bar[b] ?? 0) + 1; });
    return { n: rows.length, intent: mean(intent), hi: intent.filter((x) => x >= 8).length, pains: Object.entries(pains).sort((a, b) => b[1] - a[1]).slice(0, 5), bar: Object.entries(bar).sort((a, b) => b[1] - a[1]).slice(0, 4) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hud.responded, personas]);

  const done = mode === "adoption" ? hud.round >= ROUNDS : hud.responded >= graph.students.length + graph.landlords.length;
  const sc = SCENARIOS.find((x) => x.key === scenario)!;
  const cur = mc[scenario];
  const clusterReport = useMemo(() => {
    const s = S.current; if (!s.sim || hud.round < ROUNDS) return [];
    return (Object.keys(CLUSTERS) as ClusterKey[]).map((k) => { const ids = graph.nodes.filter((n) => n.cluster === k).map((n) => n.id); return [CLUSTERS[k].label, ids.filter((i) => s.adopted[i]).length / Math.max(1, ids.length)] as [string, number]; }).sort((a, b) => b[1] - a[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hud.round, graph]);

  return (
    <div style={{ display: "grid", gap: 28 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div className="seg" role="group" aria-label="Mode"><button aria-pressed={mode === "survey"} onClick={() => setMode("survey")}>1 · Survey swarm</button><button aria-pressed={mode === "adoption"} onClick={() => setMode("adoption")}>2 · Adoption swarm</button></div>
        {mode === "adoption" && <select className="select" style={{ width: "auto" }} value={scenario} onChange={(e) => setScenario(e.target.value as ScenarioKey)} aria-label="Scenario">{SCENARIOS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>}
        <button className="btn primary" onClick={() => { if (done) reset(mode, scenario); setRunning((r) => !r); }}>{running ? "Pause" : done ? "Run again" : S.current.responded.size || hud.round ? "Resume" : "Start simulation"}</button>
        <button className="btn" onClick={tick} disabled={running || done}>Step</button>
        <button className="btn ghost" onClick={() => reset(mode, scenario)}>Reset</button>
        <div className="seg" role="group" aria-label="Speed">{[1, 2, 4].map((v) => <button key={v} aria-pressed={speed === v} onClick={() => setSpeed(v)}>{v}×</button>)}</div>
      </div>
      <p className="dense muted" style={{ marginTop: -12, maxWidth: "88ch" }}>{mode === "survey" ? "Each persona agent answers the redesigned survey; the answers are read from the database (262 stored v2 rows). Watch responses fly into the survey hub, cluster by cluster." : sc.blurb + " Agents start with the stance their survey intent implies, then talk to peers and institutions each round."}</p>

      <div className="two-pane" style={{ gridTemplateColumns: "minmax(0,1fr) 380px" }}>
        <div>
          <div className="stage" ref={wrap}>
            <canvas ref={cvs} onPointerMove={(e) => { S.current.hover = pick(e); }} onPointerLeave={() => { S.current.hover = -1; }} onClick={(e) => { const i = pick(e); S.current.sel = i; if (i >= 0 && graph.nodes[i].kind === "persona") { setSel(i); setAnswer(""); setTab("persona"); } }} aria-label="Swarm visualisation. Select an agent to read its persona." role="img" />
            <div className="stage-hud">
              <span className="hud-chip">{mode === "survey" ? "SURVEY SWARM" : `ROUND ${String(hud.round).padStart(2, "0")} / ${ROUNDS}`}</span>
              {mode === "survey" ? <span className="hud-chip">responses {hud.responded} / {graph.students.length + graph.landlords.length}</span> : <><span className="hud-chip">students adopting {(hud.sa * 100).toFixed(0)}%</span><span className="hud-chip">landlords adopting {(hud.la * 100).toFixed(0)}%</span></>}
              <span className="hud-chip">{graph.nodes.length} nodes · {graph.edges.length} edges</span>
            </div>
            <div className="stage-legend">
              {mode === "adoption" ? <><span className="legend-i"><i className="dot" style={{ background: POS }} />supports</span><span className="legend-i"><i className="dot" style={{ background: NEU }} />undecided</span><span className="legend-i"><i className="dot" style={{ background: NEG }} />resists</span><span className="legend-i"><i className="dot" style={{ background: GOLD, borderRadius: 2, transform: "rotate(45deg)" }} />landlord</span><span className="legend-i"><i className="dot" style={{ background: "transparent", border: `1.5px solid ${GOLD}` }} />institution / platform</span></> : (Object.keys(CLUSTERS) as ClusterKey[]).map((k) => <span key={k} className="legend-i"><i className="dot" style={{ background: CLUSTERS[k].color }} />{CLUSTERS[k].label}</span>)}
            </div>
          </div>
          {mode === "adoption" && (
            <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center" }} aria-label="Timeline">
              {Array.from({ length: ROUNDS }, (_, i) => { const ev = sc.events.filter((e) => e.round === i + 1); return <div key={i} title={ev.map((e) => e.text).join("\n") || `Round ${i + 1}`} style={{ flex: 1, height: 8, borderRadius: 4, background: i < hud.round ? "var(--green)" : "var(--line-2)", position: "relative" }}>{ev.length > 0 && <i style={{ position: "absolute", top: -5, left: "50%", width: 6, height: 6, borderRadius: 3, background: ev[0].push < 0 ? "var(--fail)" : "var(--copper)", transform: "translateX(-50%)" }} />}</div>; })}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="seg" style={{ width: "100%", borderRadius: 0, border: 0, borderBottom: "1px solid var(--line)" }} role="tablist">{(["feed", "persona", "report"] as const).map((t) => <button key={t} style={{ flex: 1 }} role="tab" aria-pressed={tab === t} onClick={() => setTab(t)}>{t === "feed" ? "Communities" : t === "persona" ? "Agent" : "Report"}</button>)}</div>
          <div style={{ padding: 16, minHeight: 440 }}>
            {tab === "feed" && (
              <div className="feed" aria-live="polite">
                {posts.length === 0 && <p className="dense muted">Two simulated communities will fill up here once the run starts: <b>Facebook · Rooms in Groningen</b> and <b>WhatsApp · r/groningen</b>.</p>}
                {posts.map((p, i) => (
                  <div key={i} className="post" style={{ borderLeft: `3px solid ${p.tone === "pos" ? "var(--pass)" : p.tone === "neg" ? "var(--fail)" : p.tone === "sys" ? "var(--copper)" : "var(--line-2)"}` }}>
                    <div className="mono faint" style={{ fontSize: 10.5, display: "flex", justifyContent: "space-between" }}><span>{p.platform === "forum" ? "FB · Rooms in Groningen" : "WhatsApp · r/groningen"}</span><span>{mode === "survey" ? `#${p.round}` : `R${p.round}`}</span></div>
                    <div style={{ marginTop: 4 }}><b style={{ color: "var(--ink)", cursor: p.node != null ? "pointer" : undefined }} onClick={() => { if (p.node != null) { S.current.sel = p.node; setSel(p.node); setTab("persona"); } }}>{p.who}</b> {p.text}</div>
                  </div>
                ))}
              </div>
            )}
            {tab === "persona" && (selected ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div><span className="label">{ARCH[selected.archetype].label}</span><h3 className="title-md" style={{ marginTop: 4 }}>{selected.name}</h3><p className="dense muted" style={{ marginTop: 6 }}>{selected.bio}</p></div>
                <dl className="kv"><dt>Stated intent (v2)</dt><dd>{String(selected.v2.intent ?? "—")}/10</dd><dt>Top pain</dt><dd>{PAIN[(selected.v2.pains as string[])?.[0]] ?? "—"}</dd><dt>Biggest barrier</dt><dd>{BARRIER[String(selected.v2.barrier)] ?? "—"}</dd><dt>Fairest allocation</dt><dd>{String(selected.v2.alloc ?? "—")}</dd><dt>Current stance</dt><dd>{(S.current.stance[selected && personas.indexOf(selected)] ?? 0).toFixed(2)}</dd></dl>
                {selected.v2.comment ? <p className="dense" style={{ borderLeft: "3px solid var(--line-2)", paddingLeft: 10 }}>“{String(selected.v2.comment)}”</p> : null}
                <div><span className="label">Interview this agent</span><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}><button className="btn sm" onClick={() => interview("use")}>Would you use it?</button><button className="btn sm" onClick={() => interview("worry")}>What worries you?</button><button className="btn sm" onClick={() => interview("change")}>What changes your mind?</button></div>{answer && <div className="post" style={{ marginTop: 10 }}>{answer}</div>}</div>
                <p className="mono faint" style={{ fontSize: 10.5 }}>SIMULATED — synthetic persona, scripted from its traits. Not a real person, not a quote.</p>
              </div>
            ) : <p className="dense muted">Click any node in the swarm to read the agent behind it, see its stored survey answers, and interview it.</p>)}
            {tab === "report" && (
              <div style={{ display: "grid", gap: 12 }} className="dense">
                <span className="label">Report agent</span>
                {mode === "survey" ? (
                  <>
                    <p><b style={{ color: "var(--ink)" }}>{agg.n}</b> agents responded. Mean intent <b className="mono" style={{ color: "var(--ink)" }}>{agg.intent.toFixed(1)}/10</b>; <span className="mono">{agg.hi}</span> scored 8 or higher.</p>
                    <div><span className="label">Top pains</span>{agg.pains.map(([k, v]) => <HBar key={k} label={PAIN[k]} value={v} max={Math.max(1, agg.n)} text={`${Math.round((v / Math.max(1, agg.n)) * 100)}%`} />)}</div>
                    <div><span className="label">Barriers</span>{agg.bar.map(([k, v]) => <HBar key={k} label={BARRIER[k]} value={v} max={Math.max(1, agg.n)} alt text={`${Math.round((v / Math.max(1, agg.n)) * 100)}%`} />)}</div>
                    <Link href="/survey/results" className="btn sm" style={{ justifySelf: "start" }}>Open full survey results</Link>
                  </>
                ) : hud.round < ROUNDS ? <p className="muted">The report is written after round {ROUNDS}. Run the simulation, then ask for 1,000 re-runs below.</p> : (
                  <>
                    <p>In <b style={{ color: "var(--ink)" }}>{sc.label}</b>, students adopting reached <b className="mono" style={{ color: "var(--ink)" }}>{(hud.sa * 100).toFixed(0)}%</b> and landlords <b className="mono" style={{ color: "var(--ink)" }}>{(hud.la * 100).toFixed(0)}%</b> after {ROUNDS} rounds.</p>
                    <div><span className="label">Adoption by community</span>{clusterReport.map(([k, v]) => <HBar key={k} label={k} value={v} max={1} text={`${Math.round(v * 100)}%`} />)}</div>
                    <p className="muted">One run is an anecdote. The distribution below is the finding.</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "baseline" }}>
          <div><span className="label">Scenario frequencies</span><h2 className="title-lg" style={{ marginTop: 6 }}>1,000 worlds, five futures</h2><p className="dense muted" style={{ marginTop: 4, maxWidth: "76ch" }}>“Success” = at least {SUCCESS.students * 100}% of students <i>and</i> {SUCCESS.landlords * 100}% of landlords adopting within {ROUNDS} rounds, the minimum for a two-sided market to feel liquid. If it happens 340 times out of 1,000, then p ≈ 0.34.</p></div>
          <button className="btn primary" onClick={runMC} disabled={mcBusy}>{mcBusy ? "Simulating…" : Object.keys(mc).length ? "Re-run 5 × 1,000" : "Run 5 × 1,000 simulations"}</button>
        </div>
        {Object.keys(mc).length > 0 && (
          <div className="two-pane" style={{ marginTop: 18, gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
            <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Scenario</th><th className="r">Successes</th><th className="r">p</th><th className="r">Mean students</th></tr></thead><tbody>
              {SCENARIOS.map((s) => { const r = mc[s.key]; return <tr key={s.key} style={{ cursor: "pointer" }} onClick={() => setScenario(s.key)}><td>{s.label}{scenario === s.key && <span className="pill green" style={{ marginLeft: 8 }}>selected</span>}</td><td className="r mono">{r ? `${r.successes} / ${r.runs}` : "…"}</td><td className="r mono" style={{ fontWeight: 700, color: "var(--ink)" }}>{r ? `≈ ${r.p.toFixed(2)}` : "…"}</td><td className="r mono">{r ? `${(r.mean * 100).toFixed(0)}%` : "…"}</td></tr>; })}
            </tbody></table></div>
            <div>
              <span className="label">Distribution of final student adoption · {sc.label}</span>
              {cur ? <><div className="hist" style={{ marginTop: 10 }} aria-label="Histogram">{cur.bins.map((b, i) => <div key={i} title={`${i * 5}–${i * 5 + 5}%: ${b} runs`} style={{ height: `${Math.max(2, (b / Math.max(...cur.bins)) * 100)}%`, background: i / 20 >= SUCCESS.students ? "var(--green)" : "var(--line-2)" }} />)}</div>
                <div className="mono faint" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 4 }}><span>0%</span><span>40% threshold</span><span>100%</span></div>
                <p className="dense" style={{ marginTop: 10 }}>p10 <b className="mono">{(cur.p10 * 100).toFixed(0)}%</b> · mean <b className="mono">{(cur.mean * 100).toFixed(0)}%</b> · p90 <b className="mono">{(cur.p90 * 100).toFixed(0)}%</b>. The market is bimodal: it tips or it stalls. That is the cold-start problem, drawn.</p></> : <p className="dense muted" style={{ marginTop: 10 }}>Select a scenario row.</p>}
            </div>
          </div>
        )}
        <p className="mono faint" style={{ fontSize: 11, marginTop: 14 }}>SIMULATED — rehearsal for design, not user research. We have not talked to 262 students; this is a specification of their behaviour and a simulation that runs it. Decision output: failing tests and design bets, never a choice about a person (spec §9.2).</p>
      </section>
      <p className="dense muted">Stored responses: {counts.map((c) => `${c.version} · ${c.source} · ${c.n}`).join("  |  ")}</p>
    </div>
  );
}
