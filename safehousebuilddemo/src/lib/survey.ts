// Survey instruments (v1 = the Google Form as built, v2 = redesigned), the persona response model, coverage analysis and aggregation.
// SIMULATION ONLY: synthetic answers are rehearsal for design, not user research (spec §9.4).
import { mulberry32, hashStr, clamp, normal, type Rng } from "./rng";
import type { Persona } from "./personas";

export type QType = "single" | "multi" | "scale" | "matrix" | "text" | "max3";
export interface Opt { id: string; label: string }
export interface Question {
  id: string; section: string; type: QType; prompt: string; help?: string; options?: Opt[]; rows?: Opt[]; min?: number; max?: number;
  minLabel?: string; maxLabel?: string; required?: boolean; only?: "student" | "landlord"; covers?: string[];
}
export type Answer = string | string[] | number | Record<string, number>;
export type Answers = Record<string, Answer>;
const O = (id: string, label: string): Opt => ({ id, label });

/* ───────────────────────── v1 — the Google Form as it exists ───────────────────────── */
export const V1: Question[] = [
  { id: "v1_role", section: "About you", type: "single", prompt: "Which of the following best describes you?", options: [O("seeker", "Student looking for housing / previously looked for housing"), O("sublettor", "Student subletting their room / previously have subletted"), O("landlord", "I'm a landlord or property manager"), O("other", "Other")] },
  { id: "v1_platforms", section: "Search", type: "multi", prompt: "Which platforms have you used to search for housing?", options: [O("facebook", "Facebook"), O("kamernet", "Kamernet"), O("pararius", "Pararius"), O("housinganywhere", "HousingAnywhere"), O("uni", "University housing services"), O("other", "Other"), O("none", "I haven't searched yet")] },
  { id: "v1_difficulties", section: "Search", type: "multi", prompt: "What are your biggest difficulties when searching for housing?", options: [O("scams", "Scams or fake listings"), O("competition", "Too many applicants competing"), O("unresponsive", "Landlords not responding"), O("subscriptions", "Expensive platform subscriptions"), O("suitable", "Difficulty finding suitable housing"), O("transparency", "Lack of transparency about landlords"), O("other", "Other")] },
  { id: "v1_apps", section: "Search", type: "single", prompt: "Approximately how many applications/messages did you send during your most recent housing search in a month?", options: [O("0-5", "0–5"), O("6-15", "6–15"), O("16-30", "16–30"), O(">30", "More than 30"), O("none", "I haven't applied yet")] },
  { id: "v1_fraud", section: "Search", type: "single", required: true, prompt: "Have you ever encountered a suspicious or potentially fraudulent housing listing?", options: [O("yes", "Yes"), O("no", "No")] },
  { id: "v1_fraud_text", section: "Search", type: "text", prompt: "If yes, then what was your experience?" },
  { id: "v1_feature", section: "Concept", type: "single", prompt: "Which feature would be most valuable to you?", options: [O("verified", "Verified landlords, students and properties"), O("ai", "AI-powered matching"), O("privacy", "Privacy protection for personal information"), O("free", "Free applications and listings"), O("transparent", "Transparent application status"), O("other", "Other")] },
  { id: "v1_likely", section: "Concept", type: "scale", min: 1, max: 5, minLabel: "1 = Very unlikely", maxLabel: "5 = Very likely", prompt: "How likely would you be to use this platform?" },
  { id: "v1_concern", section: "Concept", type: "single", required: true, prompt: "What would be your biggest concern about using this platform?", options: [O("supply", "Not enough available properties or applicants"), O("privacy", "Privacy and data security"), O("trustAI", "Trust in AI matching"), O("verification", "Reliability of verification"), O("existing", "Prefer existing platforms"), O("none", "No concerns"), O("other", "Other")] },
  { id: "v1_convince", section: "Concept", type: "text", prompt: "What would convince you to use our platform instead of existing alternatives?" },
];

