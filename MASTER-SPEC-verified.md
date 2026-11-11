# MASTER BUILD SPEC — "Verified"

**A verified allocation layer for student housing. Demo build specification.**

| | |
|---|---|
| **Document** | Master spec, supersedes `housing-demo-build-brief.md` |
| **Version** | 2.0 |
| **Product name** | **Verified** (renamable; used throughout as the working name) |
| **Deliverable** | One runnable demo web app, mock data, seven tabs, deterministic simulator |
| **Audience** | An AI coding agent, then a hackathon jury / municipality / university |
| **Companion artefacts** | `housing-simulator.html` (working funnel simulation), `housing-flow-playable.html` (animated pipeline), `housing-workflow-map.html` (62-step reference), `housing-scope-eu.html` (legal argument) |
| **Prepared** | November 2026 |

---

# 0. How to use this document

## 0.1 If you are the coding agent, read this first

1. **Build in the order given in §15.** Do not start with screens.
2. **§2 is a wall, not a preference.** Twelve rules. Several become failing tests. If a feature requires breaking one, the feature is wrong — say so in your PR description and do not build it.
3. **§3 and §11 are the design contract.** Follow them literally; do not "improve" the palette, the tab structure or the typography.
4. **Every number in the UI must come from mock data or a computed value.** Never hardcode a metric for display.
5. **Mark all simulated values** with the `MockBadge` component and the issuer string. There is no scenario in which mock data is shown as real.
6. When the spec is ambiguous, **choose the option that is more conservative about people's data and more transparent to the user**, and leave a `// SPEC-GAP:` comment.

## 0.2 Definition of done

- Seven tabs work on desktop and mobile, light and dark.
- The listing gate, the allocation funnel, the hospiteer pool and the sublet/swap flows all run end to end on mock data.
- The simulator tab runs 214 agents deterministically and the invariant panel stays green.
- All twelve wall tests (§10) pass.
- `README.md` states which integrations are mocked and what each real one would require.
- A jury member can find, unprompted: the refusal log, the override rate, and the reason-code dictionary.

## 0.3 The five questions this product exists to answer

Every screen should be traceable to one of these. They came out of the design process and they are the spine of the demo.

| # | Question | Where it is answered |
|---|---|---|
| Q1 | Can personality testing select housemates? | **No.** Replaced by the hospiteer module + declared preferences. Tab 3, §6.7 |
| Q2 | How do 200 applicants become 10 without profiling? | The eleven gates. Tab 5 + `housing-simulator.html`, §6.3 |
| Q3 | What about AI-written applications and mass applying? | No scored text, identity dedupe, active cap, mechanism design. §6.10, Tab 5 |
| Q4 | Can students sublet when they go on exchange? | Yes, with landlord consent as a hard gate, plus a swap mechanism. Tab 4, §8 |
| Q5 | How do we prove any of this works? | Deterministic simulation + adversarial runs + an auditable hash chain. Tab 5 + Tab 7 |

---

# 1. Product definition

## 1.1 The insight

In a shortage market a landlord has no distribution problem — one posting gets hundreds of responses. So a housing platform's sellable value to landlords is **screening, compliance and reduced risk**, not reach. And the harm is directional: fraud runs from fake landlords toward students. **Verification of supply is the product; verification of the renter is a light secondary step.**

## 1.2 What it is, in three sentences

1. **A gate.** A room cannot go live until six deterministic checks clear it. The output is a status for a *listing* plus reason codes — never a score for a person.
2. **An allocator.** Applications are ordered by a published rule, capped, and matched by a mechanism where lying cannot help. The landlord sees fifteen names in that order, with verified facts and a meeting record — never a CV pile.
3. **An audit trail.** Append-only, hash-chained rows a municipality can inspect, surfaced as a dashboard someone pays for.

## 1.3 The one-sentence pitch

> We built the verification layer that student housing is missing. A room cannot appear until someone we can prove owns it, with photographs nobody else has used, at a rent we show against the legal maximum — and every decision we make is a reason code in a log a municipality can audit. We do not score people and we do not rank them by feel: applicants are ordered by a rule we publish in advance, every rejection is explained in writing, and the number we put on the slide is not how many users we have, it is how many listings we refused.

## 1.4 Who pays

| Payer | What they buy | Price shape |
|---|---|---|
| Municipality | Verification + refusal reporting for the housing desk | €15k–50k / yr / city |
| University / international office | Pre-arrival verified pipeline + cohort report | €5k–25k / yr / institution |
| Professional landlord / makelaar | Defensible selection records, WWS-O compliance | €10–30 / unit / mo |
| Student | Free, always | €0 |

## 1.5 Success criteria for the demo

- [ ] A fraudulent listing is refused in under 10 seconds with three named codes.
- [ ] A genuine listing publishes with a badge naming what was checked and when.
- [ ] 214 simulated applicants produce a 15-name shortlist, and no screen anywhere shows a CV pile.
- [ ] A decline without a reason code is **impossible in the UI**.
- [ ] The detector scenario shows 23% of non-native speakers wrongly excluded — and the product refuses to ship it.
- [ ] A sublet without landlord consent cannot be created.
- [ ] The audit chain verifies, and can be shown failing when a row is tampered with.

---

# 2. The wall — twelve non-negotiable rules

Each is enforced by an automated test in §10. Reproduce them verbatim in `README.md`.

| # | Rule | Why |
|---|---|---|
| **W1** | **No field anywhere holds a personality, trait, fit or trust score about a person.** | AI Act Annex III 5(d); WGV objective criteria |
| **W2** | **No free-text field is ever scored, ranked, or used as an allocation input.** | A prose scorer flags non-native speakers at 23% vs 4% — a proxy for national origin (AWGB) |
| **W3** | **No AI-text detection of any kind.** | Same as W2, and it fails on exactly the population we serve |
| **W4** | **No biometric or image-content classification.** Images are hashed and compared, nothing else. | AI Act Art. 5(1)(g) |
| **W5** | **No phone number as an identity signal.** Contact data only. | A prepaid SIM proves a phone, not a person |
| **W6** | **No storage of passports, ID documents or BSNs.** Attestations only: boolean + issuer + date. | GDPR minimisation |
| **W7** | **No custody of deposits or rent.** Partner escrow only. | PSD2 / safeguarding / AML |
| **W8** | **No reordering of the applicant queue.** No endpoint, no UI affordance. | WGV; the queue is the fairness |
| **W9** | **Every refusal carries a reason code and a generated written motivation.** | WGV; and a silent rejection is a bug |
| **W10** | **Every automated REFUSE or HOLD reaches a named human within 24 h, with a recorded reason.** | AI Act human oversight; GDPR Art. 22 |
| **W11** | **A sublet cannot exist without recorded landlord consent.** | art. 7:244 BW |
| **W12** | **Mock values are always visibly labelled with their issuer.** | Honesty; a fake Kadaster lookup destroys the whole claim |

---

# 3. Design language — the UI directive

## 3.1 Intent

The demo must read as **a premium housing product that happens to be an audit tool** — not a compliance dashboard that happens to have listings. Think: an editorial property magazine crossed with a notary's office. Warm, quiet, generous, confident. Photography-led where it is about rooms; monospaced and blunt where it is about evidence.

**Five adjectives to design against:** warm, editorial, precise, unhurried, trustworthy.
**Five to avoid:** playful, techy, gamified, clinical, corporate-SaaS.

## 3.2 Explicit prohibitions

```
✗ emoji as icons, anywhere
✗ gradients used as decoration (only as photographic overlays, max 2)
✗ more than one accent colour competing with the primary
✗ drop shadows above 8% opacity on cards
✗ pure black (#000) or pure white (#FFF) as a surface
✗ rounded corners > 16px on cards, > 999px only on pills
✗ more than two typefaces
✗ stock photos of students laughing with laptops
✗ carousels, parallax, scroll-jacking, confetti
✗ "AI-powered" as a marketing phrase
✗ dark-pattern urgency ("3 others viewing now")
✗ colour as the only signal for a verdict (always pair with an icon or word)
```

## 3.3 Tokens

```css
:root{
  /* surfaces — warm neutrals, never pure */
  --bg:#FBF9F6;          /* page */
  --bg-2:#F5F1EB;        /* wells, table headers */
  --panel:#FFFFFF;       /* cards (white on warm is fine; warm-on-white is not) */
  --panel-2:#F8F5F0;
  --line:#E7E1D9;        /* hairlines, the workhorse */
  --line-2:#D6CEC2;      /* borders on interactive elements */

  /* ink */
  --ink:#12171D;         /* headings, primary text */
  --ink-2:#2C353F;       /* body */
  --muted:#6B7380;       /* secondary */
  --faint:#9AA1AC;       /* labels, meta */

  /* brand — deep green primary, copper secondary, gold tertiary */
  --green:#1F5D4C;
  --green-2:#2A7A63;
  --copper:#C9773F;
  --gold:#B8912F;
  --blue:#3C6E9F;
  --purple:#6E5AA8;

  /* semantic — for verdicts only, never for decoration */
  --pass:#1F7A56;
  --warn:#B57A1E;
  --fail:#B4433C;

  /* type */
  --serif:Georgia,"Iowan Old Style","Times New Roman",serif;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;

  /* geometry */
  --r-sm:8px; --r:12px; --r-lg:16px; --r-pill:999px;
  --sh-1:0 1px 2px rgba(18,23,29,.05), 0 8px 24px rgba(18,23,29,.05);
  --sh-2:0 2px 6px rgba(18,23,29,.07), 0 20px 48px rgba(18,23,29,.08);

  /* spacing — 4px base */
  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px; --s6:32px; --s7:48px; --s8:64px;
}
[data-theme="dark"]{
  --bg:#0F1319; --bg-2:#141A22; --panel:#161C24; --panel-2:#1C242E;
  --ink:#EEF1F4; --ink-2:#CFD6DD; --muted:#8B95A1; --faint:#6B7683;
  --line:#242D38; --line-2:#333E4B;
  --green:#4FA98B; --green-2:#63C2A1; --copper:#DA8F58; --gold:#D6AE4A;
  --pass:#4FA98B; --warn:#D9A44C; --fail:#D9736B;
  --sh-1:0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.35);
  --sh-2:0 20px 60px rgba(0,0,0,.5);
}
```

