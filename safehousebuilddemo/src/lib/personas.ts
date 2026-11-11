// SIMULATION ONLY — never product data, never used to choose real people (spec §9.3 / §9.4).
// 262 synthetic Groningen personas that "fill out" the survey and populate the swarm. Deterministic (seeded).
import { mulberry32, pick, weighted, normal, clamp, type Rng } from "./rng";

export type ArchetypeKey =
  | "intl_incoming" | "eu_rug" | "nl_rug" | "nl_hanze" | "hanze_intl" | "exchange_in" | "outbound_sublet" | "phd" | "mover"
  | "landlord_private" | "landlord_pro" | "agent" | "hustler" | "assoc_insider";
export type ClusterKey = "rug_intl" | "rug_nl" | "hanze" | "short_stay" | "movers" | "supply" | "edge";

export interface Archetype {
  key: ArchetypeKey; label: string; weight: number; cluster: ClusterKey; role: "student" | "landlord";
  mean: { urgency: number; aiTrust: number; privacy: number; scam: number; fairness: number; tech: number; priceSens: number; network: number; skeptic: number };
}
const M = (urgency: number, aiTrust: number, privacy: number, scam: number, fairness: number, tech: number, priceSens: number, network: number, skeptic: number) => ({ urgency, aiTrust, privacy, scam, fairness, tech, priceSens, network, skeptic });
export const ARCHETYPES: Archetype[] = [
  { key: "intl_incoming", label: "Incoming non-EU newcomer (RUG)", weight: 15, cluster: "rug_intl", role: "student", mean: M(0.85, 0.55, 0.55, 0.8, 0.8, 0.7, 0.7, 0.1, 0.3) },
  { key: "eu_rug", label: "EU student (RUG)", weight: 11, cluster: "rug_intl", role: "student", mean: M(0.6, 0.55, 0.55, 0.5, 0.65, 0.7, 0.6, 0.25, 0.35) },
  { key: "nl_rug", label: "Dutch student (RUG)", weight: 15, cluster: "rug_nl", role: "student", mean: M(0.4, 0.5, 0.5, 0.25, 0.5, 0.6, 0.5, 0.55, 0.45) },
  { key: "nl_hanze", label: "Dutch student (Hanze)", weight: 13, cluster: "hanze", role: "student", mean: M(0.4, 0.45, 0.5, 0.2, 0.5, 0.55, 0.65, 0.5, 0.5) },
  { key: "hanze_intl", label: "International student (Hanze)", weight: 6, cluster: "hanze", role: "student", mean: M(0.75, 0.55, 0.5, 0.6, 0.75, 0.6, 0.8, 0.15, 0.35) },
  { key: "exchange_in", label: "Incoming exchange semester", weight: 8, cluster: "short_stay", role: "student", mean: M(0.9, 0.65, 0.45, 0.7, 0.6, 0.75, 0.6, 0.1, 0.25) },
  { key: "outbound_sublet", label: "Leaving on exchange — wants to sublet", weight: 7, cluster: "movers", role: "student", mean: M(0.3, 0.55, 0.5, 0.35, 0.6, 0.65, 0.55, 0.5, 0.4) },
  { key: "phd", label: "PhD candidate / researcher", weight: 4, cluster: "short_stay", role: "student", mean: M(0.55, 0.5, 0.6, 0.45, 0.6, 0.7, 0.4, 0.3, 0.5) },
  { key: "mover", label: "Housed, looking to move", weight: 7, cluster: "movers", role: "student", mean: M(0.35, 0.5, 0.5, 0.3, 0.5, 0.6, 0.55, 0.55, 0.5) },
  { key: "assoc_insider", label: "Association member (relies on network)", weight: 4, cluster: "rug_nl", role: "student", mean: M(0.3, 0.45, 0.55, 0.3, 0.5, 0.55, 0.45, 0.9, 0.65) },
  { key: "hustler", label: "Mass-applier (uses AI tools)", weight: 2.5, cluster: "edge", role: "student", mean: M(0.6, 0.9, 0.3, 0.5, 0.2, 0.95, 0.7, 0.3, 0.3) },
  { key: "landlord_private", label: "Private landlord", weight: 5, cluster: "supply", role: "landlord", mean: M(0.3, 0.35, 0.7, 0.4, 0.35, 0.4, 0.2, 0.5, 0.65) },
  { key: "landlord_pro", label: "Professional landlord (B.V.)", weight: 2.5, cluster: "supply", role: "landlord", mean: M(0.2, 0.55, 0.5, 0.3, 0.4, 0.7, 0.2, 0.5, 0.5) },
  { key: "agent", label: "Agent / makelaar", weight: 1.5, cluster: "supply", role: "landlord", mean: M(0.2, 0.6, 0.4, 0.2, 0.3, 0.75, 0.2, 0.6, 0.5) },
];
export const ARCH: Record<ArchetypeKey, Archetype> = Object.fromEntries(ARCHETYPES.map((a) => [a.key, a])) as Record<ArchetypeKey, Archetype>;
export const CLUSTERS: Record<ClusterKey, { label: string; color: string }> = {
  rug_intl: { label: "RUG internationals", color: "#5b8def" },
  rug_nl: { label: "RUG Dutch & associations", color: "#4fa98b" },
  hanze: { label: "Hanze students", color: "#b58cf0" },
  short_stay: { label: "Exchange · PhD", color: "#e0b84e" },
  movers: { label: "Movers · sublettors", color: "#e08a5a" },
  supply: { label: "Landlords · agents", color: "#d6ae4a" },
  edge: { label: "Mass-appliers", color: "#e0607a" },
};