/* ───────────────────────── v2 — redesigned ───────────────────────── */
export const STUDENT_ROLES = ["seeker", "mover", "leaver", "incoming", "phd"];
export const V2: Question[] = [
  // A. About you
  { id: "role", section: "A · About you", type: "single", required: true, prompt: "Which best describes your situation right now?", covers: ["G1"], options: [O("seeker", "Student searching for a room now"), O("mover", "Student with a room, but I may move"), O("leaver", "Student leaving (e.g. on exchange) who wants to sublet"), O("incoming", "Incoming exchange student"), O("phd", "PhD candidate / researcher"), O("landlord", "Private landlord / owner"), O("manager", "Agent or property manager"), O("other", "Other")] },
  { id: "inst", section: "A · About you", type: "single", only: "student", prompt: "Where do you study or work?", covers: ["G1"], options: [O("rug", "University of Groningen (RUG)"), O("hanze", "Hanze University of Applied Sciences"), O("other", "Other institution in Groningen")] },
  { id: "origin", section: "A · About you", type: "single", only: "student", prompt: "Where did you live before coming to Groningen?", help: "Used only to see whether the product works equally for everyone.", covers: ["G1", "G5"], options: [O("nl", "The Netherlands"), O("eu", "EU / EEA / Switzerland"), O("non", "Outside the EU")] },
  { id: "situation", section: "A · About you", type: "single", only: "student", prompt: "Where are you sleeping tonight?", covers: ["G1"], options: [O("stable", "In a room I rent here"), O("temp", "Temporary (friend, hostel, hotel, short-stay)"), O("abroad", "Not in Groningen yet — searching from abroad"), O("commuting", "At family / commuting from outside the city")] },
  // B. Search
  { id: "platforms", section: "B · Your search", type: "multi", prompt: "Which of these have you used to find or advertise a room? (all that apply)", covers: ["G2"], options: [O("kamernet", "Kamernet"), O("facebook", "Facebook groups"), O("pararius", "Pararius"), O("housinganywhere", "HousingAnywhere"), O("roomnl", "Room.nl"), O("whatsapp", "WhatsApp / word of mouth"), O("assoc", "Student association"), O("uni", "University / Hanze housing office"), O("none", "None yet")] },
  { id: "weeks", section: "B · Your search", type: "single", only: "student", prompt: "How long did your last search take (or how long have you been searching)?", covers: ["Q2"], options: [O("lt2", "Under 2 weeks"), O("2-4", "2–4 weeks"), O("5-8", "5–8 weeks"), O("9-16", "9–16 weeks"), O("gt16", "More than 16 weeks"), O("notstarted", "Not started")] },
  { id: "apps", section: "B · Your search", type: "single", only: "student", prompt: "Roughly how many applications or messages did you send in your busiest month?", covers: ["Q2"], options: [O("0-5", "0–5"), O("6-15", "6–15"), O("16-30", "16–30"), O(">30", "More than 30"), O("none", "None")] },
  { id: "budget", section: "B · Your search", type: "single", only: "student", prompt: "What is your maximum monthly rent, all-in?", covers: ["G2"], options: [O("lt450", "Under €450"), O("450-599", "€450–599"), O("600-749", "€600–749"), O("750-899", "€750–899"), O("gte900", "€900 or more")] },
  { id: "pains", section: "B · Your search", type: "max3", required: true, prompt: "Pick up to three: what hurts most in the Groningen room market?", covers: ["Q2", "Q3", "Q5", "G5"], options: [O("scams", "Scams or fake listings"), O("ghosting", "Landlords not replying"), O("competition", "Hundreds of applicants per room"), O("discrimination", "“No internationals” / language requirements"), O("unclear", "Not knowing how the landlord chose"), O("rentabove", "Rent above the legal maximum"), O("hospiteer", "Hospiteer evenings that feel like auditions"), O("fees", "Platform subscription fees"), O("shortstay", "Contracts that don't fit a semester"), O("info", "No information about the landlord")] },
  { id: "scam", section: "B · Your search", type: "single", required: true, prompt: "Have you come across a listing you think was fraudulent?", covers: ["Q3"], options: [O("never", "No"), O("avoided", "Yes — I spotted it and walked away"), O("lost_small", "Yes — I lost money (under €500)"), O("lost_large", "Yes — I lost €500 or more")] },
  { id: "rejected", section: "B · Your search", type: "single", only: "student", prompt: "Have you been turned down for a room without being told why?", covers: ["Q5", "G5"], options: [O("often", "Many times"), O("once", "Once or twice"), O("never", "Never"), O("na", "I haven't applied")] },
  // C. Concept
  { id: "usefulness", section: "C · The four ideas", type: "matrix", required: true, prompt: "Four ideas, one at a time. How useful would each be to you?", help: "1 = not useful, 5 = very useful. Idea 1 — a listing only goes live after owner, address, rent and photos are checked, with the result shown on the listing. Idea 2 — applicants are ordered by a published rule (registration time), capped at 10 live applications each, and every decline cites a reason. Idea 3 — residents choose their housemate, but only among an equal pool, after 20-minute identical meetings. Idea 4 — subletting and room swaps with the landlord's consent recorded in-app.", min: 1, max: 5, minLabel: "Not useful", maxLabel: "Very useful", covers: ["Q1", "Q2", "Q3", "Q4", "Q5"], rows: [O("verify", "1 · Verified listings (owner, address, photos, rent)"), O("queue", "2 · Published queue + 10-application cap + reasons for every decline"), O("hospiteer", "3 · Fair housemate choice (equal pool, same meeting for everyone)"), O("sublet", "4 · Sublet and swap with landlord consent")] },
  { id: "alloc", section: "C · The four ideas", type: "single", required: true, prompt: "A room gets 100 applicants. Which way of choosing would you consider fairest?", covers: ["Q2", "G5"], options: [O("landlord", "The landlord chooses freely"), O("fcfs", "First come, first served"), O("registration", "Longest-registered applicant first (published rule)"), O("lottery", "Random draw among eligible applicants"), O("residents", "Residents choose among 15 pre-selected, after meeting them")] },
  { id: "cap", section: "C · The four ideas", type: "single", only: "student", prompt: "To stop mass-applying, each student could hold 10 live applications at a time. How do you feel about that?", covers: ["Q2"], options: [O("fine", "Fine — I'd never use more"), O("more", "I'd want 15–20"), O("hate", "I'd hate it"), O("noopinion", "No opinion")] },
  { id: "commit", section: "C · The four ideas", type: "single", only: "student", prompt: "To be shortlisted you'd place a €5–10 commitment, refunded when you attend the meeting. Would you?", covers: ["Q2", "G2"], options: [O("yes", "Yes"), O("ifrefund", "Only if the refund is automatic"), O("no", "No")] },
  { id: "ai", section: "C · The four ideas", type: "matrix", required: true, prompt: "How comfortable are you with the following? (1 = not at all, 5 = fully)", min: 1, max: 5, minLabel: "Not at all", maxLabel: "Fully", covers: ["Q1", "G4"], rows: [O("checks", "Automated checks of listings (ownership, address, photos)"), O("rank", "An AI ranking or scoring applicants as people")] },
  { id: "idmethod", section: "C · The four ideas", type: "multi", prompt: "Which identity checks would you accept? (all that apply)", help: "We never store passports or ID documents — only a yes/no attestation from the issuer.", covers: ["G4"], options: [O("idin", "iDIN (via my bank)"), O("digid", "DigiD"), O("eduid", "eduID / university login"), O("passport", "Uploading a passport"), O("none", "None of these")] },
  { id: "sublet_ok", section: "C · The four ideas", type: "scale", min: 1, max: 5, minLabel: "No way", maxLabel: "Completely fine", prompt: "Subletting would need your landlord's written consent and a 48-hour wait before publishing. How acceptable is that?", only: "student", covers: ["Q4"] },
  { id: "landlord_pay", section: "C · The four ideas", type: "single", only: "landlord", prompt: "What would you pay per unit per month for screening, compliance and defensible selection records?", covers: ["G3"], options: [O("none", "Nothing"), O("0-10", "€1–10"), O("10-30", "€10–30"), O("gt30", "More than €30")] },
  { id: "landlord_queue", section: "C · The four ideas", type: "scale", min: 1, max: 5, minLabel: "Never", maxLabel: "Gladly", only: "landlord", prompt: "Would you accept a published selection order (instead of choosing from every applicant yourself) if it came with verified tenants?", covers: ["G3", "Q2"] },
  // D. Adoption
  { id: "intent", section: "D · Would you use it", type: "scale", required: true, min: 0, max: 10, minLabel: "Not at all likely", maxLabel: "Extremely likely", prompt: "How likely are you to use this platform for your next room (or listing)?", covers: ["G2"] },
  { id: "barrier", section: "D · Would you use it", type: "single", required: true, prompt: "What is the biggest thing that would stop you?", covers: ["G2", "G3", "G4"], options: [O("supply", "Not enough rooms on it"), O("landlord_adoption", "The landlords I want aren't on it"), O("privacy", "Privacy / data security"), O("verification", "I doubt the verification is reliable"), O("existing", "I prefer my current platforms and network"), O("none", "Nothing")] },
  { id: "switch", section: "D · Would you use it", type: "multi", prompt: "What would make you switch from what you use now? (all that apply)", covers: ["G2"], options: [O("partner", "Endorsed by RUG / Hanze / the municipality"), O("landlords_here", "Seeing good rooms I can't find elsewhere"), O("friends", "My friends or housemates using it"), O("free_forever", "A written promise that it's free for students"), O("verified_proof", "Being able to see exactly what was checked"), O("cheaper", "Lower prices than the alternatives")] },
  { id: "pay", section: "D · Would you use it", type: "single", only: "student", prompt: "If students had to pay something for a premium feature, what is the most you'd pay per month?", covers: ["G2"], options: [O("free", "Nothing — free only"), O("le3", "Up to €3"), O("le5", "Up to €5"), O("le10", "Up to €10")] },
  { id: "voucher", section: "D · Would you use it", type: "single", prompt: "Whose backing would make you trust the verification most?", covers: ["Q3", "Q5"], options: [O("uni", "The university / Hanze"), O("gsb", "Groningen Student Union (GSb)"), O("muni", "The municipality"), O("independent", "An independent auditor with public logs"), O("platform", "The platform itself")] },
  { id: "heard", section: "D · Would you use it", type: "multi", prompt: "Where would you most likely hear about it? (all that apply)", covers: ["G2"], options: [O("whatsapp", "WhatsApp groups"), O("facebook", "Facebook housing groups"), O("intl_office", "International office / Hanze welcome pack"), O("insta", "Instagram / TikTok"), O("gsb", "GSb / student union"), O("assoc", "Student association")] },
  { id: "comment", section: "D · Would you use it", type: "text", prompt: "Anything else — what would you change? (optional; we read it, but it is never scored)" },
];
export const V2_SECTIONS = Array.from(new Set(V2.map((q) => q.section)));