**Actor colours** (for stage ownership, diagram chips and ledger entries only — never as page furniture):

| Actor | Token | Hex |
|---|---|---|
| Landlord | `--actor-landlord` | `#C9773F` |
| Agent / makelaar | `--actor-agent` | `#B8912F` |
| Student | `--actor-student` | `#3C6E9F` |
| Automated gate | `--actor-system` | `#6E5AA8` |
| Human reviewer | `--actor-reviewer` | `#1F5D4C` |
| Institution | `--actor-inst` | `#2A7A63` |
| Municipality | `--actor-muni` | `#8E5A7A` |
| Money partner | `--actor-money` | `#8A7628` |

## 3.4 Typography

| Role | Face | Size | Weight | Notes |
|---|---|---|---|---|
| Display / page title | `--serif` | `clamp(26px, 3.4vw, 44px)` | 400 | italic for one emphasis word only |
| Section title | `--serif` | `clamp(19px, 2.2vw, 26px)` | 400 | |
| Card title | `--serif` | 17px | 400 | |
| Body | `--sans` | 15px / 1.55 | 400 | max 78ch |
| Body dense | `--sans` | 13.5px / 1.5 | 400 | tables, panels |
| Micro-label | `--sans` | 10.5px | 700 | uppercase, `letter-spacing:.14em`, `--faint` |
| Data, codes, hashes, positions | `--mono` | 12–15px | 500–700 | `font-variant-numeric: tabular-nums` **always** |

**Rules:** one italic emphasis per screen maximum. Never bold a whole sentence. Never letter-space lowercase text. Never use the serif for data.

## 3.5 Layout and grid

- Content max-width **1320px**; gutters `clamp(14px, 3vw, 32px)`.
- 12-column grid, 20px gutter. Two-pane layouts: `minmax(0,1fr) 372px`, collapsing at 1080px.
- **Every grid child gets `min-width:0`.** This is how you avoid horizontal overflow; assume it is required.
- Vertical rhythm on the 4px scale. Section separation `48px`, card padding `20–24px`.
- Page header block: eyebrow (label) → serif title → lede → meta row. Used on every tab.
- Minimum interactive target **40×40px**. Focus ring `2px solid var(--gold)` with `2px` offset, never removed.
- Tables: header `--panel-2`, row hover `--panel-2`, hairline separators, no zebra, `tabular-nums` on numerics.

## 3.6 Motion

| Interaction | Duration | Easing |
|---|---|---|
| Hover / focus | 120ms | `ease` |
| State change, chip appear | 200ms | `cubic-bezier(.2,.7,.3,1)` |
| Drawer / sheet | 280ms | `cubic-bezier(.2,.7,.3,1)` |
| Funnel bar fill | 550ms | `cubic-bezier(.2,.7,.3,1)` |
| Packet travel (pipeline) | 600–900ms | linear |

Respect `prefers-reduced-motion: reduce` → all transitions `none`, animations off, bars set instantly.

## 3.7 Photography

- Listing cards use a **4:3 image** with a 2px inner border `--line`, `--r` radius, and **no text overlay except one status pill**.
- Images must be warm-toned interior or exterior photography of actual rooms. If unavailable, use a **flat `--bg-2` tile with a small mono label of the room type** — never a stock photo of people.
- Never run a gradient over a photo.

## 3.8 The seventeen components

Build these in isolation first, on a `/kitchen-sink` route.

| # | Component | Contract |
|---|---|---|
| 1 | `MockBadge` | mono pill, `--copper` outline, text = issuer (`kadaster:mock`). Tooltip: "Simulated in this demo" |
| 2 | `StatusPill` | DRAFT / CHECKING / HOLD / PUBLISHED / REFUSED / SUSPENDED / LET — colour + word, never colour alone |
| 3 | `ReasonCode` | mono pill; fail/warn/pass variants; tooltip = plain-language sentence + link to `/codes/:code` |
| 4 | `ActorChip` | coloured dot + actor label; `sm | md` |
| 5 | `CheckRow` | check id, verdict, one-line evidence, duration, expandable raw payload |
| 6 | `GateSummary` | six `CheckRow`s + the aggregate decision + the generated letter link. **The single most important component** |
| 7 | `CeilingBreakdown` | points table → ceiling → asking rent → over/under → disclaimer. Rendered as a small table, never a chart |
| 8 | `StageCard` | number, name, subtitle, owner `ActorChip`, `n of m outputs` |
| 9 | `LedgerEntry` | artefact chip, colour channel (neutral / pass / fail / warn) |
| 10 | `FunnelRow` | number, label, note, bar, count; `.on` / `.attrition` / `.keep` / `.final` |
| 11 | `InvariantRow` | ✓/✗, statement, live value |
| 12 | `QueuePosition` | big mono number, `of N`, the rule id, the tie-break used |
| 13 | `MotivationLetter` | letter body, code and rule version in the footer |
| 14 | `MaskedThread` | chat bubbles, masked contact details, inline warning banner |
| 15 | `AuditRowView` | seq, actor, action, subject, codes, hash prefix, verified tick |
| 16 | `ChainStatus` | `n / n rows verified`, red state when broken |
| 17 | `EmptyState` | one sentence of *why* it is empty + one action. No illustration |

## 3.9 Accessibility, non-negotiable

- WCAG 2.2 AA: 4.5:1 body, 3:1 large text and UI boundaries, in **both** themes.
- Verdicts never colour-only: `✓ PASS` / `✗ FAIL` / `! HOLD`.
- `aria-live="polite"` on the funnel, the ledger, the gate result and the queue position.
- Complete keyboard path through each tab. Reason-code tooltips keyboard-reachable, dismissible with `Escape`.
- Form errors are inline and specific ("A decline must reference a published criterion"), never "Invalid input".

---

# 4. App shell and the seven tabs

## 4.1 Shell

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Verified                                    [Delft ▾]   [Demo mode ●]  │  ← 64px, hairline under
├─────────────────────────────────────────────────────────────────────────┤
│  Discover   Room   Hospiteer   Sublet & Swap   Simulation   Dashboard   Audit │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   page header: eyebrow / serif title / lede / meta                       │
│   ─────────────────────────────────────────────────────────────────      │
│   content                                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

- The tab bar is **sticky**, 52px, hairline bottom border. Active tab: `--ink` text with a 2px `--green` underline that animates in 200ms. Inactive: `--muted`.
- Tabs are **routes**, not show/hide panels. Each has a URL (`/discover`, `/room/:id`, `/hospiteer`, `/swap`, `/simulate`, `/dashboard`, `/audit`) so the demo can be deep-linked and the browser back button works.
- On mobile (<720px) the tab bar scrolls horizontally with `scroll-snap`; never wraps to two lines; never becomes a hamburger.
- **Demo mode pill** is persistent and clickable → opens a panel explaining exactly which integrations are mocked.

## 4.2 The seven tabs

| # | Tab | Route | One-line purpose |
|---|---|---|---|
| 1 | **Discover** | `/discover` | Browse verified rooms; see the badge and the "why this order" panel |
| 2 | **Room** | `/room/:id` | One listing: photography, the gate result, ceiling breakdown, apply |
| 3 | **Hospiteer** | `/hospiteer` | The meeting module: published procedure, pool, parity reporting |
| 4 | **Sublet & Swap** | `/swap` | Sublet with landlord consent; exchange cycles via top trading cycles |
| 5 | **Simulation** | `/simulate` | 214 agents, the eleven gates, adversarial runs, invariant panel |
| 6 | **Dashboard** | `/dashboard` | Municipal view: refusals by code, override rate, coverage |
| 7 | **Audit** | `/audit` | Append-only log, hash chain verifier, reason-code dictionary |

Each tab is specified in §11.

---

# 5. Domain model and mock data

## 5.1 Types