interface Country { name: string; cohort: "EU" | "NON"; first: string[]; last: string[]; w: number }
const COUNTRIES: Country[] = [
  { name: "India", cohort: "NON", first: ["Aarav", "Priya", "Ananya", "Rohan", "Meera", "Kabir"], last: ["Sharma", "Nair", "Iyer", "Patel", "Menon"], w: 10 },
  { name: "China", cohort: "NON", first: ["Wei", "Mei", "Hao", "Xin", "Jia", "Lei"], last: ["Zhang", "Lin", "Chen", "Wang", "Liu"], w: 10 },
  { name: "Indonesia", cohort: "NON", first: ["Putri", "Budi", "Dewi", "Raka", "Sari"], last: ["Wijaya", "Santoso", "Pratama", "Hidayat"], w: 4 },
  { name: "Iran", cohort: "NON", first: ["Yasaman", "Reza", "Parisa", "Arman"], last: ["Hosseini", "Karimi", "Rahimi"], w: 4 },
  { name: "Nigeria", cohort: "NON", first: ["Chidi", "Ngozi", "Tunde", "Ada"], last: ["Okafor", "Adeyemi", "Eze"], w: 3 },
  { name: "Ghana", cohort: "NON", first: ["Kwame", "Abena", "Kofi", "Ama"], last: ["Mensah", "Boateng", "Owusu"], w: 2 },
  { name: "Turkey", cohort: "NON", first: ["Elif", "Mert", "Zeynep", "Can"], last: ["Demir", "Yilmaz", "Kaya"], w: 3 },
  { name: "Brazil", cohort: "NON", first: ["Lucas", "Beatriz", "Gabriel", "Camila"], last: ["Almeida", "Souza", "Costa"], w: 3 },
  { name: "Egypt", cohort: "NON", first: ["Omar", "Nour", "Yara", "Karim"], last: ["Hassan", "Mostafa", "Saleh"], w: 2 },
  { name: "Vietnam", cohort: "NON", first: ["Linh", "Minh", "Thao"], last: ["Nguyen", "Tran", "Pham"], w: 2 },
  { name: "USA", cohort: "NON", first: ["Emily", "Jordan", "Tyler", "Hannah"], last: ["Miller", "Brooks", "Carter"], w: 2 },
  { name: "Germany", cohort: "EU", first: ["Jonas", "Lena", "Felix", "Hanna", "Luca"], last: ["Becker", "Schmidt", "Fischer", "Weber"], w: 10 },
  { name: "Spain", cohort: "EU", first: ["Mateo", "Lucía", "Pablo", "Carmen"], last: ["García", "Fernández", "Ruiz"], w: 5 },
  { name: "Italy", cohort: "EU", first: ["Giulia", "Marco", "Chiara", "Matteo"], last: ["Rossi", "Bianchi", "Conti"], w: 5 },
  { name: "Greece", cohort: "EU", first: ["Nikos", "Eleni", "Dimitris"], last: ["Papadakis", "Georgiou"], w: 3 },
  { name: "Poland", cohort: "EU", first: ["Kasia", "Piotr", "Ola"], last: ["Nowak", "Kowalski", "Wójcik"], w: 4 },
  { name: "Romania", cohort: "EU", first: ["Andrei", "Ioana", "Mihai"], last: ["Popescu", "Ionescu"], w: 3 },
  { name: "France", cohort: "EU", first: ["Camille", "Hugo", "Léa"], last: ["Martin", "Dubois", "Moreau"], w: 3 },
  { name: "Bulgaria", cohort: "EU", first: ["Ivan", "Desislava", "Petar"], last: ["Ivanov", "Georgieva"], w: 2 },
];
const NL_FIRST = ["Daan", "Lotte", "Sanne", "Bram", "Fenna", "Joris", "Anouk", "Ruben", "Eva", "Thijs", "Noa", "Jesse", "Femke", "Sem", "Maaike", "Niels", "Isa", "Tim", "Roos", "Wouter", "Lieke", "Jelle", "Pien", "Gijs", "Merel"];
const NL_LAST = ["de Vries", "Bakker", "Visser", "Smit", "Meijer", "de Boer", "Mulder", "Kuipers", "Bos", "Vos", "Peters", "Hendriks", "Dekker", "Brouwer", "Jansen", "Wiersma", "Hoekstra", "Dijkstra", "Postma", "Zijlstra"];
const RUG_PROGRAMS = ["Law", "Economics & Business", "Psychology", "Medicine", "Computing Science", "Artificial Intelligence", "Physics", "Chemistry", "Biology", "Pharmacy", "International Relations", "Arts, Culture & Media", "History", "Philosophy", "Spatial Planning", "Mathematics", "Industrial Engineering"];
const HANZE_PROGRAMS = ["Architecture", "Nursing", "International Business", "Physiotherapy", "Mechanical Engineering", "Communication", "Media Design", "Social Work", "Applied Psychology", "Business IT", "Teacher Education", "Logistics"];