export function isVisible(q: Question, a: Answers) {
  if (!q.only) return true;
  const role = a.role as string | undefined;
  if (q.only === "student") return !role || STUDENT_ROLES.includes(role);
  return role === "landlord" || role === "manager";
}

/* ───────────────────────── Coverage analysis: does the survey capture the build? ───────────────────────── */
export type Cov = "full" | "partial" | "none";
export interface CoverageRow { id: string; area: string; why: string; v1: Cov; v1note: string; v2: Cov; v2qs: string[] }
export const COVERAGE: CoverageRow[] = [
  { id: "Q1", area: "Housemate choice without personality scoring", why: "Spec Q1 — hospiteer instead of matching", v1: "none", v1note: "Pitches “AI-powered matching” — the opposite of the build.", v2: "full", v2qs: ["usefulness.hospiteer", "ai.rank"] },
  { id: "Q2", area: "Fair allocation: queue, cap, lottery", why: "Spec Q2 / Q3 — 200 applicants → 10, mass-applying", v1: "partial", v1note: "Only “too many applicants” as a pain option.", v2: "full", v2qs: ["apps", "weeks", "alloc", "cap", "commit", "usefulness.queue"] },
  { id: "Q3", area: "Fraud exposure and trust in verification", why: "Spec Q3 — verification of supply is the product", v1: "partial", v1note: "Yes/no on fraud; no severity, no money lost, no trust question.", v2: "full", v2qs: ["scam", "pains", "voucher", "usefulness.verify"] },
  { id: "Q4", area: "Sublet / exchange demand and consent", why: "Spec Q4 — the concept promises it", v1: "none", v1note: "Mentioned in the pitch, never asked.", v2: "full", v2qs: ["usefulness.sublet", "sublet_ok", "role"] },
  { id: "Q5", area: "Transparency: reasons for every decline", why: "Spec Q5 — refusal log, reason codes", v1: "partial", v1note: "“Transparent application status” is one of six single-choice options.", v2: "full", v2qs: ["rejected", "pains.unclear", "voucher"] },
  { id: "G1", area: "Segment: RUG / Hanze / international / exchange", why: "Groningen has two institutions and very different cohorts", v1: "none", v1note: "No institution, no origin, no housing situation — results cannot be cut.", v2: "full", v2qs: ["role", "inst", "origin", "situation"] },
  { id: "G2", area: "Willingness to switch and to pay", why: "Cold-start: students follow supply, supply follows students", v1: "partial", v1note: "One free-text field at the end, after fatigue.", v2: "full", v2qs: ["intent", "barrier", "switch", "pay", "heard", "platforms", "budget"] },
  { id: "G3", area: "Landlord-side adoption and willingness to pay", why: "Spec §1.4 — landlords and municipalities pay", v1: "none", v1note: "Landlords see the same student questions.", v2: "partial", v2qs: ["landlord_pay", "landlord_queue"] },
  { id: "G4", area: "Privacy: which ID checks people accept", why: "Spec W6 — attestations, never documents", v1: "partial", v1note: "“Privacy protection” as one option; no ID-method question.", v2: "full", v2qs: ["idmethod", "ai.checks", "barrier"] },
  { id: "G5", area: "Experience of discrimination and unexplained rejection", why: "57% of internationals report exclusion (LSVb, spec §16)", v1: "none", v1note: "Not in the option list, so it hides under “Other”.", v2: "full", v2qs: ["pains.discrimination", "rejected", "alloc"] },
];
export const covScore = (rows: CoverageRow[], v: "v1" | "v2") => rows.reduce((s, r) => s + (r[v] === "full" ? 1 : r[v] === "partial" ? 0.5 : 0), 0);