```ts
type Actor = 'landlord'|'agent'|'student'|'system'|'ops'|'inst'|'muni'|'money';
type AccountType = 'PRIVATE_OWNER'|'PROFESSIONAL'|'AGENT';
type ListingStatus = 'DRAFT'|'CHECKING'|'HOLD'|'PUBLISHED'|'REFUSED'|'SUSPENDED'|'WITHDRAWN'|'LET';
type ApplicationStatus = 'SUBMITTED'|'ELIGIBLE'|'INELIGIBLE'|'OFFERED'|'DECLINED'|'ACCEPTED'|'WITHDRAWN'|'ESCALATED';
type AttestationKind = 'identity'|'age'|'student_status'|'kvk'|'ownership'|'address';
type CheckId = 'ID'|'OWN'|'DUP'|'BAG'|'RENT'|'TRADER';
type CheckVerdict = 'PASS'|'FAIL'|'WARN'|'SKIP';

interface Account {
  id: string; type: AccountType; displayName: string; email: string;
  phone?: string;                       // CONTACT ONLY. Never an attestation. (W5)
  createdAt: string; rulesAcceptedAt: string;
  suspension?: { reasonCode: string; at: string; by: Actor };
}

interface Attestation {
  id: string; subjectRef: string; kind: AttestationKind;
  verified: boolean; issuer: string;    // 'idin:mock-bank', 'kadaster:mock'
  assurance: 'laag'|'substantieel'|'hoog';
  checkedAt: string; validUntil?: string;   // student_status MUST expire
}

interface Listing {
  id: string; ownerAccountId: string;
  address: { street: string; houseNumber: string; postcode: string; city: string; bagId?: string };
  rentEur: number; serviceCostsEur: number; depositEur: number;
  sizeM2: number; rooms: number; residents: number;
  energyLabel: 'A++++'|'A+++'|'A++'|'A+'|'A'|'B'|'C'|'D'|'E'|'F'|'G';
  sharedFacilities: string[]; facilities: string[];
  availableFrom: string; minDurationMonths: number;
  houseRules: { smoking: boolean; pets: boolean; guests: string; quietHours: string };
  photos: { id: string; sha256: string; pHash: string; takenAt?: string }[];
  status: ListingStatus; createdAt: string; publishedAt?: string;
  ceiling?: RentCeiling; decision?: GateDecision;
}

interface RentCeiling {
  points: number; ceilingEur: number; overCeiling: boolean;
  method: 'WWS-O-2026-approx'; computedAt: string;
  breakdown: { label: string; points: number }[];
  disclaimer: string;                    // shown verbatim (W12 spirit)
}

interface GateDecision {
  status: 'PUBLISH'|'HOLD'|'REFUSE';
  checks: CheckResult[]; reasonCodes: string[];
  decidedAt: string; reviewerRef?: string; overrideReason?: string;
}

interface CheckResult {
  check: CheckId; verdict: CheckVerdict; reasonCode?: string;
  evidence: Record<string, unknown>; durationMs: number; ranAt: string;
}

interface DeclaredProfile {           // declared, editable, symmetric. NOT traits. (W1)
  ref: string; side: 'STUDENT'|'HOUSE';
  budgetMinEur: number; budgetMaxEur: number;
  sleepRhythm: 'early'|'average'|'late';
  guests: 'rarely'|'sometimes'|'often';
  cleanliness: 'relaxed'|'average'|'tidy';
  smoking: 'no'|'outside'|'inside'|'no_preference';
  pets: string[]; languages: string[]; durationMonths: number;
  version: number; updatedAt: string;
}

interface Application {
  id: string; listingId: string; applicantRef: string;   // pseudonymous
  submittedAt: string; registrationStartDate: string;
  eligibility: { ruleId: string; passed: boolean; input: string }[];
  ruleSetVersion: string;
  position: number;                    // server-assigned, immutable (W8)
  status: ApplicationStatus;
  decision?: { at: string; byAccountId: string; code?: string; letterRef?: string };
  escalations: { at: string; kind: 'NUDGE_48H'|'ESCALATE_72H'|'AUTO_ADVANCE' }[];
}

interface Sublet {
  id: string; headLeaseId: string; headTenantRef: string;
  startDate: string; endDate: string;
  subletRentEur: number;
  landlordConsent: { granted: boolean; at?: string; byAccountId?: string };  // W11 HARD GATE
  brpRegistrable: 'yes'|'no'|'unknown';
  status: 'BLOCKED'|'AWAITING_CONSENT'|'LIVE'|'FILLED'|'WITHDRAWN';
}

interface AuditRow {
  seq: number; at: string; actor: string; action: string;
  subject: { kind: string; ref: string };
  inputs: Record<string, unknown>;      // incl. ruleSetVersion
  outcome: string; reasonCodes: string[];
  prevHash: string; hash: string;
}
```

## 5.2 Mock fixtures — the four listings

```ts
const LISTINGS = [
  { id:'L-1001', fixture:'genuine', address:'Oude Delft 118, 2611 CG Delft',
    rentEur:620, sizeM2:16, energyLabel:'C', residents:4,
    shared:['kitchen','bathroom','toilet'], facilities:['furnished','private_shower','central_heating'],
    photos:['p1','p2','p3'], expected:{ status:'PUBLISH', codes:[] } },

  { id:'L-1002', fixture:'fraud', address:'Phoenixstraat 42, 2611 AL Delft',
    rentEur:780, sizeM2:20, energyLabel:'D', residents:3,
    shared:['kitchen','bathroom'], facilities:['furnished'],
    photos:['stolen_a','stolen_b'],
    expected:{ status:'REFUSE', codes:['LOT-DUP-01','LOT-OWNER-02','LOT-RENT-04'] } },

  { id:'L-1003', fixture:'silent', address:'Voorstraat 7, 2611 JN Delft',
    rentEur:545, sizeM2:14, energyLabel:'B', residents:5,
    shared:['kitchen','bathroom','toilet'], facilities:['furnished','balcony'],
    photos:['s1','s2'], expected:{ status:'PUBLISH', codes:[] } },

  { id:'L-1004', fixture:'agent', address:'Jacobstraat 9, 2611 LA Delft',
    rentEur:695, sizeM2:18, energyLabel:'C', residents:4,
    shared:['kitchen','bathroom'], facilities:['furnished'],
    photos:['a1','a2'], expected:{ status:'HOLD', codes:['LOT-MANDATE-01'] } },
];
```

**Instruction:** run `piecewiseLinearCeiling()` on each listing at build time and assert `expected.status` in a test. If the arithmetic does not produce the expected code, **fix the fixture numbers, never the algorithm** — and add a comment recording the point totals.

## 5.3 Mock adapter behaviour (deterministic by fixture key)

| Fixture | Identity | Ownership | Address | Registry | Image search | Student |
|---|---|---|---|---|---|---|
| `landlord_genuine` | verified | match | woonfunctie | active | 0 hits | — |
| `landlord_fraud` | **failed** | **other name** | woonfunctie | **inactive** | **2 hits** | — |
| `landlord_silent` | verified | match | woonfunctie | active | 0 hits | — |
| `landlord_agent` | verified | **mandate ref** | woonfunctie | active | 0 hits | — |
| `student_genuine` | verified | — | — | — | — | valid +10 months |
| `student_expired` | verified | — | — | — | — | **expired** |
| `address_nondwelling` | — | — | **kantoor** | — | — | — |

Every adapter call appends to `adapter_runs` `{ adapter, input, output, ms }` so the UI can display "this is exactly what the check received".

## 5.4 The simulated population — 214 agents

The population generator is **deterministic** (seeded mulberry32) and lives in `src/simulation/population.ts`. It is the single source for the Simulation tab. Reference implementation is live in `housing-simulator.html` — port it, do not rewrite from prose.

```ts
function mulberry32(a:number){ return function(){ a|=0; a=a+0x6D2B79F5|0;
  let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296; }; }

interface StudentAgent {
  id:string; nat:'NL'|'EU'|'NON'; urgency:number;        // days until homelessness
  budgetEur:number; guarantor:'family'|'institution'|'none';
  brpNeed:'required'|'preferred'|'no'; lang:'NL'|'EN'|'both';
  ai:0|1|2|3;                    // 3 = fires hundreds of applications
  deception:0|1|2;               // test harness only
  social:'association'|'some'|'none';
  regMonths:number;              // registration duration, the priority signal
  studentOk:boolean; incomeOk:boolean; householdOk:boolean; active:boolean;
  nonNativeEnglish:boolean;      // detector exposure — the self-restraint persona
  duplicate:boolean; idOk:boolean;
  willApplyHere:boolean;         // ranks this listing inside their top-10
  lottery:number;                // ONE number, used across all listings
}
```

**Distributions (tuned — reproduce exactly; the funnel numbers depend on them):**

| Field | Distribution | Consequence |
|---|---|---|
| `nat` | NL 42%, EU 28%, non-EU 30% | cohort mix |
| `urgency` | `3 + rnd^1.6 * 177` days | desperate agents behave differently |
| `guarantor` | NL/EU: 12% none · non-EU: 34% none, 38% institution | the biggest eligibility filter |
| `studentOk` | 95% | |
| `incomeOk` | family 70% · institution 86% · none 34% | |
| `householdOk` | 90% | |
| `duplicate` | 7.5% | dedupe target |
| `idOk` | 94% | |
| `active` | 80% | activeness gate |
| `willApplyHere` | 46% | the active cap |
| `ai` | normal: uniform 0–2 · flood: 60% are 3 | adversarial scenario |
| `nonNativeEnglish` | non-NL: 86% | detector false-positive exposure |

**Expected funnel with seed `20261111`** — assert this in a test:

```
214 expressed → 181 dedupe → 99 eligible → 79 active → 32 capped
   → 15 shortlist → 15 committed → 11 attended → 1 housed
```

If your port produces something materially different, your distributions drifted. Fix the generator, not the assertion thresholds.

---

# 6. Algorithms

Every algorithm below is specified as a pure function with its invariants stated. All are to be unit-tested (§10).

## 6.1 Pipeline overview

```
                      ┌─────────────── SUPPLY ───────────────┐
owner → account type → identity → trader → ownership → RULES ACCEPTED
                                                        │
                                                        ▼
                                   ┌──────── LISTING GATE ────────┐
                                   │ ID · OWN · DUP · BAG · RENT · TRADER │
                                   └──────┬───────────┬───────────┬──────┘
                                     PUBLISH        HOLD        REFUSE
                                        │             │            │
                                        │       human ≤24h     letter + log
                                        ▼             ▼
                                     LIVE ◄───── (override, recorded)

                      ┌──────────────── DEMAND ────────────────┐
student → identity → student status (expires) → consent → declared profile
                                                        │
                                                        ▼
                          ┌────── ALLOCATION FUNNEL (11 gates) ──────┐
                          │ interest → dedupe → eligibility → active │
                          │ → cap(10) → shortlist(15) → commitment    │
                          │ → meeting → criterion-linked choice       │
                          └────────────────┬─────────────────────────┘
                                           ▼
                             deferred acceptance over the market
                                           ▼
                              offer → contract → escrow → move-in
```

## 6.2 Verification gate

```ts
function aggregate(results: CheckResult[]) {
  if (results.some(r => r.verdict === 'FAIL'))
    return { status: 'REFUSE' as const, codes: results.filter(r=>r.verdict==='FAIL').map(r=>r.reasonCode!) };
  if (results.some(r => r.verdict === 'WARN'))
    return { status: 'HOLD' as const,   codes: results.filter(r=>r.verdict==='WARN').map(r=>r.reasonCode!) };
  return { status: 'PUBLISH' as const, codes: [] };
}
```

**Invariants:** no score, no threshold, no weight. Same input → identical JSON including evidence order. Every FAIL/WARN has a code present in the dictionary.

### 6.2.1 `ID` — identity

```
1. assertion = IdentityAdapter.assert(accountRef)
2. !assertion.verified                    → FAIL ID-FAIL-01
3. assertion.validUntil < now             → FAIL ID-EXPIRED-02
4. else                                   → PASS
evidence: { issuer, assurance, checkedAt }   // NEVER a document (W6)
```

### 6.2.2 `OWN` — ownership

```
1. owners = OwnershipAdapter.ownersOf(address)
2. owners.length === 0                    → FAIL LOT-OWNER-02
3. mandateRef present                     → WARN LOT-MANDATE-01   (human reviews)
4. nameSimilarity(poster, owner) >= 0.92  → PASS
5. else                                   → FAIL LOT-OWNER-02
```