export interface Persona {
  id: string; name: string; archetype: ArchetypeKey; role: "student" | "landlord"; cluster: ClusterKey;
  inst: "RUG" | "Hanze" | "None"; program: string; level: "BA" | "MA" | "PhD" | "Exchange" | "—"; cohort: "NL" | "EU" | "NON"; country: string; age: number;
  budgetEur: number; guarantor: "family" | "institution" | "none"; monthsInGroningen: number; regMonths: number; portfolio?: number;
  traits: { urgency: number; aiTrust: number; privacy: number; scam: number; fairness: number; tech: number; priceSens: number; network: number; skeptic: number };
  bio: string; stakes: string;
}

const STAKES: Record<ArchetypeKey, string[]> = {
  intl_incoming: ["Lands at Schiphol on 21 Aug with a hostel booked for six nights and no contract.", "Visa conditions require proof of address within 30 days of arrival.", "Lost €400 to a fake Kamernet listing in June and is wary of every new platform."],
  eu_rug: ["Starts a master's in September and has already messaged 40 landlords.", "Shares a hostel dorm in the Binnenstad while searching.", "Searches from home in the evenings after work."],
  nl_rug: ["Lives with parents in Assen, commuting 50 minutes each way.", "Third year, wants to move out before thesis season.", "Has been on the Room.nl waiting list for 26 months."],
  nl_hanze: ["Rents from a landlord who keeps raising the price; wants out.", "First-year student; family can guarantee but cannot pay more than €500.", "Commutes from Emmen three days a week."],
  hanze_intl: ["On a tight budget, Hanze housing guarantee did not cover this semester.", "Sleeping on a friend's sofa in Korrewegwijk for three weeks."],
  exchange_in: ["Five-month exchange semester starts in February; landlords want 12-month leases.", "University partner housing is full; needs a room by 1 February."],
  outbound_sublet: ["Leaves for Lund in February and wants to keep the room for August.", "Landlord has never replied to the sublet request."],
  phd: ["Starts a four-year PhD at the Zernike campus; needs a quiet place near the lab.", "Partner joining in spring — room share is a stopgap."],
  mover: ["Housemates are moving out and the landlord is not renewing.", "Wants a quieter house closer to the library."],
  assoc_insider: ["Housed through the association network; has seen what happens to people without one.", "Thinks the 'old boys' room circuit is unfair but has benefited from it."],
  hustler: ["Uses a script to apply to every new Kamernet and Facebook listing within minutes.", "Has sent 300+ applications this autumn."],
  landlord_private: ["Rents out two rooms above a shop in the Binnenstad.", "Burned by a tenant who stopped paying; wants verification but hates paperwork.", "Inherited a house in Helpman and rents it room by room."],
  landlord_pro: ["Manages 38 rooms and fears the new Wet goed verhuurderschap audits.", "Needs defensible selection records, not more reach."],
  agent: ["Manages 120 units on behalf of owners, mandate paperwork is constant.", "Gets 200+ replies per listing and cannot read them all."],
};