export interface Finding { sev: "high" | "medium" | "low"; title: string; detail: string; fix: string }
export const V1_FINDINGS: Finding[] = [
  { sev: "high", title: "It pitches a product the build refuses to be", detail: "The concept paragraph says “AI would help match tenants with suitable housing”. The safe-house spec forbids personality/fit scoring (W1) and the phrase “AI-powered matching” (copy deck). Respondents are rating a different product.", fix: "Describe the four real ideas in neutral words and ask about AI explicitly as a separate comfort question." },
  { sev: "high", title: "No segmentation, so the headline number is meaningless", detail: "No institution, origin, housing situation or budget. A 4.1 average could be all Dutch commuters — or all desperate newcomers. These groups need different things.", fix: "Four demographic questions up front, with a stated purpose." },
  { sev: "high", title: "Five of the five core questions are untested", detail: "Hospiteer, the published queue, the 10-application cap, sublet consent and reasons-for-declines are never asked. The survey cannot confirm or kill any core design decision.", fix: "Matrix of the four ideas + allocation-fairness, cap, commitment and consent questions." },
  { sev: "medium", title: "“Most valuable feature” mixes unlike things", detail: "“Free” is a price, “verified” is a safeguard, “AI matching” is a method. Single choice forces a false trade-off and produces share-of-mentions, not priorities.", fix: "Rate each idea 1–5; use ranking only for pains (pick up to 3)." },
  { sev: "medium", title: "Leading, unanchored likelihood scale", detail: "1–5 with only endpoints labelled, asked after a positive pitch. Intent is inflated and cannot be compared to real conversion.", fix: "0–10 scale, asked after the barriers, followed by the single biggest blocker." },
  { sev: "medium", title: "Landlords get the student questionnaire", detail: "“How many applications did you send?” makes no sense to a landlord, and the landlord side is where the money is.", fix: "Branch landlords to willingness-to-pay and queue-acceptance questions." },
  { sev: "medium", title: "Known Groningen pains are missing from the options", detail: "Rent above the legal maximum, “no internationals” listings, hospiteer evenings, Room.nl and short-stay contracts are absent, so they collapse into “Other”.", fix: "Add them as explicit options (our simulated run shows how much hides in “Other”)." },
  { sev: "low", title: "Fraud is yes/no with an optional essay", detail: "No money-lost severity and no channel, so it cannot size the harm that justifies the product.", fix: "Four-level outcome question (never / avoided / lost <€500 / lost ≥€500)." },
  { sev: "low", title: "Role mixes time frames", detail: "“looking / previously looked” merges the current searcher with someone who housed in 2023.", fix: "Ask where they sleep tonight." },
  { sev: "low", title: "Strengths worth keeping", detail: "Anonymous, short, plain language, required fields only where needed. Keep the tone; v2 is ~6–7 minutes with branching.", fix: "Keep the intro; add a progress bar." },
];