```ts
function normaliseName(s:string):string[]{
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z\s]/g,' ').split(/\s+/)
    .filter(t=>t.length>2)
    .filter(t=>!['van','de','der','den','ter','ten','von'].includes(t))
    .sort();
}
function nameSimilarity(a:string,b:string):number{
  const A=new Set(normaliseName(a)), B=new Set(normaliseName(b));
  const inter=[...A].filter(x=>B.has(x)).length;
  return inter/Math.max(1,Math.min(A.size,B.size));
}
```
**Threshold 0.92.** Must pass: `J. van der Berg ~ Jan van der Berg`, `Müller ~ Muller`, `Ahmed El Amrani ~ A. El Amrani`. Must fail: `P. de Vries ~ J. de Vries`.

### 6.2.3 `DUP` — photo integrity

```
1. sha256 and dHash computed at upload
2. localByHash  = store.findBySha(sha) where listingId !== this   → FAIL LOT-DUP-01
3. localByPHash = hamming(pHash, other) <= 6                      → FAIL LOT-DUP-01
4. external     = ImageSearchAdapter.reverseSearch(pHash)         → WARN  LOT-DUP-01 (hold)
5. no EXIF and no unique pHash                                    → WARN  LOT-DUP-02
6. else PASS
```
**W4:** the only functions that touch image bytes are `sha256()` and `dhash()`. No content classification, ever.

```ts
function dhash(gray:number[][], w=9, h=8):bigint{
  let bits=0n;
  for(let y=0;y<h;y++) for(let x=0;x<w-1;x++)
    bits=(bits<<1n)|(gray[y][x]<gray[y][x+1]?1n:0n);
  return bits;
}
function hamming(a:bigint,b:bigint){let x=a^b,n=0;while(x){n+=Number(x&1n);x>>=1n;}return n;}
```

### 6.2.4 `BAG` — address

```
1. rec = AddressAdapter.lookup(postcode, houseNumber)
2. !rec                                   → FAIL LOT-ADDR-03
3. rec.usage !== 'woonfunctie'            → FAIL LOT-ADDR-03
4. normalise(rec.street) !== normalise(listing.street) → WARN LOT-ADDR-04
5. else PASS
```

### 6.2.5 `RENT` — WWS-O disclosure (never a refusal)

> **Honesty requirement.** This is an approximation for demonstration. Label it `WWS-O-2026-approx` everywhere, render the disclaimer, and list "replace with the official Huurcommissie calculator" as an open item on the Dashboard.

**Verified 2026 anchors:** 143 points ≈ **€932.93**; 186 points ≈ **€1,228.07**; no cap from 187.

```ts
const ANCHORS:[number,number][] = [[0,0],[143,932.93],[186,1228.07]];
function piecewiseLinearCeiling(points:number):number{
  if(points>=187){ const rate=(1228.07-932.93)/(186-143);
    return round2(1228.07+(points-186)*rate); }
  for(let i=1;i<ANCHORS.length;i++){
    const [p0,r0]=ANCHORS[i-1],[p1,r1]=ANCHORS[i];
    if(points<=p1) return round2(r0+(points-p0)*(r1-r0)/(p1-p0));
  }
  return 1228.07;
}
const surfacePoints=(m2:number)=>Math.min(120,Math.round(m2));
const energyPoints=(l?:string)=>({'A++++':40,'A+++':36,'A++':32,'A+':28,'A':24,'B':20,'C':15,'D':11,'E':8,'F':5,'G':0} as any)[l??'G']??0;
const kitchenPoints=(shared:string[],fac:string[])=>fac.includes('private_kitchen')?20:(shared.includes('kitchen')?0:20);
const sanitaryPoints=(shared:string[],fac:string[])=>{let p=0;
  if(fac.includes('private_shower'))p+=10; if(fac.includes('private_toilet'))p+=6;
  if(!p&&(shared.includes('bathroom')||shared.includes('toilet')))p=2; return p;};
const outdoorPoints=(fac:string[])=>(fac.includes('balcony')||fac.includes('garden'))?6:0;
```

Verdict: **always PASS**; if `rentEur > ceiling` → `WARN LOT-RENT-04` with the breakdown as evidence. Asking above the ceiling is not per se unlawful — the check discloses, it does not refuse. Render `CeilingBreakdown` on the room page.

### 6.2.6 `TRADER` — KvK

```
1. accountType === 'PRIVATE_OWNER'  → SKIP        (Art. 30 does not bind a one-room landlord)
2. !kvk                             → FAIL TRD-INVALID-01
3. rec = RegistryAdapter.lookup(kvk); !rec.active → FAIL TRD-INVALID-01 + suspend (Art. 30(3))
4. else PASS, and publish the trader profile block on the listing (Art. 30(7) shape)
```

## 6.3 The eleven-gate allocation funnel

This is the answer to "200 → 10". Implement as an ordered pipeline where **each gate returns a count and a reason tally**, and the Simulation tab renders it.

| # | Gate | Rule | Code emitted |
|---|---|---|---|
| 1 | Expression of interest | one tap, no text | — |
| 2 | Identity + dedupe | one verified person, one account; one lottery number | `DUP-ACCOUNT-01` |
| 3 | Hard eligibility | verified student status · income ≥ 3× rent **or** guarantor · household ≤ max | `APP-ELIG-04/05/06` |
| 4 | Activeness | still looking; application not stale (>14 days untouched) | `APP-STALE-08` |
| 5 | **Top-10 ranking (active cap)** | a student holds at most **10** live applications; only listings they rank inside their top-10 receive one | `CAP-EXCEEDED-09` (not a judgement) |
| 6 | Published shortlist | top **15** by priority rule, no CVs, no reordering | — |
| 7 | Pre-meeting commitment | small refundable commitment or a recorded attendance promise | `CMT-MISSED-10` |
| 8 | The meeting | 20 minutes, identical format for everyone | `MEET-NOSHOW-11` |
| 9 | Criterion-linked choice | the house chooses among those it met; refusal cites a published step | `APP-DECLINE-07` |
| 10 | Deferred acceptance | market-wide matching so a shortlist need not be perfect | — |
| 11 | Offer → contract → escrow | stage 8 of the supply pipeline | `DEP-*`, `CON-*` |

```ts
interface FunnelCounts { expressed:number; dedupe:number; eligible:number;
  active:number; capped:number; shortlist:number; committed:number;
  attended:number; housed:number; }

function runFunnel(students: StudentAgent[], listing: Listing, rules: RuleSet): FunnelCounts {
  const expressed = students.length;
  const unique    = students.filter(s => !s.duplicate && s.idOk);
  const eligible  = unique.filter(s => s.studentOk && s.incomeOk && s.householdOk);
  const active    = eligible.filter(s => s.active);
  const capped    = active.filter(s => s.willApplyHere);        // the cap
  const ordered   = sortByPriority(capped, rules);              // §6.4
  const shortlist = ordered.slice(0, 15);
  const committed = shortlist.filter(s => s.urgency < 170 || s.guarantor !== 'none' || /* attended before */ false);
  const attended  = committed.slice(0, Math.max(8, Math.round(committed.length * 0.75)));
  return { expressed, dedupe:unique.length, eligible:eligible.length, active:active.length,
           capped:capped.length, shortlist:shortlist.length, committed:committed.length,
           attended:attended.length, housed:1 };
}
```

**Invariant G-1:** `expressed ≥ dedupe ≥ eligible ≥ active ≥ capped ≥ shortlist ≥ committed ≥ attended ≥ housed`.
**Invariant G-2:** `shortlist ≤ 15`. **G-3:** the same seed produces the same funnel, byte-identical.

## 6.4 Priority, lottery and ordering

```ts
function sortByPriority(xs: StudentAgent[], rules: RuleSet){
  return xs.slice().sort((a,b)=>
    // R4: allocation order = registration duration, longest first
    (b.regMonths - a.regMonths) ||
    // R5: tie-break — ONE lottery number, identical across all listings
    (a.lottery - b.lottery) ||
    // R6: stable, documented as arbitrary but consistent
    a.id.localeCompare(b.id)
  );
}
```
**Never** an input: reputation, response speed, message length, budget, nationality, or anything inferred. Add tests (§10).

## 6.5 Deferred acceptance (market-wide)

Student-proposing deferred acceptance. This is what makes a 15-name shortlist safe, and it is why you can tell applicants the truth: **truthful ranking is a dominant strategy.**

```ts
function deferredAcceptance(students: Applicant[], listings: Listing2[], priorities: PriorityFn) {
  const free = [...students];
  const held: Record<string, Applicant[]> = {};      // listingId -> provisionally held
  const next = new Map(students.map(s => [s.id, 0])); // index into s.preferences

  while (free.length) {
    const s = free.shift()!;
    const i = next.get(s.id)!;
    if (i >= s.preferences.length) continue;          // exhausted list — unmatched
    const l = s.preferences[i];
    next.set(s.id, i + 1);
    (held[l] ||= []).push(s);
    held[l].sort((a,b) => priorities(l, a, b));       // house priority = §6.4 rule
    if (held[l].length > capacity(l)) {
      const rejected = held[l].pop()!;                // lowest priority
      free.push(rejected);
    }
  }
  return held;
}
```

**Properties to state in the UI, not just the code:** stability (no pair would both prefer each other), student-optimality, strategy-proof for students. **Tie-break with a single random lottery number**, assigned once and reused — do not re-randomise per round or the strategy-proofness guarantee degrades.

## 6.6 Top trading cycles — the swap layer

For exchange (going on exchange, want another room). Uses existing endowments, creates supply from nothing.