export function generatePersonas(n = 262, seed = 20261112): Persona[] {
  const rnd: Rng = mulberry32(seed);
  const out: Persona[] = [];
  for (let i = 0; i < n; i++) {
    const a = weighted(rnd, ARCHETYPES.map((x) => [x, x.weight] as const));
    const nl = a.key === "nl_rug" || a.key === "nl_hanze" || a.key === "assoc_insider" || a.key === "landlord_private" || a.key === "landlord_pro" || a.key === "agent" || a.key === "mover" || a.key === "outbound_sublet";
    const forceIntl = a.key === "intl_incoming" || a.key === "hanze_intl" || a.key === "exchange_in";
    const dutch = forceIntl ? false : nl ? rnd() < 0.88 : a.key === "phd" ? rnd() < 0.2 : rnd() < 0.05;
    let country: Country | null = null;
    if (!dutch) {
      const pool = a.key === "eu_rug" ? COUNTRIES.filter((c) => c.cohort === "EU") : a.key === "intl_incoming" ? COUNTRIES.filter((c) => c.cohort === "NON") : COUNTRIES;
      country = weighted(rnd, pool.map((c) => [c, c.w] as const));
    }
    const cohort: Persona["cohort"] = dutch ? "NL" : country!.cohort;
    const name = dutch ? `${pick(rnd, NL_FIRST)} ${pick(rnd, NL_LAST)}` : `${pick(rnd, country!.first)} ${pick(rnd, country!.last)}`;
    const isLandlord = a.role === "landlord";
    const hanze = a.key === "nl_hanze" || a.key === "hanze_intl";
    const inst: Persona["inst"] = isLandlord ? "None" : hanze ? "Hanze" : a.key === "mover" || a.key === "outbound_sublet" ? (rnd() < 0.6 ? "RUG" : "Hanze") : a.key === "exchange_in" ? (rnd() < 0.7 ? "RUG" : "Hanze") : "RUG";
    const program = isLandlord ? "—" : pick(rnd, inst === "Hanze" ? HANZE_PROGRAMS : RUG_PROGRAMS);
    const level: Persona["level"] = isLandlord ? "—" : a.key === "phd" ? "PhD" : a.key === "exchange_in" ? "Exchange" : rnd() < (a.key === "intl_incoming" || a.key === "eu_rug" ? 0.6 : 0.3) ? "MA" : "BA";
    const t = a.mean;
    const T = (m: number) => clamp(normal(rnd, m, 0.16), 0.02, 0.98);
    const traits = { urgency: T(t.urgency), aiTrust: T(t.aiTrust), privacy: T(t.privacy), scam: T(t.scam), fairness: T(t.fairness), tech: T(t.tech), priceSens: T(t.priceSens), network: T(t.network), skeptic: T(t.skeptic) };
    const age = isLandlord ? 38 + Math.floor(rnd() * 30) : a.key === "phd" ? 25 + Math.floor(rnd() * 8) : level === "MA" ? 22 + Math.floor(rnd() * 5) : 18 + Math.floor(rnd() * 6);
    const budgetEur = isLandlord ? 0 : Math.round((330 + traits.priceSens * -150 + (cohort === "NON" ? 140 : 90) + rnd() * 240 + (a.key === "phd" ? 120 : 0)) / 10) * 10;
    const guarantor: Persona["guarantor"] = cohort === "NON" ? (rnd() < 0.34 ? "none" : rnd() < 0.58 ? "institution" : "family") : rnd() < 0.12 ? "none" : "family";
    const months = isLandlord ? 0 : a.key === "intl_incoming" || a.key === "exchange_in" ? Math.floor(rnd() * 2) : Math.floor(rnd() * 30);
    const stakes = pick(rnd, STAKES[a.key]);
    const bio = isLandlord
      ? `${name}, ${age}, ${a.label.toLowerCase()} in Groningen. ${stakes}`
      : `${name}, ${age}, ${level === "PhD" ? "PhD candidate" : level === "Exchange" ? "exchange student" : level + " student"} in ${program} at ${inst === "RUG" ? "the University of Groningen" : "Hanze University of Applied Sciences"}${dutch ? "" : `, from ${country!.name}`}. ${stakes}`;
    out.push({
      id: "P" + String(i + 1).padStart(3, "0"), name, archetype: a.key, role: a.role, cluster: a.cluster, inst, program, level, cohort, country: dutch ? "Netherlands" : country!.name, age,
      budgetEur, guarantor, monthsInGroningen: months, regMonths: months + Math.floor(rnd() * 6), portfolio: isLandlord ? (a.key === "landlord_pro" ? 20 + Math.floor(rnd() * 40) : a.key === "agent" ? 80 + Math.floor(rnd() * 80) : 1 + Math.floor(rnd() * 4)) : undefined,
      traits, bio, stakes,
    });
  }
  return out;
}