/* ───────────────────────── Persona response model ───────────────────────── */
const sample = <T extends string>(rnd: Rng, ws: [T, number][]): T => { const tot = ws.reduce((s, [, w]) => s + Math.max(0, w), 0); let r = rnd() * tot; for (const [v, w] of ws) { r -= Math.max(0, w); if (r <= 0) return v; } return ws[ws.length - 1][0]; };
const topK = <T extends string>(rnd: Rng, ws: [T, number][], k: number): T[] => { const pool = ws.map(([v, w]) => [v, w] as [T, number]); const out: T[] = []; while (out.length < k && pool.length) { const v = sample(rnd, pool); out.push(v); pool.splice(pool.findIndex(([x]) => x === v), 1); } return out; };
const lik = (x: number, lo: number, hi: number) => Math.round(clamp(x, lo, hi));

const OPENERS: Record<string, string[]> = {
  intl_incoming: ["I land in August and have nothing arranged.", "I can't view rooms from India, so I have to trust listings blindly."],
  eu_rug: ["I've messaged forty landlords and got four replies.", "Searching from Berlin in the evenings is exhausting."],
  nl_rug: ["I'd rather not rely on my parents' friends to find a room.", "Room.nl never works for me, Facebook is chaos."],
  nl_hanze: ["I just want a fair chance at a normal-priced room.", "Hanze students get treated like second choice at hospiteer evenings."],
  hanze_intl: ["Housing is the hardest part of studying here on a tight budget.", "Agencies charge fees before I even see a room."],
  exchange_in: ["Landlords want twelve months and I need five.", "Short stays are basically impossible to find."],
  outbound_sublet: ["I'd love to sublet my room but my landlord never answers.", "Leaving for exchange without losing my room would be amazing."],
  phd: ["I need somewhere quiet near the lab for four years.", "Rent above the legal maximum is normal here and nobody tells you."],
  mover: ["Our landlord isn't renewing and we're back at zero.", "I want to move without starting from scratch."],
  assoc_insider: ["Honestly my network got me my room.", "The association circuit works, but it isn't fair to everyone."],
  hustler: ["I apply to everything within minutes; speed is the only edge you have.", "Caps would just push me to find another workaround."],
  landlord_private: ["I get 200 replies and can't read them all.", "I want reliable tenants without drowning in paperwork."],
  landlord_pro: ["The new landlord rules mean I need records I can defend.", "Reach isn't my problem — screening and compliance are."],
  agent: ["Mandates and compliance take half my week.", "Two hundred replies per listing is not a workflow."],
};
const PAINLINE: Record<string, string> = {
  scams: "Scams are what scare me most.", ghosting: "Landlords just stop replying.", competition: "Hundreds of people for one room is exhausting.", discrimination: "“No internationals” in listings is more common than people admit.",
  unclear: "Nobody tells you how they chose.", rentabove: "Rents are way above what's legally allowed.", hospiteer: "Hospiteer evenings feel like auditions.", fees: "Subscription fees add up fast.", shortstay: "Contracts never fit a semester.", info: "You know nothing about the landlord until you pay.",
};
const BARRIERLINE: Record<string, string> = {
  supply: "It only works if there are enough rooms on it.", landlord_adoption: "The landlords I actually want need to be on it.", privacy: "I'd want to know exactly what data you keep.", verification: "Show me what “verified” really means.", existing: "I'd probably stay with my current groups.", none: "I'd just try it.",
};
const FRAUD_STORIES = [
  "Asked for a €300 deposit before a viewing; landlord was “abroad”.", "Photos were from a different city; address didn't exist.", "Price far below market and pressure to decide today.", "Listing used someone else's name; contract was a PDF with no signatures.",
  "Wanted payment via gift cards.", "Asked for a copy of my passport on WhatsApp before any viewing.", "Same room posted by three different “owners”.", "Landlord refused video call and asked for money transfer.",
];