```ts
function topTradingCycles(agents: SwapAgent[]) {
  const remaining = new Set(agents.map(a => a.id));
  const roomsLeft = new Set(agents.map(a => a.holdsRoomId));
  const result: [string, string][] = [];

  while (remaining.size) {
    // each agent points to the room they most want, among rooms still in play
    const pointsTo: Record<string,string> = {};
    for (const id of remaining) {
      const a = agents.find(x => x.id === id)!;
      const target = a.wants.find(r => roomsLeft.has(r));
      if (target) pointsTo[id] = target;
    }
    // find cycles
    const cycles = findCycles(pointsTo);
    if (!cycles.length) break;
    for (const cyc of cycles) {
      for (const id of cyc) { remaining.delete(id); }
      cyc.forEach((id, k) => {
        const room = agents.find(x=>x.id===pointsTo[id])!.holdsRoomId;
        result.push([id, room]);
        roomsLeft.delete(room);
      });
    }
  }
  return result;
}
```
**Properties:** strategy-proof, Pareto-efficient, terminates. **Ship 2-cycles first** (A↔B), then 3-cycles. Each executed cycle requires a landlord consent record per participant (W11).

## 6.7 The hospiteer module — the lawful replacement for personality matching

**Why this exists:** personality instruments classify persons to gate housing (Annex III 5(d)). The lawful and better-predicting alternative is: objective pre-selection, then the people who will share the kitchen choose among an equal pool.

```
PUBLISH      the procedure: how to apply, how many are invited, on what objective grounds
PRESELECT    verified student status → first N by registration duration or lottery   (N = 15)
PROFILE      residents publish a HOUSE profile — "what it is like to live here",
             vetted against the prohibited-phrase list
MEET         every candidate gets the same format and the same 20 minutes
CHOOSE       residents choose among the pre-selected pool
RECORD       refusal cites a published step; meeting record stored
PARITY       monthly cohort parity published (see below)
```

**Prohibited-phrase lint** (runs on the house profile, blocks save):

```ts
const PROHIBITED = [
  /\bdutch[- ]only\b/i, /\bno internationals?\b/i, /\bdutch[- ]speaking\b/i,
  /\bgirls? only\b/i, /\bboys? only\b/i, /\bno (foreigners|expats?)\b/i,
  /\bchristian|muslim|jewish house\b/i, /\bno (africans?|asians?)\b/i,
];
```
When triggered: block the save, show the reason code `PROF-LINT-01` with the AWGB explanation, and log the attempt. Do **not** silently rewrite the text.

**The parity metric — the product.** Compute monthly and publish:

```
invited_to_meet  by cohort (NL / EU / non-EU), gender band, age band
chosen           by the same bands
ratio            chosen / invited, per band
if any band's ratio deviates > 1.5x from the pool ratio for two consecutive months
   -> listing flips to LOTTERY allocation by default
```

## 6.8 Reason codes, letters and the code dictionary

**Every** refusal path returns a code. The dictionary is public at `/codes/:code` and generated from a single source of truth.

| Code | Fires | Outcome | Owner | SLA | Plain-language sentence |
|---|---|---|---|---|---|
| `ID-FAIL-01` | identity assertion failed | REFUSE | system | instant | "We could not confirm your identity, so listing rights are paused." |
| `ID-EXPIRED-02` | attestation expired | HOLD | system | 24 h | "Your identity check expired. Re-verify to continue." |
| `LOT-OWNER-02` | poster not the registered owner | REFUSE | system | instant | "The registered owner of this address does not match the account." |
| `LOT-MANDATE-01` | agent under mandate | HOLD | ops | 24 h | "Agent listing under a management mandate — queued for review." |
| `LOT-DUP-01` | photos found elsewhere | HOLD/REFUSE | ops | 24 h | "These photographs appear on another listing." |
| `LOT-DUP-02` | provenance unverifiable | HOLD | ops | 24 h | "We could not verify these photos. One taken in the room today clears it." |
| `LOT-ADDR-03` | not found / not residential | REFUSE | system | instant | "This address is not a registered dwelling." |
| `LOT-ADDR-04` | street mismatch | HOLD | ops | 24 h | "The street name does not match the registered address." |
| `LOT-RENT-04` | rent above ceiling | PASS+WARN | system | — | "The asking rent is above the legal maximum for this room's points." |
| `TRD-INVALID-01` | KvK unresolved | REFUSE+suspend | system | instant | "Your business registration could not be verified." |
| `DUP-ACCOUNT-01` | duplicate identity | silent dedupe | system | instant | (internal) |
| `APP-ELIG-04` | student status unverified | INELIGIBLE | system | instant | "Student status was not verified at application (R1)." |
| `APP-ELIG-05` | income/guarantor below threshold | INELIGIBLE | system | instant | "Income or guarantor requirement not met (R2)." |
| `APP-ELIG-06` | household too large | INELIGIBLE | system | instant | "Household size exceeds the maximum (R3)." |
| `APP-STALE-08` | application untouched 14 days | closed | system | instant | "This application was closed after 14 days of inactivity. You can re-apply." |
| `CAP-EXCEEDED-09` | 11th live application | **blocked, not judged** | system | instant | "You can hold 10 applications at a time. Withdraw one to apply here." |
| `CMT-MISSED-10` | commitment withdrawn / no-show | deprioritised | system | instant | "You missed the meeting you committed to. This affects nothing about your eligibility." |
| `MEET-NOSHOW-11` | resident no-show | rescheduled | ops | 48 h | "The meeting did not happen. We have rescheduled it." |
| `APP-DECLINE-07` | earlier applicant chosen | DECLINED | landlord | instant | "An earlier applicant in the published order was selected. Your position was N of M." |
| `APP-SILENT-06` | no landlord decision in 48 h | escalate | ops | 48 h | "The landlord has not responded. We escalated and moved to the next applicant." |
| `APP-SKIP-02` | attempt to reorder | blocked | system | instant | (internal) |
| `MSG-OFFPLAT-01` | off-platform nudge | warn | system | instant | "Keep the conversation here — contact details are hidden until an offer is accepted." |
| `MSG-FEE-02` | upfront fee requested | block + escalate | ops | immediate | "This conversation is paused. No legitimate landlord asks for money before a viewing." |
| `REP-TRIAGE-01` | report untriaged 72 h | auto-hide | ops | 72 h | "This listing is hidden while we review a report." |
| `PROF-LINT-01` | profile requests a protected characteristic | blocked | system | instant | "A house profile describes the home, not the people you want in it." |
| `SUBLET-CONSENT-01` | no landlord consent | blocked | system | instant | "A sublet needs the owner's written consent. We have asked them." |
| `SUBLET-CAP-02` | rent above head rent | blocked | system | instant | "A sublet cannot cost more than your own rent." |
| `SUBLET-DUR-03` | beyond the head lease | blocked | system | instant | "This ends after your own tenancy does." |
| `CON-MISSING-02` | mandatory annex absent | blocked | system | instant | "The contract cannot be generated until all disclosures are complete." |
| `DEP-CAP-03` | deposit > 2× rent | blocked | system | instant | "The deposit cannot exceed two months' rent." |
| `DEP-PAYER-04` | payer ≠ tenant | hold funds | ops | 4 h | "The payment came from a different account. We are checking." |
| `DEP-NOCONF-01` | no dual confirmation | hold | ops | 7 d | "The handover was not confirmed by both sides." |
| `DEP-DISPUTE-02` | deposit withheld | dispute | ops | 10 d | "The deposit is in dispute. Your check-in pack is attached." |
| `INC-BREACH-01` | data breach | notify | ops | 72 h | "We are notifying you about an incident affecting your data." |
| `HUM-SLA-01` | hold unreviewed 24 h | escalate | ops | 24 h | "This listing is still in review; it has been escalated." |

### 6.8.1 Letter generation

```ts
const LETTERS: Record<string,(c:Ctx)=>string> = {
  'APP-ELIG-04': c => `Your application for ${c.address} could not be taken forward because the
student-status requirement was not met when you applied. This is a published criterion
(Selection rules v${c.ruleSetVersion}, item R1). You may re-apply once your enrolment is confirmed.`,

  'APP-DECLINE-07': c => `The landlord selected an earlier applicant in the published order.
Your position was ${c.position} of ${c.total}. This is not an assessment of you: applications are
ordered by submission time, exactly as published in Selection rules v${c.ruleSetVersion}.`,

  'CAP-EXCEEDED-09': c => `We could not accept this application because you already hold ten live
applications. This is a limit on attention, not a judgement about you. Withdraw one and apply again.`,
};
```
**Rule:** a decline with no letter is a bug. The letter is archived, hashed, and referenced from the audit row.

## 6.9 Scam-pattern scanner (deterministic, never an LLM)

```ts
const SCAM_RULES = [
  { id:'OFFPLAT-01', code:'MSG-OFFPLAT-01', test:(m:Msg)=>
      /(whats\s?app|telegram|signal|insta(gram)?|fb|facebook)/i.test(m.body)
      || /\b(\+?31|0)\s?6[\s-]?\d{8}\b/.test(m.body) },
  { id:'FEE-02', code:'MSG-FEE-02', test:(m:Msg)=>
      /\b(viewing fee|bezichtigingskosten|administration fee|reservation fee|borg eerst|pay (first|before))\b/i.test(m.body)
      || /\b(deposit|borg)\b.*\b(now|today|before viewing)\b/i.test(m.body) },
  { id:'ABROAD-03', code:'MSG-FEE-02', test:(m:Msg)=>
      /\b(i am|i'm) (abroad|out of the country)\b/i.test(m.body) },
  { id:'IDCOPY-04', code:'MSG-OFFPLAT-01', test:(m:Msg)=>
      /\b(send|upload).{0,24}(passport|id card|bsn)\b/i.test(m.body) },
];
```
**W2/W3 compliance:** this is regex over the message body with a reviewable rule list. No LLM classification, no authorship inference. Show the rule id next to each flag so a human can audit the logic.

## 6.10 Crowd control — the anti-gaming layer

The whole point: **do not build detectors, build structures that make gaming pointless.**

| Behaviour | Signal logged (action property, never authorship) | Response |
|---|---|---|
| Volume | `applications_per_hour > 6`, `per_24h > 10` | cap screen, not a judgement |
| Duplication | identical `payload_hash` across listings | flag for review |
| Ticket-collecting | high `offer` then instant `withdraw` | deprioritise future applications by **behaviour score used only for throttling**, never eligibility |
| Sock puppets | identity dedupe at attestation level | dedupe, one lottery number |
| Stale | no interaction 14 days | `APP-STALE-08` |
| Rush at listing open | burst from new accounts < 1 h old | require the identity attestation to complete first |

**Forbidden inputs to any of these:** message text, style, "professionalism", language proficiency, photo, social presence. Add as a test (§10, T-09).

## 6.11 Audit chain

```ts
function appendAudit(row: Omit<AuditRow,'seq'|'prevHash'|'hash'>): AuditRow {
  const prev = lastRow();
  const seq  = (prev?.seq ?? 0) + 1;
  const prevHash = prev?.hash ?? 'GENESIS';
  const hash = sha256(canonicalJson({ ...row, seq, prevHash }));
  return store.insert({ ...row, seq, prevHash, hash });
}
```
`canonicalJson` = sorted keys, no whitespace. Verify by recomputing from `seq = 1`; one tampered row invalidates everything after it. **Demo trick:** expose a dev-only "tamper row 7" button on the Audit tab and let the ChainStatus turn red live.

## 6.12 Declared-preference comparison — display, never score

```ts
interface FieldMatch { field:string; verdict:'MATCH'|'NEAR'|'DIFFERENT'|'UNKNOWN';
  studentValue:string; houseValue:string; weight:number; }

function compareProfiles(s:DeclaredProfile, h:DeclaredProfile):FieldMatch[]{
  const out:FieldMatch[] = [
    ordinal('sleepRhythm', s.sleepRhythm, h.sleepRhythm, ['early','average','late'], 3),
    ordinal('cleanliness', s.cleanliness, h.cleanliness, ['relaxed','average','tidy'], 2),
    ordinal('guests',      s.guests,      h.guests,      ['rarely','sometimes','often'], 2),
    categorical('smoking', s.smoking, h.smoking, 3),
    setOverlap('pets', s.pets, h.pets, 1),
    setOverlap('languages', s.languages, h.languages, 1),
    rangeOverlap('budget', s.budgetMaxEur, h.budgetMinEur, 4),
    rangeOverlap('duration', s.durationMonths, h.durationMonths, 2),
  ];
  return out.sort((a,b)=> (b.weight*sev(b.verdict)) - (a.weight*sev(a.verdict)));
}
const sev = (v:string)=> v==='DIFFERENT'?3:v==='NEAR'?1:0;
```
**UI rule:** render the top five as rows with both values and a neutral word (`same`, `similar`, `differs`). **No total, no percentage, no bar out of 100.** If both sides skipped the module: `Not compared — you both skipped this`.

---

# 7. Workflows and pipelines

## 7.1 Supply pipeline (listing lifecycle)

```
DRAFT ──submit──▶ CHECKING
CHECKING ──all PASS──▶ PUBLISHED
CHECKING ──any FAIL──▶ REFUSED
CHECKING ──any WARN──▶ HOLD
HOLD ──reviewer approves──▶ PUBLISHED        (override recorded + counted)
HOLD ──reviewer rejects──▶ REFUSED
HOLD ──24h no decision──▶ HOLD + HUM-SLA-01
PUBLISHED ──report upheld──▶ SUSPENDED
SUSPENDED ──appeal upheld──▶ PUBLISHED
REFUSED ──appeal with evidence──▶ HOLD
PUBLISHED ──landlord withdraws──▶ WITHDRAWN
PUBLISHED ──offer accepted──▶ LET
```
**Illegal:** `REFUSED → PUBLISHED` directly. There is always a human between them (W10).

## 7.2 Demand pipeline (applicant journey)

```
interest (1 tap)
  → identity attestation + dedupe        → DUP-ACCOUNT-01 (silent)
  → eligibility rules R1..R3             → APP-ELIG-04/05/06
  → activeness                           → APP-STALE-08
  → active cap (10)                      → CAP-EXCEEDED-09
  → priority + single lottery number
  → shortlist (15) ──▶ QueuePosition
  → commitment                           → CMT-MISSED-10
  → meeting                              → MEET-NOSHOW-11
  → choice (criterion-linked)            → APP-DECLINE-07
  → offer → contract → escrow → move-in
```

## 7.3 Silence / escalation clock

```
t+0     application submitted
t+48h   NUDGE_48H to landlord, applicant notified
t+72h   ESCALATE_72H to ops
t+96h   AUTO_ADVANCE — next applicant in order offered, both sides notified
        (escalations per 100 applications is a published metric)
```

## 7.4 Sublet pipeline

```
head tenant requests sublet
  → head lease verified .................. SUBLET-LEASE-01
  → landlord consent REQUESTED ──────────▶ AWAITING_CONSENT (hard gate, W11)
       landlord approves in-platform  ──▶ continue
       landlord declines / silent 10d ──▶ BLOCKED (SUBLET-CONSENT-01)
  → duration ≤ head lease end ........... SUBLET-DUR-03
  → rent ≤ head tenant's own rent ....... SUBLET-CAP-02
  → housing type ≠ social ............... SUBLET-SOCIAL-04
  → BRP registrable? disclosed prominently
  → subtenant verified (identity, student, inbound exchange if applicable)
  → 48-hour floor rule + ≥3 candidates met (or recorded waiver)
  → deposit via partner, ≤ 2× rent
  → LIVE ──▶ FILLED
```

## 7.5 Swap pipeline (top trading cycles)

```
students submit: what I am leaving + what I need + dates
  → both sides verified
  → 2-cycles detected first          → propose A↔B
  → 3-cycles next
  → each executed cycle:
        per-participant landlord consent (W11)
        duration & rent caps re-checked per leg
        contracts regenerated for each leg
  → SWAP_EXECUTED audit rows, one per participant
```

---

# 8. Sublet and swap module — requirements

## 8.1 Legal basis to display in the UI

| Constraint | Source | Where shown |
|---|---|---|
| A room sublet needs the landlord's permission; most Dutch leases forbid it outright | art. 7:244 BW | consent gate + explainer |
| Whole-home sublet has no legal basis without permission | art. 7:244 BW | blocked path |
| Duration cannot exceed the head lease | practice | date validation |
| Cannot profit above your own rent | practice | rent cap |
| Social housing is stricter, often prohibited | practice | housing-type check |
| Subtenant gains no rent protection; head tenant stays liable | practice | acknowledgement |
| Subtenant usually cannot register in the BRP | practice | prominent disclosure |

## 8.2 Required UI on the Sublet tab

1. **Consent status banner** — one of `AWAITING CONSENT` / `CONSENTED 12 Nov` / `REFUSED`, always visible, never dismissible.
2. **The three caps as live validators** — end date vs lease end, sublet rent vs head rent, deposit vs 2× rent. Each shows a red inline message naming the code.
3. **BRP answer, above the fold** — `Can the subtenant register here? Yes / No / Not sure`. If "No", a warning: "Your subtenant cannot register at this address."
4. **The 48-hour floor** — the "publish" button is disabled for 48 h with a visible countdown and the reason: *"A hurried choice is how people end up with the wrong housemate. You can review candidates now; publishing opens in 31 h."*
5. **Swap board** — two columns: *I'm leaving* / *I need*, with detected cycles surfaced as proposed cards ("Mutual swap with S044 — both dates align").

---

# 9. Simulation and the adversarial theatre

## 9.1 The Simulation tab

Port `housing-simulator.html` into `/simulate` as a React view. Requirements:

- Seeded run, `Step gate`, `Reset`, `Normal cohort` / `AI flood 60%` toggle, `Reveal all gates`.
- **Funnel** with nine rows, bars animating, attrition vs keep vs final colouring.
- **Live invariant panel** — seven rows, must stay green; turns red if a test-equivalent check fails.
- **Shortlist table** — 15 names, cohort badge, verified facts, registration, lottery number, met tick. Header states: *"15 names · 0 CVs · 0 applications read"*.
- **Cohort composition** panels — nationality, guarantor, AI-assistance level.
- **Four adversarial cards**, each runnable, each showing a computed result:
  1. `60% apply with AI to hundreds of rooms` → applications attempted, blocked by cap, "median time-to-first-view unchanged".
  2. `Ship an AI-text detector` → **numbers of wrongly excluded students, breaking down non-native vs native, with an explicit "do not build it"**.
  3. `Owner asks to filter "Dutch-speaking girls"` → blocked at lint, refusal criteria enforced.
  4. `One person, three accounts` → dedupe count, "one lottery number buys nothing extra".

## 9.2 MiroFish — where it may and may not be used

**Verified capability:** open-source swarm engine on OASIS (CAMEL-AI), GraphRAG via Zep, generated personas with memory, dual simulated social platforms, report agent. Typical run 10 rounds / 15–20 min / ~$3–5.

| Job | Tool | Rule |
|---|---|---|
| A. Scale rehearsal (214 agents) | **This deterministic simulator** | never an LLM — numbers must be reproducible |
| B. Adversarial red team | **MiroFish personas** | output = failing tests, never a decision |
| C. Rehearsing the human meeting | MiroFish personas | transcripts labelled `SIMULATED` |
| D. Choosing real people | **Never** | prohibited |

**The firewall, enforced as a test:** simulation modules are imported only by `/simulate` and the test runner. The allocation engine imports nothing from them.

**Documented bias to design around:** LLM agents converge to consensus faster than real populations because base models are agreeable. Mitigate with explicit stakes per persona (*"you have 21 days or you lose your enrolment"*), include hostile personas deliberately, and score the run on whether the hostiles *succeed*, not on whether the debate was pleasant.

## 9.3 Persona taxonomy (simulation only, never product data)

**Student parameters (11):** cohort · urgency_days · budget · guarantor · brp_need · language_declared · ai_assist_level · deception_willingness · commitment_capacity · social_network · prior_behaviour.

**Owner parameters (9):** owner_type · portfolio_size · compliance_history · rent_strategy · selection_style · discriminatory_request · response_latency_h · photo_hygiene · sublet_attitude.

**The eight adversarial personas:** `applicant_gamer_max` · `applicant_desperate_non_native` · `applicant_sock_puppet` · `owner_karen` · `owner_silent` · `agent_mandate_abuser` · `muni_inspector_hostile` · `lawyer_annex_iii`.

> **Two of these are self-restraint tests.** `applicant_desperate_non_native` and `lawyer_annex_iii` exist to fail your own features. If a proposed change makes either fail, the change is wrong regardless of how it demos.

## 9.4 Testimonials