export interface SurveyPair { v1: Answers; v2: Answers }
export function answerBoth(p: Persona): SurveyPair {
  const rnd = mulberry32(hashStr("survey:" + p.id));
  const t = p.traits;
  const nonNL = p.cohort !== "NL";
  const landlord = p.role === "landlord";
  const a = p.archetype;
  const ns = () => normal(rnd, 0, 1);

  // role
  const role = ((): string => {
    if (a === "exchange_in") return "incoming";
    if (a === "outbound_sublet") return "leaver";
    if (a === "phd") return "phd";
    if (a === "mover" || a === "assoc_insider") return rnd() < 0.7 ? "mover" : "seeker";
    if (a === "agent") return "manager";
    if (a === "landlord_pro") return rnd() < 0.35 ? "manager" : "landlord";
    if (a === "landlord_private") return "landlord";
    return rnd() < 0.04 ? "other" : "seeker";
  })();

  const situation = landlord ? undefined : sample(rnd, role === "mover" || role === "leaver" ? [["stable", 9], ["temp", 0.5], ["commuting", 0.5], ["abroad", 0]] : [["stable", 0.3], ["temp", 1 + 3 * t.urgency * (nonNL ? 1.2 : 0.5)], ["abroad", nonNL ? 3 * t.urgency ** 2 : 0], ["commuting", p.cohort === "NL" ? 2.5 - 1.5 * t.urgency : 0.3]]);

  // platforms
  const plat: string[] = [];
  const chance = (pr: number) => rnd() < clamp(pr, 0, 0.97);
  if (chance(0.62 + 0.1 * t.urgency)) plat.push("kamernet");
  if (chance(0.5 + (nonNL ? 0.1 : 0.05) + 0.1 * t.urgency)) plat.push("facebook");
  if (chance(0.28 + (nonNL ? 0.15 : 0))) plat.push("pararius");
  if (chance(0.08 + (p.cohort === "NON" ? 0.35 : 0) + (a === "exchange_in" ? 0.35 : 0))) plat.push("housinganywhere");
  if (chance(p.cohort === "NL" ? 0.3 : 0.08)) plat.push("roomnl");
  if (chance(0.15 + 0.6 * t.network)) plat.push("whatsapp");
  if (chance(t.network > 0.7 ? 0.6 : 0.04)) plat.push("assoc");
  if (chance(0.15 + (nonNL ? 0.3 : 0.05))) plat.push("uni");
  if (!plat.length) plat.push(a === "exchange_in" || t.urgency < 0.2 ? "none" : "kamernet");
  if (landlord) { plat.length = 0; if (chance(0.55)) plat.push("kamernet"); if (chance(0.35)) plat.push("pararius"); if (chance(0.3)) plat.push("facebook"); if (chance(0.4)) plat.push("whatsapp"); if (!plat.length) plat.push("whatsapp"); }

  // search intensity
  const intensity = t.urgency * 16 + (p.cohort === "NON" ? 6 : 0) + ns() * 7 + (a === "hustler" ? 40 : 0);
  const apps = landlord ? "none" : a === "outbound_sublet" || (a === "mover" && rnd() < 0.3) ? (intensity < 5 ? "0-5" : "6-15") : intensity <= 5 ? "0-5" : intensity <= 15 ? "6-15" : intensity <= 30 ? "16-30" : ">30";
  const wk = 1 + t.urgency * 11 + ns() * 3;
  const weeks = landlord ? undefined : role === "mover" || role === "leaver" ? sample(rnd, [["notstarted", 4], ["lt2", 2], ["2-4", 2]]) : wk < 2 ? "lt2" : wk < 4.5 ? "2-4" : wk < 8 ? "5-8" : wk < 14 ? "9-16" : "gt16";
  const bud = p.budgetEur;
  const budget = bud < 450 ? "lt450" : bud < 600 ? "450-599" : bud < 750 ? "600-749" : bud < 900 ? "750-899" : "gte900";

  // pains
  const pains = landlord
    ? topK(rnd, [["competition", 3], ["unclear", 1.2], ["scams", 1.6], ["info", 2.2], ["ghosting", 1.3], ["rentabove", 0.9]], 3)
    : topK(rnd, [
        ["scams", 1 + 3 * t.scam], ["ghosting", 1.6 + 1.2 * t.urgency], ["competition", 1.4 + 1.5 * t.urgency], ["discrimination", nonNL ? 0.8 + 2 * t.fairness : 0.15],
        ["unclear", 0.7 + 1.5 * t.fairness], ["rentabove", 0.8 + 1.2 * t.priceSens], ["hospiteer", 0.5 + (p.cohort === "NL" ? 0.6 : 0.3) + 0.4 * (1 - t.network)], ["fees", 0.4 + 1.4 * t.priceSens],
        ["shortstay", a === "exchange_in" || a === "phd" ? 2.6 : 0.3], ["info", 0.8 + 1.2 * t.scam],
      ], 3);

  const seenP = clamp(0.18 + 0.6 * t.scam + (p.cohort === "NON" ? 0.12 : 0), 0.05, 0.95);
  const r0 = rnd();
  const scam = r0 < seenP * 0.1 ? "lost_large" : r0 < seenP * 0.3 ? "lost_small" : r0 < seenP ? "avoided" : "never";
  const rejected = landlord ? undefined : apps === "none" || apps === "0-5" && rnd() < 0.5 ? "na" : rnd() < 0.15 + 0.5 * t.urgency + (nonNL ? 0.15 : 0) ? "often" : rnd() < 0.6 ? "once" : "never";

  // usefulness
  const u = (x: number) => lik(x + ns() * 0.55, 1, 5);
  const usefulness: Record<string, number> = landlord
    ? { verify: u(3.2 + t.scam), queue: u(2.9 + 0.8 * t.fairness - 0.5 * t.skeptic), hospiteer: u(3.1), sublet: u(2.6) }
    : {
        verify: u(3.1 + 1.7 * t.scam + 0.3 * t.urgency), queue: u(2.7 + 1.6 * t.fairness - 1.1 * t.network - (a === "hustler" ? 1.4 : 0)),
        hospiteer: u(3.0 + 0.8 * t.fairness - 0.7 * t.skeptic - (a === "exchange_in" ? 0.5 : 0)), sublet: u(role === "leaver" ? 4.6 : role === "incoming" ? 4.2 : role === "mover" ? 3.5 : 2.9 + 0.5 * t.urgency),
      };
  const alloc = sample(rnd, landlord
    ? [["landlord", 3.5], ["fcfs", 0.9], ["registration", 0.8], ["lottery", 0.3], ["residents", 1.2]]
    : [["landlord", 0.25 + 0.4 * t.network], ["fcfs", 0.9 + t.urgency + (a === "hustler" ? 2.5 : 0)], ["registration", 0.8 + 1.4 * t.fairness - 0.4 * t.network], ["lottery", 0.45 + 0.9 * t.fairness * (nonNL ? 1.3 : 0.7)], ["residents", 0.9 + 0.9 * t.network]]);
  const cap = landlord ? undefined : sample(rnd, [["fine", 3.2 - (a === "hustler" ? 3 : 0)], ["more", 1.2 + t.urgency], ["hate", 0.3 + (a === "hustler" ? 4 : 0) + 0.4 * t.skeptic], ["noopinion", 0.9]]);
  const commit = landlord ? undefined : sample(rnd, [["yes", 1.1 + 0.5 * (1 - t.priceSens)], ["ifrefund", 2.0 - 0.4 * t.priceSens], ["no", 0.5 + 1.8 * t.priceSens * (nonNL ? 0.8 : 1)]]);
  const ai = { checks: lik(3.1 + 1.0 * t.aiTrust + 0.6 * t.tech - 0.7 * t.privacy + ns() * 0.6, 1, 5), rank: lik(1.7 + 1.9 * t.aiTrust - 1.0 * t.privacy - 0.5 * t.fairness + ns() * 0.6, 1, 5) };
  const idm: string[] = [];
  if (chance(0.5 + (p.cohort === "NL" ? 0.3 : 0))) idm.push("idin");
  if (chance(p.cohort === "NL" ? 0.65 : 0.04)) idm.push("digid");
  if (chance(p.inst === "None" ? 0.05 : 0.5)) idm.push("eduid");
  if (chance(0.5 - 0.6 * t.privacy + 0.15)) idm.push("passport");
  if (!idm.length) idm.push("none");
  const sublet_ok = landlord ? undefined : lik((role === "leaver" ? 4.0 : 3.3) + 0.4 * t.fairness - 0.5 * t.skeptic + ns() * 0.8, 1, 5);
  const landlord_pay = !landlord ? undefined : sample(rnd, a === "landlord_pro" || a === "agent" ? [["none", 1.5], ["0-10", 1.5], ["10-30", 5], ["gt30", 2]] : [["none", 3.5], ["0-10", 4], ["10-30", 2], ["gt30", 0.5]]);
  const landlord_queue = !landlord ? undefined : lik(2.9 + 0.8 * (a === "landlord_pro" ? 1 : 0) + (1 - t.skeptic) * 0.8 + ns() * 0.9, 1, 5);

  // intent: v2 evaluates the real concept; v1 evaluates a concept that includes "AI matching" and no specifics
  const base = landlord
    ? 0.34 + 0.2 * t.scam + 0.12 * t.tech - 0.22 * t.skeptic + (a === "landlord_pro" || a === "agent" ? 0.15 : 0)
    : 0.4 + 0.22 * t.urgency + 0.18 * t.scam + 0.1 * t.fairness - 0.22 * t.network - 0.16 * t.skeptic + (p.cohort === "NON" ? 0.05 : 0) - (a === "hustler" ? 0.15 : 0);
  const intent = lik(10 * base + ns() * 1.4 + 1.3, 0, 10);
  const v1likely = lik(1 + 4 * (base + 0.16 - 0.2 * (1 - t.aiTrust) - 0.1 * t.privacy) + ns() * 0.5, 1, 5);

  const barrier = sample(rnd, [["supply", 2.2 + 0.6 * t.urgency], ["landlord_adoption", 1.5 + (landlord ? 0 : 0.6)], ["privacy", 0.7 + 1.9 * t.privacy], ["verification", 0.9 + 1.4 * t.skeptic], ["existing", 0.5 + 1.8 * t.network + 0.5 * t.skeptic], ["none", 0.4 + 0.8 * (1 - t.skeptic)]]);
  const sw: string[] = [];
  if (chance(0.4 + (nonNL ? 0.25 : 0) + 0.1 * t.skeptic)) sw.push("partner");
  if (chance(0.5 + 0.1 * t.urgency)) sw.push("landlords_here");
  if (chance(0.15 + 0.6 * t.network)) sw.push("friends");
  if (chance(0.3 + 0.5 * t.priceSens)) sw.push("free_forever");
  if (chance(0.25 + 0.5 * t.scam)) sw.push("verified_proof");
  if (chance(0.15 + 0.5 * t.priceSens)) sw.push("cheaper");
  if (!sw.length) sw.push("landlords_here");
  const pay = landlord ? undefined : sample(rnd, [["free", 0.5 + 1.6 * t.priceSens], ["le3", 1.1], ["le5", 0.6 + 0.3 * (1 - t.priceSens)], ["le10", 0.15 + 0.3 * (1 - t.priceSens) * t.urgency]]);
  const voucher = sample(rnd, [["uni", 1.6 + (nonNL ? 1 : 0)], ["gsb", 0.8 + 0.5 * t.fairness], ["muni", 0.9], ["independent", 0.7 + 1.1 * t.skeptic], ["platform", 0.25]]);
  const heard: string[] = [];
  if (chance(0.3 + 0.45 * t.network)) heard.push("whatsapp");
  if (chance(0.5)) heard.push("facebook");
  if (chance(nonNL ? 0.5 : 0.1)) heard.push("intl_office");
  if (chance(0.15 + 0.3 * t.tech)) heard.push("insta");
  if (chance(0.25 + 0.2 * t.fairness)) heard.push("gsb");
  if (chance(t.network > 0.6 ? 0.45 : 0.06)) heard.push("assoc");
  if (!heard.length) heard.push("whatsapp");

  const pick1 = (xs: string[]) => xs[Math.floor(rnd() * xs.length)];
  const comment = rnd() < (landlord ? 0.7 : 0.55)
    ? `${pick1(OPENERS[a])} ${PAINLINE[pains[0]]} ${BARRIERLINE[barrier]}`
    : "";

  const v2: Answers = {
    role, ...(landlord ? {} : { inst: p.inst === "RUG" ? "rug" : "hanze", origin: p.cohort.toLowerCase(), situation: situation! }),
    platforms: plat, ...(landlord ? {} : { weeks: weeks!, apps, budget }), pains, scam, ...(landlord ? {} : { rejected: rejected! }),
    usefulness, alloc, ...(landlord ? {} : { cap: cap!, commit: commit! }), ai, idmethod: idm,
    ...(landlord ? { landlord_pay: landlord_pay!, landlord_queue: landlord_queue! } : { sublet_ok: sublet_ok! }),
    intent, barrier, switch: sw, ...(landlord ? {} : { pay: pay! }), voucher, heard, ...(comment ? { comment } : {}),
  };

  // v1 answers (same person, different instrument)
  const v1plat = Array.from(new Set(plat.map((x) => (["kamernet", "facebook", "pararius", "housinganywhere", "uni", "none"].includes(x) ? x : "other"))));
  const mapPain: Record<string, string> = { scams: "scams", competition: "competition", ghosting: "unresponsive", fees: "subscriptions", info: "transparency", unclear: "suitable", discrimination: "other", rentabove: "other", hospiteer: "other", shortstay: "suitable" };
  const diff = Array.from(new Set(pains.map((x) => mapPain[x])));
  if (rnd() < 0.35) diff.push(sample(rnd, [["competition", 2], ["suitable", 2], ["unresponsive", 1.5], ["scams", 1]]));
  const v1d = Array.from(new Set(diff));
  const v1feature = sample(rnd, [["verified", 1.8 + 2 * t.scam], ["ai", 0.5 + 1.5 * t.aiTrust * t.tech], ["privacy", 0.6 + 1.6 * t.privacy], ["free", 0.8 + 2 * t.priceSens], ["transparent", 0.9 + 1.3 * t.fairness], ["other", 0.12]]);
  const v1concern = sample(rnd, [["supply", 2.1], ["privacy", 1 + 2 * t.privacy], ["trustAI", 0.7 + 2.6 * (1 - t.aiTrust)], ["verification", 0.9 + 1.3 * t.skeptic], ["existing", 0.5 + 1.6 * t.network], ["none", 0.5], ["other", 0.2]]);
  const sawFraud = scam !== "never";
  const v1: Answers = {
    v1_role: landlord ? "landlord" : role === "leaver" || (role === "mover" && rnd() < 0.3) ? "sublettor" : role === "other" ? "other" : "seeker",
    v1_platforms: v1plat, v1_difficulties: v1d, v1_apps: apps, v1_fraud: sawFraud ? "yes" : "no",
    ...(sawFraud && rnd() < 0.55 ? { v1_fraud_text: pick1(FRAUD_STORIES) } : {}),
    v1_feature: v1feature, v1_likely: v1likely, v1_concern: v1concern,
    ...(rnd() < 0.4 ? { v1_convince: sw.includes("partner") ? "If the university backs it." : sw.includes("free_forever") ? "That it stays free." : sw.includes("friends") ? "If my friends use it." : "Good rooms I can't find elsewhere." } : {}),
  };
  return { v1, v2 };
}

/* ───────────────────────── Aggregation helpers ───────────────────────── */
export interface ResponseRow { id: number | string; personaId: string | null; source: string; version: string; answers: Answers }
export function tally(rows: { answers: Answers }[], qid: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const a = r.answers[qid];
    if (a === undefined) continue;
    if (Array.isArray(a)) a.forEach((x) => (out[x] = (out[x] ?? 0) + 1));
    else if (typeof a === "object") continue;
    else out[String(a)] = (out[String(a)] ?? 0) + 1;
  }
  return out;
}
export const answered = (rows: { answers: Answers }[], qid: string) => rows.filter((r) => r.answers[qid] !== undefined).length;
export function mean(xs: number[]) { return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0; }
export function numeric(rows: { answers: Answers }[], qid: string, sub?: string): number[] {
  return rows.map((r) => { const a = r.answers[qid]; if (sub) return typeof a === "object" && !Array.isArray(a) ? (a as Record<string, number>)[sub] : undefined; return typeof a === "number" ? a : undefined; }).filter((x): x is number => typeof x === "number");
}
export const optLabel = (qs: Question[], qid: string, oid: string) => qs.find((q) => q.id === qid)?.options?.find((o) => o.id === oid)?.label ?? oid;