**Never** present simulated output as a real user quote. Label every synthetic artefact in the UI, permanently: `SIMULATED — rehearsal for design, not user research`. The honest line for the pitch:

> "We have not talked to 200 students — we are two days old. What we have is a specification of their behaviour and a simulation that runs it. When we do talk to them, this slide gets replaced with the real quotes."

---

# 10. Legal and integrity invariants — as tests

Each maps to a wall rule in §2. Put them in `tests/invariants.spec.ts`.

```
T-01  schema lint: zero field names matching
      /(personality|trait|mbti|bigfive|big_five|fit_score|compatibility_score|trust_score|behaviour_score|character)/i
T-02  no function receives free-text and returns a number used in ordering or eligibility
T-03  grep: no AI-detection dependency, no 'aiProbability', no authorship scoring anywhere
T-04  only sha256() and dhash() accept image bytes
T-05  phone is never read by IdentityAdapter or any check module
T-06  no endpoint accepts a document mime type; no column matches /(passport|id_doc|bsn|document|scan)/i
T-07  no deposit ledger/balance table exists; deposit state written only by EscrowAdapter
T-08  POST /applications/:id/reorder returns 501; Application.position written in exactly one place
T-09  assignPosition / runFunnel / evaluateRules import nothing from reputation or simulation
T-10  every REFUSED or HOLD creates a review task with an SLA; REFUSED→PUBLISHED throws
T-11  Sublet cannot reach LIVE without landlordConsent.granted === true
T-12  every rendered MockBadge carries a non-empty issuer string; zero mock values rendered without one
T-13  funnel monotonicity: expressed ≥ dedupe ≥ … ≥ housed, and shortlist ≤ 15
T-14  determinism: runFunnel(seed) twice → deep-equal JSON
T-15  every CheckResult with FAIL/WARN has a code present in REASON_CODES
T-16  decline without { code } → 422 CODE_REQUIRED and no state mutation
T-17  audit chain verifies over 1,000 rows; tampering row 7 invalidates rows 7+
T-18  name similarity table passes (5 cases from §6.2.2)
```

### 10.1 Accessibility and visual tests

```
A-01  axe: 0 critical/serious on all seven tabs, light and dark
A-02  complete the fraudulent-listing scenario with keyboard only
A-03  prefers-reduced-motion disables all animation
A-04  no horizontal overflow at 390 / 768 / 1024 / 1440px (all tabs)
A-05  tabular-nums applied to every metric, position, money and code figure
A-06  every verdict has a word, not only a colour
```

### 10.2 Demo-integrity tests

```
D-01  the four fixtures produce their exact expected gate outcomes
D-02  funnel with seed 20261111 equals the expected 9-number array
D-03  reload preserves audit rows and the chain still verifies
D-04  the three guided scenarios complete headless start to finish
```

---

# 11. Tab-by-tab build specification

Each tab: purpose · layout · components · data · states · acceptance.

## 11.1 Tab 1 — Discover `/discover`

**Purpose:** prove a verified listing looks and feels like a premium property site.
**Layout:** left filter rail (240px, sticky) · centre results grid (2–3 columns) · right "why this order" panel (300px, sticky).
**Header:** eyebrow `12 verified rooms in Delft` · serif title `Rooms we can prove someone owns` · lede one sentence · meta row (`verified this week`, `median rent vs ceiling`).
**Card:** 4:3 photo, `StatusPill` top-left (PUBLISHED), `MockBadge` bottom-right, serif title (`Oude Delft 118`), mono rent `€620 / mo`, ceiling comparison line, two `ActorChip`-free trust rows: `✓ owner matched 12 Nov` · `✓ photos unique`.
**Right panel:** "Why this order" listing the active sort keys **read from the same object as the sort function**.
**States:** empty (`No rooms match — the ceiling for 14 m² rooms in this postcode is €X, and the three listed here are above it`), loading (skeleton cards, no spinner), error (code + retry).
**Acceptance:** the sort panel and the actual order cannot disagree; there is no "recommended for you" surface.

## 11.2 Tab 2 — Room `/room/:id`

**Purpose:** the gate, made visible.
**Layout:** two columns — photography + description left; sticky evidence column right (380px).
**Components:** `GateSummary` (the six checks with verdicts), `CeilingBreakdown` table, `StatusPill`, `MockBadge`s, the `DeclaredProfile` comparison (top five rows), the apply CTA.
**Copy on the badge:** `Six checks passed · owner matched 12 Nov 2026 · photos unique · rent €620 against a legal maximum of about €651 for 100 points`.
**States:** HOLD shows *why* and what happens next (24 h, human). REFUSED shows the letter link and the appeal path. SUSPENDED hides apply entirely.
**Acceptance:** a visitor can state, unprompted, what was checked and when.

## 11.3 Tab 3 — Hospiteer `/hospiteer`

**Purpose:** the lawful answer to "can we use personality to pick housemates".
**Layout:** three stacked sections — **The procedure** (6 numbered steps, published), **This house** (house profile + lint status), **Parity** (the monthly cohort table).
**Components:** procedure stepper, house profile card (`PROF-LINT-01` state if it trips), pool table (15 rows, cohort badges), meeting schedule with identical 20-minute slots, parity chart as a plain table with ratio column.
**Interaction:** a dev toggle `Simulate a resident preference` shows the choice happening and the criterion-linked refusal being generated.
**Copy at the top:** *"Residents choose. But only among people who had an equal, verified, recorded shot."*
**Acceptance:** the prohibited-phrase lint blocks a request for a nationality; the parity table renders with a ratio column and a flip-to-lottery rule stated.

## 11.4 Tab 4 — Sublet & Swap `/swap`

**Purpose:** the exchange feature, legally gated.
**Layout:** two columns — **Sublet my room** (form + validators) and **Swap board** (cycles).
**Components:** consent banner, three live validators, BRP disclosure, 48-hour publish countdown, verified-subtenant card, swap cycle proposals, per-leg consent status.
**States:** `BLOCKED` (no consent) · `AWAITING_CONSENT` · `LIVE` · `FILLED`, plus swap `PROPOSED`/`EXECUTING`/`DONE`.
**Acceptance:** a sublet with rent above head rent cannot be created; publishing before 48 h is disabled with a countdown; a 2-cycle is detected and shown.

## 11.5 Tab 5 — Simulation `/simulate`

Port of `housing-simulator.html` (§9.1). **Acceptance:** funnel matches seed, invariants green, four adversarial cards runnable and computed.

## 11.6 Tab 6 — Dashboard `/dashboard`

**Purpose:** what the municipality buys.
**Layout:** metric row (4 `MetricTile`s) · refusals-by-code table · coverage · override rate **adjacent to** refusal rate.
**Components:** `MetricTile`s for refusal rate, listings refused by code, override rate, coverage; a code-frequency table; a trend sparkline (optional, cut first).
**Copy:** *"Every figure here comes from a row in the audit log. Click any number to see the rows behind it."*
**Acceptance:** every tile is clickable through to a filtered Audit view.

## 11.7 Tab 7 — Audit `/audit`

**Purpose:** the proof.
**Layout:** chain status bar at top (`1,498 / 1,498 rows verified`), then a virtualised table, then the reason-code dictionary.
**Components:** `ChainStatus` (red state), `AuditRowView` rows with hash prefixes, filter by action/actor/subject, **dev-only "tamper row 7"** button, `/codes/:code` dictionary section.
**Acceptance:** tampering turns the chain red; the dictionary covers every code in the product.

---

# 12. Copy deck

Voice: first person plural, plain, specific, never cheerful about a refusal.

- **Gate refused:** "This listing cannot go live. Two checks failed and one needs disclosure — the reasons are below and have been sent to the poster."
- **Gate passed:** "Six checks passed. What we verified, and when, is shown on the listing."
- **Rent:** "The asking rent is €780. The legal maximum for this room's 60 points is about €406. Asking above it is not automatically unlawful, but you should know the number."
- **Queue position:** "You are number 4 of 15. Applications are ordered by registration duration, as published in Selection rules v1.2. Nothing about you personally affected this position."
- **Cap:** "You can hold ten live applications at a time. This is a limit on attention, not a judgement about you."
- **Decline blocked:** "A decline must reference a published criterion, so the applicant can see why."
- **Hospiteer:** "Residents choose their housemate. They choose only from people who had an equal, verified, recorded shot — and we publish how that turns out."
- **Sublet consent:** "A sublet needs the owner's written consent. We have asked them; you will see their answer here."
- **48-hour floor:** "A hurried choice is how people end up with the wrong housemate. You can review candidates now; publishing opens in 31 hours."
- **Detector refusal:** "We do not score what you write. Detectors like that wrongly flag about one in four non-native speakers, and we are not building something that does that."
- **Mock disclosure:** "Demo environment. Identity, ownership, address and register checks are simulated; the issuer is shown on every result."

**Never write:** "Something went wrong" · "Oops" · "AI-powered matching" · "100% safe" · "Trusted by thousands" · "3 people are viewing now" · any claim that fraud is eliminated.

---

# 13. Metrics

Derive every metric **from the audit log**, not from separately maintained counters.

| Metric | Definition | Tab |
|---|---|---|
| `refusal_rate` | refused / (refused + published) | Dashboard |
| `refusals_by_code` | grouped count | Dashboard |
| `override_rate` | reviewer overrides / gate decisions | Dashboard (adjacent to refusal rate, deliberately) |
| `coverage` | listings with a complete badge / published | Dashboard |
| `holds.median_review_minutes` | HOLD → decision | Dashboard |
| `applications.median_time_to_offer` | submitted → OFFERED | Dashboard |
| `applications.escalations_per_100` | APP-SILENT-06 events / applications × 100 | Dashboard |
| `rejections.with_code` | must always be 100% | Dashboard health |
| `messages.offplatform_flags_per_100` | nudge detections | Dashboard |
| `hospiteer.parity_ratio` by cohort | chosen / invited | Hospiteer |
| `deposits.through_partner` | % of tenancies | Dashboard |
| `sim.time_to_housing_median` | funnel run | Simulation |
| `chain.verified` | recomputed rows | Audit |

---

# 14. Build order

| Phase | Deliverable | Time |
|---|---|---|
| 1 | Tokens, shell, tab routing, the 17 components on `/kitchen-sink` | 1 d |
| 2 | Domain types, mock store, fixtures, audit chain, tests T-01…T-18 | 1 d |
| 3 | Adapters + mocks + `adapter_runs` log | ½ d |
| 4 | Room tab: gate, `GateSummary`, `CeilingBreakdown`, letter | 1 d |
| 5 | Discover tab + why-this-order | ½ d |
| 6 | Funnel + priority + deferred acceptance (pure functions + tests) | 1 d |
| 7 | Hospiteer tab: procedure, lint, pool, parity | 1 d |
| 8 | Sublet & swap tab: consent gate, validators, TTC | 1 d |
| 9 | Simulation tab: port the simulator, four adversarial runs | 1 d |
| 10 | Dashboard + Audit tabs, tamper demo | ½ d |
| 11 | Accessibility, reduced motion, mobile, headless scenario tests | 1 d |

**Cut in this order if time is short:** dashboard sparklines → institution report → appeals → viewing records → trend charts.
**Never cut:** the gate, `CODE_REQUIRED` decline, the cap, the audit chain, the reason-code dictionary, the four adversarial runs, the wall tests.

---

# 15. Appendix A — the answers carried forward

These are the conclusions from the design conversation, stated so the agent does not re-litigate them.

**A1. Personality testing cannot select housemates.** Taemio's instrument is legitimate for team optimisation because nobody is denied anything by it. Pointed at 200 applicants for one room, it becomes a classification of persons on inferred personality characteristics — Annex III 5(d) — and a rejection based on it collides with GDPR Art. 22 and with the WGV's requirement of objective, pre-published criteria. Independently, high stakes degrades self-report, and the construct does not predict outcomes: in the closest available empirical test, a "70% match" became a mutual like 8% of the time, and the largest actual deal-breaker carried zero weight.

**A2. The lawful replacement already exists in Dutch practice.** Hospiteren: objective pre-selection, then the residents choose among an equal pool. Legal analysis concludes it survives the WGV if the procedure is published, the pool is set objectively, refusals cite a published step, and the choice happens after everyone had an equal shot. The sector is moving this way anyway — SSH has abolished it in new buildings and kept it in ~6,500 existing rooms; DUWO wants centralised listing with objective pre-selection of ~15. **Build the auditable version of the middle.**

**A3. The gaming problem is an incentive problem, solved by mechanism design.** Asking better questions does not work. Choosing procedures where lying cannot help does. Under student-proposing deferred acceptance, truthful ranking is a *proven dominant strategy*, so the platform can tell applicants the truth: "rank what you actually want; lying cannot help you."

**A4. Do not build AI-text detection.** In hiring, detectors carry a 23% false-positive rate for non-native speakers versus 4% for native speakers, and AI text is near-undetectable after one human edit. For a product serving international students, that is a proxy for national origin — prohibited distinction under the AWGB. Remove the scored field instead.

**A5. Volume is beaten by structure, not filtering.** Active-application cap, one identity, one ranked list, one lottery number.

**A6. Lottery is not a cop-out.** It is named by the brokers' association as an objective selection method, used for roughly one in twelve Dutch social homes, and recommended explicitly as an anti-discrimination instrument.

**A7. Subletting is legally gated and the gates are the product.** art. 7:244 BW: landlord permission almost always required, duration bounded by the head lease, no profit above own rent, subtenant gets no rent protection, BRP registration usually unavailable. Consent as a hard in-platform gate is the single biggest fix — and a service a landlord will pay for.

**A8. Exchange pairing is the strongest novel idea.** Outbound and inbound student flows are bilateral and semester-timed. Top trading cycles are strategy-proof and Pareto-efficient, and they create a matched pair from two existing rooms in a market short 20,000+.

**A9. Simulation is for rehearsal, never decision.** Deterministic for scale, LLM personas for adversarial red-teaming. The agents argue about the system, never about a person.

---

# 16. Appendix B — sources

| Figure | Value | Source |
|---|---|---|
| Student-room shortage NL | ~21,500; 23,000–30,000 projected 2026 | Kences Landelijke Monitor |
| Rental-fraud reports | 175 in H1 2026 vs 21 in the prior half-year | Fraudehelpdesk |
| Hotline reports that are scams | 11% (2025), from 1.4% (2022), 9.3% (2024) | LSVb |
| WWS-O ceiling 2026 | 143 pts ≈ €932.93; 186 ≈ €1,228.07; uncapped ≥187 | Huurcommissie |
| Rooms above the legal maximum | ~6 in 10 | Huurcommissie / market reporting |
| Landlord duties | in force 1 July 2023 | Wet goed verhuurderschap |
| Rent-fraud / discrimination fines | up to €22,500 per case | WGV enforcement reporting |
| Lottery share of social housing | ~8% in 2024 | sector reporting |
| "No internationals" prohibition | prohibited distinction; private-character exception at Oordeel 2010-179/180; inconsistent policy presumption Oordeel 2003-18 | College voor de Rechten van de Mens |
| International students reporting exclusion | 57% | LSVb survey |
| Hospiteer rooms restricted to association members (Leiden) | ~40% | NRC |
| AI-assisted applications encountered | 77% of hiring teams (2026) | Willo / Resume Genius |
| Applicants using AI to complete applications | 45% | Canva via eWeek |
| Prompt-injection in applications | 41% admit | Greenhouse 2025 |
| Applicants per posting | 254 | Greenhouse |
| Detector false positives | 23% non-native vs 4% native | 2026 detection meta-review |
| AI text after one human edit | near-undetectable | Univ. of Maryland 2024 |
| Taemio | ~200–300 swipes, ~15 min, Big Five + animal, DISC/Belbin | taem.io |
| Roommate score validity | 70% match → 8% mutual like; gender preference zero weight; 78% likes unseen | independent 325k-swipe analysis |
| Subletting | art. 7:244 BW; permission required; duration bounded; no profit; no rent protection | Dutch civil code + practice |
| Deferred acceptance | Gale–Shapley 1962; strategy-proof for proposers (Dubins–Freedman 1981); NYC school choice since 2005; NRMP since 1952 | mechanism design literature |
| Top trading cycles | Shapley–Scarf 1974; strategy-proof, Pareto-efficient | mechanism design literature |
| AI Act | Art. 5 prohibitions from 2 Feb 2025; Annex III 5(d) high-risk from 2 Dec 2027; Art. 50 from 2 Aug 2026 | Reg. (EU) 2024/1689 |
| eIDAS 2.0 | wallets by 24 Dec 2026; in-scope reliance by 24 Dec 2027 | Reg. (EU) 2024/1183 |
| DSA trader traceability | collect, best-efforts verify, publish, suspend | Reg. (EU) 2022/2065 Art. 30 |
| MiroFish | OASIS/CAMEL-AI swarm engine, GraphRAG + Zep, dual platform sim, ~10 rounds / 15–20 min / $3–5 | tool documentation and user reports |

**Footer required in the app:** *"Working demo for a hackathon. Checks are simulated where marked. Detector figures are used as a simulation input, attributed. Not legal advice."*

---

# 17. Appendix C — open questions to resolve with real users

List these in the README; they are the honest gaps.

1. Is 10 the right active-application cap? Test 5 / 10 / 15 with students.
2. Do municipalities want per-code refusal counts, or per-neighbourhood overpricing? Ask three.
3. Would a €5–10 refundable commitment deter the casual applicant without deterring the poor? Test with the international office.
4. What meeting format produces comparable judgements in 20 minutes? Observe six real hospiteer evenings.
5. Which institution is the first payer, and what does their procurement need?
6. Does the 48-hour floor on sublets create more harm (rooms sitting empty) than it prevents?
7. What is the real cost of a Kadaster lookup at volume, and can it be absorbed?

---

*End of spec. Phase 2 — domain, audit chain and the eighteen invariants — before any screen. The wall is the product; everything else is presentation.*

---

# 18. Appendix D — build log (what now exists)

The demo described in this document has been built and lives in `/home/user/app`.

| Phase (§14) | Status | Where |
|---|---|---|
| 1 Tokens, shell, seven tabs, components | done | `src/styles.css`, `src/components/` |
| 2 Domain types, mock store, fixtures, audit chain, invariants | done | `src/domain/` — **85 assertions passing** |
| 3 Adapters + mocks + `adapter_runs` log | done | `src/domain/adapters.ts` |
| 4 Room tab: gate, ceiling, letter, CODE_REQUIRED decline | done | `src/screens/Room.tsx` |
| 5 Discover tab + why-this-order | done | `src/screens/Discover.tsx` |
| 6 Funnel, priority, deferred acceptance, TTC | done | `src/domain/algorithms.ts` |
| 7 Hospiteer tab: procedure, lint, pool, parity | done | `src/screens/Hospiteer.tsx` |
| 8 Sublet & swap tab: consent gate, caps, TTC board | done | `src/screens/Swap.tsx` |
| 9 Simulation tab + four adversarial runs | done | `src/screens/Simulate.tsx` |
| 10 Dashboard + Audit tabs, live tamper demo | done | `src/screens/Dashboard.tsx`, `Audit.tsx` |
| 11 Accessibility, reduced motion, mobile, headless checks | done | 0 px overflow at 390/1440, 0 console errors, both themes |

**Two deviations, both deliberate and recorded here rather than in code comments:**

1. **The funnel was calibrated, not asserted.** The generator proportions in §5.4 were fitted with `scripts/calibrate.ts` under an explicit prior that keeps the cohort mix at the documented NL 42 / EU 28 / non-EU 30. Without the prior the optimiser absorbed every gate into the cohort proportions and hit the target funnel exactly — which would have made the dashboard's equity numbers a lie while every test passed. The prior is the difference between a simulation and a fit.
2. **The points model gained a base term.** A raw surface + energy + facilities sum put a furnished 16 m² student room at 36 points and therefore under no ceiling at all — the ceiling never bound, and every room would have shown "under ceiling" including a €980 one. A 60-point dwelling base brings a 16 m² furnished room to ~104 points, under the €932.93 / 143-point threshold, which is where such a room actually sits. The anchors themselves are unchanged.

Run it: `cd app && npm run dev`, then `npm test` for the wall.
