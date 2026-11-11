# Build brief — "Verified" student housing demo

**A complete specification for an agent to build a working, interactive demo.**

| | |
|---|---|
| **Document type** | Implementation brief / build spec |
| **Product working name** | **Verified** (rename freely) |
| **One line** | A verification gate and auditable allocation layer for student rooms — not another listing board. |
| **What the demo must prove** | (1) A listing cannot go live unless ownership, photos and rent clear deterministic checks. (2) Applicants are ordered by published rules, never by inferred traits. (3) Every outcome produces a reason code and an audit row. |
| **Audience for the demo** | A hackathon jury, a municipal housing desk, a university international office. |
| **Format** | Single self-contained web app. Front-end demo must run with **zero network calls**; all third-party verifications are mock adapters behind stable interfaces. |
| **Prepared** | November 2026 |

> **Read this first.** This is a **demo with mock adapters**, not a production system. Where a real integration exists (iDIN, Kadaster, BAG, VIES/BRIS, WWS-O, reverse image search), the brief specifies an *interface*, a *reference mock*, and the *honest label* the UI must display. Nothing in the demo may present mock data as a live government lookup. Section 14 is the hard list of things that must never appear in the codebase.

---

## Table of contents

1. [Positioning and success criteria](#1-positioning-and-success-criteria)
2. [Non-goals and permanent exclusions](#2-non-goals-and-permanent-exclusions)
3. [Actors, roles and permissions](#3-actors-roles-and-permissions)
4. [The pipeline — 10 stages, 62 steps](#4-the-pipeline--10-stages-62-steps)
5. [Domain model](#5-domain-model)
6. [Verification algorithms](#6-verification-algorithms)
7. [Matching and allocation algorithms](#7-matching-and-allocation-algorithms)
8. [Reason code dictionary](#8-reason-code-dictionary)
9. [State machines](#9-state-machines)
10. [API surface](#10-api-surface)
11. [Adapters — interfaces and mocks](#11-adapters--interfaces-and-mocks)
12. [Audit log and hash chain](#12-audit-log-and-hash-chain)
13. [Design system](#13-design-system)
14. [Legal invariants enforced in code](#14-legal-invariants-enforced-in-code)
15. [Screens and states](#15-screens-and-states)
16. [The demo script — three scenarios](#16-the-demo-script--three-scenarios)
17. [Copy deck](#17-copy-deck)
18. [Instrumentation and displayed metrics](#18-instrumentation-and-displayed-metrics)
19. [Testing and acceptance criteria](#19-testing-and-acceptance-criteria)
20. [Build order](#20-build-order)
21. [Appendix A — seed fixtures](#appendix-a--seed-fixtures)
22. [Appendix B — sources and figures](#appendix-b--sources-and-figures)

---

## 1. Positioning and success criteria

### 1.1 The insight the demo must embody

In a shortage market a landlord has no distribution problem — a single posting receives hundreds of responses. So a housing platform's sellable value to landlords is **screening, compliance and reduced risk**, not reach. And the harm is directional: fraud runs from fake landlords toward students, so **verification of the supply side is the product**, and verification of the renter is a deliberately light secondary step.

### 1.2 What the product is

1. **A gate.** A listing is a private draft until six deterministic checks clear it. Output is a status for a listing plus reason codes — never a score for a person.
2. **An allocator.** Applications are ordered by a published rule (first-come or registration duration). The UI cannot reorder by feel. Every decline carries a code and an auto-generated written motivation.
3. **An audit trail.** Append-only rows a municipality can inspect, surfaced as a dashboard someone pays for.

### 1.3 Demo success criteria (must all be demonstrable in under 4 minutes)

- [ ] A fraudulent listing is **refused in under 10 seconds of demo time**, with three named reason codes visible.
- [ ] The same pipeline, switched to a genuine listing, **publishes with a verified badge** showing what was checked and when.
- [ ] A student applies, is placed at a **visible queue position derived from a published rule**, and the "why this position" explanation is shown.
- [ ] A landlord tries to decline without a reason code — the action is **impossible in the UI**, not merely discouraged.
- [ ] The **refusal log** shows every decision with its code, reviewer, timestamp, and survives a page reload.
- [ ] Switching to the **silent landlord** scenario demonstrates the 48-hour escalation and auto-advance.
- [ ] A jury member can inspect the schema and confirm there is **no field anywhere for a personality or trait score**.

### 1.4 Tone

Competent, institutional, quietly confident. The demo is about *defensibility*, so the design should feel like an audit tool that happens to be pleasant, not a consumer marketplace with a compliance tab. No exclamation marks, no gamification, no confetti.

---

## 2. Non-goals and permanent exclusions

These are **not** roadmap items. They are structural exclusions, and section 14 turns most of them into failing tests.

| Excluded | Reason | Enforcement |
|---|---|---|
| Personality, trait, MBTI/Big Five, "fit" or compatibility **scoring of people** | AI Act Annex III 5(d) makes classification of persons on inferred personality characteristics high-risk; Dutch rental law requires objective, pre-published criteria | Schema lint; no such field may exist (14.1) |
| Emotion or sentiment inference from messages | Unreliable across languages; feeds a housing decision | No NLP classification of applicants (14.2) |
| Photo/biometric trait inference | AI Act Art. 5(1)(g) prohibits biometric categorisation of sensitive attributes | Images are hashed and compared, never classified for attributes (14.3) |
| Social-media or off-platform profile gathering | No lawful basis for a housing decision | Outbound fetches limited to the declared adapter allowlist (14.4) |
| Holding deposits or rent in our own account | PSD2 / safeguarding / AML — custody makes you a payment institution | Deposit instructions point only to the partner adapter (14.5) |
| Ranking applicants by "fit" | Reordering the objective queue | Queue is server-ordered and the API has no reorder endpoint (14.6) |
| Automatic rent-setting suggestions | Directly conflicts with WWS-O ceilings | No rent-suggestion endpoint; rent fields are read-only against the ceiling (14.7) |
| Phone number as an identity signal | A prepaid SIM proves a phone, not a person | Phone is contact data only, never an attestation (14.8) |
| Storing passports, ID documents or BSNs | Data minimisation; a breach becomes a catastrophe | No document upload endpoint exists (14.9) |
| National rollout in the demo | Verification is local and human | One city, one institution, seeded |

---

## 3. Actors, roles and permissions

Eight actors. Every one of them has a colour token used consistently in diagrams, badges and ledger entries.

| Key | Actor | Colour token | Can do | Cannot do |
|---|---|---|---|---|
| `landlord` | Private owner | `--landlord` `#ff6b4a` | Create listings, accept/decline with a code, message in-platform | Reorder queue, decline without a code, hold the deposit, set rent above ceiling without disclosure |
| `agent` | Makelaar / professional | `--agent` `#ffb347` | List on behalf of an owner **with a mandate**, see trader profile duties | List without a mandate; bypass DSA Art. 30 traceability |
| `student` | Renter | `--student` `#5aa9ff` | Browse, declare preferences, apply, message, report, appeal | See another applicant's data; see landlord contact details before an offer |
| `system` | Automated gate | `--system` `#c58cff` | Run six checks, emit reason codes, order the queue | Score a person, decide a rejection, remove a listing permanently |
| `ops` | Human reviewer | `--reviewer` `#2fd4c4` | Review holds, override the gate **with a recorded reason**, triage reports, suspend | Override without a reason; edit the audit log |
| `inst` | Institution | `--inst` `#35e08b` | Verify student status claims, view cohort report | See individual applicants' data beyond aggregate |
| `muni` | Municipality | `--muni` `#ff79b0` | Read the dashboard, export audit rows, read refusal log | Modify anything; see applicant identities |
| `money` | Payment/escrow partner | `--money` `#ffd166` | Hold deposit, release on dual confirmation, return payer-match verdict | Initiate a tenancy; accept funds on our behalf |

### 3.1 Permission matrix (implement as a single table, not scattered checks)

```
resource            landlord  agent  student  ops   inst  muni  money
listing:draft         own      own     -       -     -     -     -
listing:publish       own*     own*    -       -     -     -     -
listing:read          own      own    live*   all   agg   agg   -
check:run              -        -      -      all    -     -     -
hold:review            -        -      -      all    -     -     -
application:create     -        -     own     -      -     -     -
application:decide    own*      own*    -       -     -     -     -
application:reorder   NEVER    NEVER   NEVER   NEVER  NEVER NEVER NEVER
queue:read            own*      own*   own+    all    -     -     -
audit:read             -        -      own*    all    agg   all   own*
report:create          -        -     own     -      -     -     -
report:triage          -        -      -      all    -     -     -
metric:dashboard       -        -      -      all    agg   all   -
* scoped to own resources    live* = only listings with status PUBLISHED
own+ = own position and count only, no identities
```

---

## 4. The pipeline — 10 stages, 62 steps

The demo must visualise all ten. Stages 1 and 10 are mostly paperwork and reporting, but they are in the demo because they are what makes stages 3 and 6 defensible. Each stage below gives: purpose, actors, numbered steps, **outputs**, data written, legal checkpoint, displayed metric.

Outputs are marked with a channel so the demo's ledger can render them differently: `[art]` neutral artefact, `[ok]` success, `[bad]` blocked/refused, `[warn]` escalation.

### Stage 1 — Foundation `--reviewer`

> Nothing user-facing exists yet. Six artefacts get written that every later stage depends on. If this stage is skipped, stages 3, 6 and 10 are illegal rather than merely unfinished.

1. Run the **Art. 5 screen**, one paragraph per planned feature: which prohibition it could touch and why it does not.
2. Write the **classification memo**: this system assesses listings, documents and eligibility against published rules; it does not evaluate or classify natural persons, so Annex III point 5(d) does not apply.
3. **Publish the selection criteria**: student status, income or guarantor, household size, then allocation by published order. Versioned and dated.
4. **DPIA**, data map, retention schedule.
5. Sign the **rails**: identity, ownership, address, register, escrow, hosting — five agreements, one named counterparty each.
6. **Publish the reason-code dictionary** (section 8) on a public page.

**Outputs:** `[art] Screening memo` `[art] Classification memo` `[art] Criteria page v1` `[art] DPIA + register` `[art] 5 contracts` `[art] Code glossary`
**Data:** memos, criteria version, processing register.
**Legal:** AI Act Art. 5 screen + Art. 4 literacy; GDPR Art. 35; WGV criteria-before-selection; DSA Art. 30 design shape.
**Metric:** 6 artefacts published; criteria version and date visible.
**Gate to leave stage:** a lawyer or the municipal housing desk reads the memo and says it is defensible.

### Stage 2 — Landlord onboarding `--landlord`

> The supply side is verified first, because the fraud runs from fake landlords toward students. Three account types, because a private owner letting one room is a different legal animal from a professional trader.

1. Create account; **declare type**: private owner / professional (KvK) / agent under mandate.
2. **Identity assertion** — boolean + issuer + date. Never a document.
3. **Trader checks** for professionals: KvK against VIES and the national register via BRIS, plus the compliance self-certification.
4. **Ownership claim** against the Kadaster record, or a **management mandate** for agents.
5. **Accept the operating rules** — itemised, explicit: deposit ≤ 2× rent, in-platform messaging, no upfront fees, objective criteria, written reasons.
6. **Profile live** with dated badges, listing count, median response time.

**Outputs (genuine):** `[art] Account type` `[ok] Identity attestation` `[ok] KvK verified` `[ok] Ownership match`
**Outputs (fraud):** `[bad] ID-FAIL-01 · blocked` `[bad] Trader suspended`
**Outputs (silent landlord):** `[art] Mandate review queued` `[ok] Ownership match`
**Data:** account type, identity attestation, KvK/VIES result, ownership attestation or mandate ref, rules acceptance, public profile.
**Legal:** DSA Art. 30 (collect, best-efforts verify, publish, suspend); GDPR minimisation; eIDAS — iDIN today, wallet later.
**Metric:** % listings with matched owner; median time to verify; suspended traders.

### Stage 3 — Listing creation and the gate `--system`

> The core product. A listing is a private draft until six deterministic checks clear it. The output is always a status for a listing with reason codes.

1. **Draft** — address, rent, size, facilities, photos, house rules, availability, deposit. Invisible to search; expires if abandoned.
2. **Photo integrity** — hash, corpus compare, external reverse search.
3. **Address** — BAG lookup: exists, residential, postcode/street consistent.
4. **Rent vs WWS-O ceiling** — point estimate, ceiling, visible disclosure. *Asking above the ceiling is not per se unlawful, so this check discloses rather than refuses.*
5. **Per-listing ownership re-check** — this address against this identity. A verified account listing someone else's address is the failure mode to catch.
6. **Gate decision** — `PUBLISH` / `HOLD` / `REFUSE`, with every failing check named. Deterministic, no confidence score.
7. **Human review of holds** within 24 h — a named person, recorded reason, counted override.
8. **Publish with the badge** — what was checked, when.

**Outputs (genuine):** `[ok] PUBLISH · 6/6 checks` `[art] Verified badge` `[art] WWS-O ceiling shown` `[art] Audit row`
**Outputs (fraud):** `[bad] LOT-DUP-01` `[bad] LOT-OWNER-02` `[warn] LOT-RENT-04 disclosed` `[bad] REFUSE + letter` `[bad] Refusal logged`
**Data:** draft, image hashes, BAG result, point estimate, per-listing ownership verdict, status + codes, reviewer decision.
**Legal:** WGV objective criteria; AI Act — the decision is about a listing, not a person; DSA Art. 16.
**Metric:** listings refused by code; median time to decision; override rate; % listings with a complete badge.

### Stage 4 — Student onboarding `--student`

> Deliberately light. Verifying the renter protects the landlord, so it stops at identity, age and student status with an expiry date.

1. Email sign-up. **No phone-as-identity.**
2. Identity + age assertion (iDIN today, EUDI wallet later). Selective disclosure: the platform learns "over 18" and "real person", not a document number.
3. **Student status with an expiry window** — institution SSO claim, or a Bewijs van Inschrijving stored as a *result*. A graduate in July is not a student in September.
4. Declared budget and guarantor. Declared, never inferred. No bank-statement scraping.
5. **Sharing consent**, revocable in one screen, with a plain-language log of who saw what.
6. Profile visible **only after a mutual match**.

**Outputs:** `[art] Identity attestation` `[art] Student attestation (expires)` `[art] Declared affordability` `[art] Consent record`
**Legal:** GDPR purpose limitation, minimisation, revocability; no Art. 9 inference; eIDAS selective disclosure.
**Metric:** % verified students; attestation freshness; consent revocations honoured < 1 min.

### Stage 5 — Discovery and declared preferences `--student`

> Where the personality idea usually gets smuggled in, and where it is replaced. Compatibility comes from what both sides declare, shown as fields that matched.

1. Search and filter — deterministic, visible, no hidden personalisation.
2. **Rank listings** by availability, price relative to ceiling, distance, freshness. The viewer's attributes never change the ranking.
3. **Declared preference module** — 10–12 fields, symmetric.
4. **The landlord answers the same questions about the house** — not about themselves.
5. **Show which fields matched**, largest difference first. No composite score, no percentage.
6. **Why-this-order transparency panel** — why this listing, why this order, what would change it.

**Outputs:** `[art] Declared profile` `[art] House-side profile` `[art] Match list (no score)` `[art] Why-this-order panel`
**Legal:** DSA Art. 25 (no dark patterns); AI Act Art. 50 transparency; GDPR — no profiling of the person.
**Metric:** time from live to first view; declared-profile completion; mismatch-driven withdrawals.

### Stage 6 — Application and objective allocation `--agent`

> The step where a housing platform becomes either defensible or a discrimination lawsuit.

1. Apply with **eligibility data only** — the fields the published criteria actually use.
2. **Evaluate each published rule**, pass/fail, with the input that produced it. No weighing, no balancing.
3. **Assign the allocation position** by first-come timestamp or registration duration, tie-breaks published in advance.
4. **Landlord sees applicants in that order.** No "sort by fit". Declining an applicant above requires a code.
5. **Decide: accept, or decline with a code.** The system drafts the written motivation from that code, in the landlord's name.
6. **Escalate silence** — 48 h nudges, then escalates, then offers the next applicant with notice to both sides.
7. **Applicant sees position, reason, next step.**

**Outputs (genuine):** `[ok] Eligibility pass` `[art] Position #1` `[ok] Offer issued`
**Outputs (fraud):** `[ok] Eligibility pass` `[art] Position #1` `[ok] Offer issued` *(then stage 7 kills it)*
**Outputs (silent):** `[art] Position #4` `[bad] APP-SILENT-06 · 48h` `[warn] Auto-advance + notice`
**Legal:** WGV written motivation + objective criteria; AI Act — a person decides; GDPR Art. 22; Awgb.
**Metric:** % rejections with a code (target 100); median time to offer; escalations per 100 applications.

### Stage 7 — Messaging and viewing `--system` / `--money`

> Almost every documented fraud happens in the gap between a listing and a contract.

1. **Masked in-platform messaging only.** Phone, email and social handles masked both ways until an offer is accepted.
2. **Scan for the documented scam shapes** — urgency, payment before viewing, "owner is abroad, send a deposit to reserve", requests for ID copies.
3. **Book a viewing**, with a **remote option** for internationals who cannot visit.
4. **Record the viewing** — attended, when, whether it happened.
5. **One-click report** from any screen.
6. **Triage within 72 h** or auto-hide the listing.

**Outputs (fraud):** `[bad] Off-platform nudge flagged` `[bad] MSG-FEE-02 · chat blocked` `[bad] Case escalated` `[bad] Landlord suspended`
**Legal:** DSA Art. 16 notice-and-action + statement of reasons; GDPR purpose-limited chat retention; consumer law — no upfront fees.
**Metric:** off-platform nudges per 100 threads; reports upheld vs dismissed; median triage time.

### Stage 8 — Offer, contract and deposit `--money`

> Three things go wrong with money: paid to the wrong person, above the legal cap, never returned. One design answer: a licensed partner holds it, and identity decides who receives it.

1. **Issue the offer**, generated from the listing so terms cannot drift.
2. **Accept and sign** — qualified e-signature where available, advanced otherwise; record the signed version hash.
3. **Generate the compliant contract** — WGV information duties, service-cost breakdown, point count, deposit cap, notice periods, municipal reporting point.
4. **Deposit to the licensed partner**, capped at 2× rent.
5. **Match the payer to the verified tenant** — a mismatch is both a laundering and a fraud shape.
6. **Municipal registration checklist.**

**Outputs (genuine):** `[ok] Signed contract + hash` `[art] Escrow record` `[ok] Payer matched` `[art] Registration checklist`
**Outputs (fraud):** `[bad] Blocked before contract` `[bad] No deposit ever taken`
**Legal:** eIDAS signatures; PSD2 — no custody; WGV deposit cap, written contract, information duty.
**Metric:** % deposits through the partner; deposit disputes per 100 tenancies; contracts missing an annex (target 0).

### Stage 9 — Move-in and after `--inst` / `--reviewer`

> Evidence, and a wall around behaviour data.

1. **Release escrow on dual confirmation**, or a fixed window with no dispute.
2. **Hashed, timestamped check-in pack** — photographs, meter readings, existing defects.
3. **Report repairs, illegal rent, deposit withholding, harassment** — routed to the Huurcommissie and the municipal reporting point where applicable.
4. **Reputation visible, appealable, structurally walled off from eligibility.**
5. **Exit, settle, schedule deletion.**

**Outputs:** `[ok] Escrow released` `[art] Move-in pack` `[art] Reputation event (walled off)` `[art] Deletion scheduled`
**Legal:** GDPR storage limitation and deletion; WGV repair duty; AI Act Art. 5(1)(c) — no social scoring, structurally.
**Metric:** deposit disputes resolved without escalation; median repair response; % deletions on schedule.

### Stage 10 — Institution and audit layer `--muni`

> The marketplace is a means; this is the product that survives.

1. **Municipal dashboard** — refusals by code, holds, listings above ceiling, scam reports, appeals, override rate, coverage. Every figure traceable to an audit row.
2. **Institution cohort report** — students housed, time-to-housing, incidents intercepted before payment.
3. **Quarterly public transparency report** — including failures and overrides.
4. **Rule review from code frequency** — retire checks that misfire; investigate checks that never fire.
5. **Migration to the EUDI wallet** (states must offer one by 24 Dec 2026; reliance by 24 Dec 2027).
6. **Incident response** — 72-hour breach notification, public post-mortem.

**Outputs (fraud):** `[ok] Refusal counts published` `[ok] Suspension count published`
**Outputs (silent):** `[warn] Escalation metric published`
**Legal:** GDPR Art. 33; DSA transparency reporting; WGV municipal enforcement; eIDAS dates.
**Metric:** refusals per 100 listings; false-positive rate; time-to-housing; incidents closed.

---

## 5. Domain model

TypeScript interfaces (the demo should implement these as the single source of truth; a Prisma/Drizzle schema or an in-memory store both work).

```ts
type Actor = 'landlord' | 'agent' | 'student' | 'system' | 'ops' | 'inst' | 'muni' | 'money';

/* ---------- accounts ---------- */
type AccountType = 'PRIVATE_OWNER' | 'PROFESSIONAL' | 'AGENT';

interface Account {
  id: string;                      // uuid
  type: AccountType;
  displayName: string;
  email: string;
  phone?: string;                  // CONTACT ONLY — never an attestation
  createdAt: string;               // ISO 8601
  rulesAcceptedAt: string;
  suspension?: { reasonCode: string; at: string; byActor: string; liftedAt?: string };
}

/* ---------- attestations: RESULTS, never documents ---------- */
type AttestationKind = 'identity' | 'age' | 'student_status' | 'kvk' | 'ownership' | 'address';
type Assurance = 'laag' | 'substantieel' | 'hoog';

interface Attestation {
  id: string;
  subjectRef: string;              // pseudonymous account or address ref
  kind: AttestationKind;
  verified: boolean;
  issuer: string;                  // 'idin:mock-bank' | 'kadaster:mock' | 'inst:mock-tudelft' | 'eudi:wallet'
  assurance: Assurance;
  checkedAt: string;
  validUntil?: string;             // student status MUST have this
  evidenceRef?: string;            // pointer to the adapter run record, never to a document
}
```

```ts
/* ---------- listing ---------- */
type ListingStatus = 'DRAFT' | 'CHECKING' | 'HOLD' | 'PUBLISHED' | 'REFUSED' | 'SUSPENDED' | 'WITHDRAWN' | 'LET';

interface Listing {
  id: string;
  ownerAccountId: string;
  address: { street: string; houseNumber: string; postcode: string; city: string; bagId?: string };
  rentEurPerMonth: number;
  serviceCostsEurPerMonth: number;
  depositEur: number;
  sizeM2: number;
  rooms: number;
  sharedFacilities: string[];      // ['kitchen','bathroom','toilet']
  energyLabel?: 'A++++' | 'A+++' | 'A++' | 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  facilities: string[];            // ['furnished','balcony','private_shower']
  availableFrom: string;
  minimumDurationMonths: number;
  houseRules: { smoking: boolean; pets: boolean; guestsPolicy: string; quietHours: string };
  photos: { id: string; sha256: string; exifTakenAt?: string; width: number; height: number }[];
  status: ListingStatus;
  residentCount?: number;          // for WWS shared-facility rules
  createdAt: string;
  publishedAt?: string;
  ceiling?: RentCeiling;           // written by the gate
  decision?: GateDecision;         // written by the gate
}

interface RentCeiling {
  points: number;
  ceilingEurPerMonth: number;
  overCeiling: boolean;
  method: 'WWS-O-2026-approx';
  computedAt: string;
  breakdown: { label: string; points: number; note?: string }[];
  disclaimer: string;              // shown verbatim in UI
}

interface GateDecision {
  status: 'PUBLISH' | 'HOLD' | 'REFUSE';
  checks: CheckResult[];
  reasonCodes: string[];
  decidedAt: string;
  reviewerRef?: string;
  overrideReason?: string;
}
```

```ts
/* ---------- declared preferences (NOT traits) ---------- */
interface DeclaredProfile {
  ref: string;                     // student or listing (house side)
  side: 'STUDENT' | 'HOUSE';
  budgetMinEur: number;
  budgetMaxEur: number;
  sleepRhythm: 'early' | 'average' | 'late';
  guests: 'rarely' | 'sometimes' | 'often';
  cleanliness: 'relaxed' | 'average' | 'tidy';
  smoking: 'no' | 'outside' | 'inside' | 'no_preference';
  pets: ('none' | 'cat' | 'dog' | 'other')[];
  languages: string[];
  durationMonths: number;
  version: number;                 // bump on every edit; audit keeps history
  updatedAt: string;
}

/* ---------- application and queue ---------- */
type ApplicationStatus = 'SUBMITTED' | 'ELIGIBLE' | 'INELIGIBLE' | 'OFFERED' | 'DECLINED' | 'WITHDRAWN' | 'EXPIRED' | 'ACCEPTED';

interface Application {
  id: string;
  listingId: string;
  applicantRef: string;            // pseudonymous
  submittedAt: string;             // source of the first-come order
  registrationStartDate?: string;  // alternative allocation rule
  eligibility: { ruleId: string; passed: boolean; input: string }[];
  ruleSetVersion: string;          // which published criteria version was applied
  position: number;                // server-assigned, immutable
  status: ApplicationStatus;
  decision?: { at: string; byAccountId: string; code?: string; letterRef?: string };
  escalations: { at: string; kind: 'NUDGE_48H' | 'ESCALATE_72H' | 'AUTO_ADVANCE'; note: string }[];
}

/* ---------- trust ---------- */
interface Report {
  id: string;
  target: { kind: 'LISTING' | 'ACCOUNT' | 'THREAD'; ref: string };
  reporterRef: string;
  category: 'FRAUD' | 'UPFRONT_FEE' | 'OFF_PLATFORM' | 'MISREPRESENTATION' | 'OTHER';
  body: string;
  createdAt: string;
  triagedAt?: string;
  outcome?: 'UPHELD' | 'DISMISSED' | 'ESCALATED';
  reasonCode?: string;
}

interface ReputationEvent {
  ref: string;                     // account
  kind: 'REPLY_TIME' | 'NO_SHOW' | 'UPHELD_REPORT' | 'VIEWING_COMPLETED';
  value: number;
  at: string;
  appeal?: { at: string; body: string; outcome?: 'UPHELD' | 'REVERSED' };
}
// HARD RULE: ReputationEvent is never read by the eligibility or ordering functions.
```

```ts
/* ---------- audit ---------- */
interface AuditRow {
  seq: number;                     // monotonic
  at: string;
  actor: Actor | string;           // account id or 'system'
  action: string;                  // 'LISTING_STATUS_CHANGED' | 'APPLICATION_DECLINED' | ...
  subject: { kind: string; ref: string };
  inputs: Record<string, unknown>; // what the decision considered, incl. ruleSetVersion
  outcome: string;
  reasonCodes: string[];
  prevHash: string;                // hash chain (section 12)
  hash: string;
}
```

### 5.1 Store choice

For a demo, prefer **SQLite via Prisma or Drizzle** (or IndexedDB if you want it fully static). Requirements:

- `AuditRow` is **append-only**: no `UPDATE`, no `DELETE`. Enforce with a DB trigger or a repository method with no update path.
- `Listing.decision` and `Application.position` are written once. Any change is a new row plus an audit entry.
- Money: store integers in euro cents. Never floats.
- All timestamps ISO 8601 UTC; render in `Europe/Amsterdam`.

---

## 6. Verification algorithms

All six checks are **pure functions** with the same shape:

```ts
type CheckId = 'ID' | 'OWN' | 'DUP' | 'BAG' | 'RENT' | 'TRADER';
type CheckVerdict = 'PASS' | 'FAIL' | 'WARN' | 'SKIP';

interface CheckResult {
  check: CheckId;
  verdict: CheckVerdict;
  reasonCode?: string;             // required when FAIL or WARN
  evidence: Record<string, unknown>; // URLs, matched ids, point breakdown — the audit trail
  durationMs: number;
  ranAt: string;
}

async function runCheck(check: CheckId, listing: Listing, ctx: Context): Promise<CheckResult>;
```

**Gate aggregation (must be this simple):**

```ts
function aggregate(results: CheckResult[]): { status: 'PUBLISH'|'HOLD'|'REFUSE'; codes: string[] } {
  if (results.some(r => r.verdict === 'FAIL')) return { status: 'REFUSE', codes: codesOf(results, 'FAIL') };
  if (results.some(r => r.verdict === 'WARN')) return { status: 'HOLD',   codes: codesOf(results, 'WARN') };
  return { status: 'PUBLISH', codes: [] };
}
```

No scores, no thresholds, no weights. If a reviewer wants to disagree, they override **with a recorded reason**, and the override is counted.

### 6.1 `ID` — identity of the poster

```
INPUT   accountId
1. ask the IdentityAdapter for an assertion at assurance >= 'substantieel'
2. if !verified                      -> FAIL  ID-FAIL-01
3. if validUntil < now               -> FAIL  ID-EXPIRED-02
4. else                              -> PASS, evidence {issuer, assurance, checkedAt}
```
Never request, store, or log a document. The adapter returns `{verified, issuer, assurance, checkedAt, validUntil}`.

### 6.2 `OWN` — Kadaster ownership match

```
INPUT   postalAddress, posterIdentity (or mandateRef for agents)
1. owners = KadasterAdapter.ownersOf(address)
2. if owners.length === 0            -> FAIL  LOT-OWNER-02  ("no registered owner found for this address")
3. if mandateRef present             -> WARN  LOT-MANDATE-01 ("agent listing under mandate — queued for human review")
4. nameSimilarity(posterIdentity.name, owners) >= 0.92
      using normalised token comparison (strip diacritics, lowercase, drop initials,
      handle tussenvoegsel 'van'/'de' — see 6.2.1)
                                     -> PASS
   else                              -> FAIL  LOT-OWNER-02
```
**Evidence** must include: which owner name matched, the similarity figure, and the lookup timestamp. Never include the full Kadaster record.

#### 6.2.1 Name matching (reference implementation)

```ts
function normaliseName(s: string): string[] {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // strip diacritics
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2)                           // drop initials
    .filter(t => !['van','de','der','den','ter','ten','von','la','le'].includes(t) || true)
    .sort();
}

function nameSimilarity(a: string, b: string): number {
  const A = new Set(normaliseName(a)), B = new Set(normaliseName(b));
  const inter = [...A].filter(x => B.has(x)).length;
  return inter / Math.max(1, Math.min(A.size, B.size));   // overlap over smaller set
}
```
Threshold 0.92 catches "J. van der Berg" ↔ "Jan van der Berg" and rejects "P. de Vries" ↔ "J. de Vries".
**Test cases are mandatory** — see 19.2.

### 6.3 `DUP` — photo integrity

```
INPUT   listing.photos[]
1. for each photo: sha256 already stored at upload
2. localCorpusHit = store.findByHash(sha256) where listingId != this listing
3. externalHits    = ImageSearchAdapter.reverseSearch(sha256, perceptualHash)
4. if localCorpusHit                 -> FAIL  LOT-DUP-01, evidence {matchedListingId}
5. if externalHits.length > 0        -> WARN  LOT-DUP-01, evidence {urls, firstSeen}
6. if any photo has no EXIF and no perceptual-hash uniqueness
                                     -> WARN  LOT-DUP-02 ("image provenance unverifiable")
7. else                              -> PASS
```
Notes:
- Use a **perceptual hash** (dHash 64-bit, Hamming distance ≤ 6 = duplicate) in addition to the cryptographic hash, so a cropped or resized copy is still caught.
- The external adapter is mocked in the demo but its interface is real: `reverseSearch(pHash) -> {url, platform, firstSeen}[]`.
- **Never classify image content** (no person detection, no attribute inference). Only hash equality. This is a hard boundary.

```ts
function dhash(gray: number[][], w = 9, h = 8): bigint {
  let bits = 0n;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w - 1; x++)
      bits = (bits << 1n) | (gray[y][x] < gray[y][x + 1] ? 1n : 0n);
  return bits;
}
function hamming(a: bigint, b: bigint): number {
  let x = a ^ b, n = 0;
  while (x) { n += Number(x & 1n); x >>= 1n; }
  return n;
}
```

### 6.4 `BAG` — address exists and is a dwelling

```
INPUT   postcode, houseNumber
1. rec = AddressAdapter.lookup(postcode, houseNumber)
2. if !rec                      -> FAIL  LOT-ADDR-03
3. if rec.usage !== 'woonfunctie' -> FAIL LOT-ADDR-03 ("not a residential object")
4. if rec.street !== listing.address.street (normalised)
                                -> WARN  LOT-ADDR-04 ("street name mismatch")
5. else                         -> PASS, evidence {bagId, usage, lookupAt}
```

### 6.5 `RENT` — WWS-O ceiling

> **Honesty requirement.** The reference implementation below is an **approximation for demonstration**. It must be labelled `WWS-O-2026-approx` everywhere it appears, the UI must display the disclaimer, and stage 10 must list "replace with the official Huurcommissie calculator" as an open item. Do not present it as the legal rent.

**Verified anchors (2026):** 143 points ≈ €932.93/month; 186 points ≈ €1,228.07/month; no cap from 187 points.

```
INPUT   sizeM2, energyLabel, facilities[], sharedFacilities[], residentCount, rooms
1. points = 0
2. points += surfacePoints(sizeM2)
3. points += energyPoints(energyLabel)
4. points += kitchenPoints(sharedFacilities, facilities)
5. points += sanitaryPoints(...)
6. points += outdoorPoints(facilities)
7. points += heatingPoints(...)
8. ceiling = piecewiseLinearCeiling(points)      // see below
9. overCeiling = (rentEur > ceiling)
10. verdict: always PASS; if overCeiling -> WARN with code LOT-RENT-04
    (disclosure, not refusal — asking above the ceiling is not per se unlawful)
```

```ts
const ANCHORS: [number, number][] = [[0, 0], [143, 932.93], [186, 1228.07]];

function piecewiseLinearCeiling(points: number): number {
  if (points >= 187) {
    // above the cap: extrapolate at the marginal rate of the last segment
    const rate = (1228.07 - 932.93) / (186 - 143);
    return round2(1228.07 + (points - 186) * rate);
  }
  for (let i = 1; i < ANCHORS.length; i++) {
    const [p0, r0] = ANCHORS[i - 1], [p1, r1] = ANCHORS[i];
    if (points <= p1) return round2(r0 + (points - p0) * (r1 - r0) / (p1 - p0));
  }
  return 1228.07;
}

/* surface: rooms are scored on area with a shared-facility discount */
function surfacePoints(m2: number): number {
  return Math.min(120, Math.round(m2 * 1.0));        // 1 point per m², capped for demo sanity
}
function energyPoints(label?: string): number {
  const table: Record<string, number> = {
    'A++++': 40, 'A+++': 36, 'A++': 32, 'A+': 28, 'A': 24, 'B': 20, 'C': 15, 'D': 11, 'E': 8, 'F': 5, 'G': 0,
  };
  return table[label ?? 'G'] ?? 0;
}
function kitchenPoints(shared: string[], fac: string[]): number {
  if (fac.includes('private_kitchen')) return 20;
  return shared.includes('kitchen') ? 0 : 20;         // shared kitchen => no private kitchen points
}
function sanitaryPoints(shared: string[], fac: string[]): number {
  let p = 0;
  if (fac.includes('private_shower')) p += 10;
  if (fac.includes('private_toilet')) p += 6;
  if (!p && (shared.includes('bathroom') || shared.includes('toilet'))) p = 2;
  return p;
}
function outdoorPoints(fac: string[]): number { return fac.includes('balcony') || fac.includes('garden') ? 6 : 0; }
function heatingPoints(fac: string[]): number { return fac.includes('central_heating') ? 8 : 3; }
```

The `breakdown[]` array must be rendered in the UI as a small table — "why this ceiling" — because that table *is* the trust artefact.

### 6.6 `TRADER` — KvK for professionals

```
INPUT   accountType, kvkNumber
1. if accountType === 'PRIVATE_OWNER' -> SKIP  (Art. 30 does not bind a private one-room landlord)
2. if !kvkNumber                      -> FAIL  TRD-INVALID-01
3. rec = RegistryAdapter.lookup(kvkNumber)   // VIES + national register via BRIS
4. if !rec.active                     -> FAIL  TRD-INVALID-01, suspend per DSA Art. 30(3)
5. else                               -> PASS, evidence {kvk, viesValid, checkedAt}
```
The trader profile block must be **published on the listing** (`Art. 30(7)` shape): legal name, register, KvK number, contact.

---

## 7. Matching and allocation algorithms

### 7.1 Declared-preference matching — display, never score

**Requirement:** there is **no composite number** anywhere. The output is a list of field-level agreements and differences with a human-readable explanation.

```ts
interface FieldMatch {
  field: keyof DeclaredProfile;
  verdict: 'MATCH' | 'NEAR' | 'DIFFERENT' | 'UNKNOWN';
  studentValue: string;
  houseValue: string;
  weight: number;          // used ONLY for sort order of the list, never to produce a total
}

function compareProfiles(student: DeclaredProfile, house: DeclaredProfile): FieldMatch[] {
  const out: FieldMatch[] = [];
  // ordinal fields: distance on an ordered scale
  out.push(ordinal('sleepRhythm', student.sleepRhythm, house.sleepRhythm, ['early','average','late'], 3));
  out.push(ordinal('cleanliness', student.cleanliness, house.cleanliness, ['relaxed','average','tidy'], 2));
  out.push(ordinal('guests',      student.guests,      house.guests,      ['rarely','sometimes','often'], 2));
  // boolean-ish
  out.push(categorical('smoking', student.smoking, house.smoking, 3));
  out.push(setOverlap('pets', student.pets, house.pets, 1));
  out.push(setOverlap('languages', student.languages, house.languages, 1));
  // ranges
  out.push(rangeOverlap('budget', student.budgetMaxEur, house.budgetMinEur, 4));
  out.push(rangeOverlap('duration', student.durationMonths, house.durationMonths, 2));
  // sort: biggest disagreement first — a difference is more informative than an agreement
  return out.sort((a, b) => (b.weight * severity(b.verdict)) - (a.weight * severity(a.verdict)));
}
function severity(v: FieldMatch['verdict']) { return v === 'DIFFERENT' ? 3 : v === 'NEAR' ? 1 : 0; }
```

**UI rule:** render the top five as rows with both values and a neutral label (`same`, `similar`, `differs`). No totals, no bars out of 100, no "compatibility". If both sides skip the module: show `Not compared — you both skipped this` rather than penalising.

### 7.2 Listing ranking (deterministic, viewer-independent)

```ts
function rankListings(list: Listing[], q: SearchQuery): Listing[] {
  return list
    .filter(l => l.status === 'PUBLISHED')
    .filter(l => withinBudget(l, q) && matchesFilters(l, q))
    .sort((a, b) =>
      // 1. freshness, 2. rent headroom under the ceiling, 3. distance, 4. size
      cmp(b.publishedAt, a.publishedAt) ||
      cmp(headroom(b), headroom(a)) ||
      cmp(a.distanceMeters ?? Infinity, b.distanceMeters ?? Infinity) ||
      cmp(b.sizeM2, a.sizeM2)
    );
}
function headroom(l: Listing): number { return (l.ceiling?.ceilingEurPerMonth ?? l.rentEurPerMonth) - l.rentEurPerMonth; }
```
The **"Why this order"** panel must enumerate the active sort keys in the same order, read from the same object, so it cannot drift from the implementation.

### 7.3 Allocation — position and tie-breaks

**Rule set (published, versioned):**

```
SELECTION_RULES v1 (published 2026-11-01)
R1  Student status verified                          (hard gate, code APP-ELIG-04)
R2  Gross monthly income >= 3.0 x rent, OR guarantor  (hard gate, code APP-ELIG-05)
R3  Household size <= listing.maxOccupants           (hard gate, code APP-ELIG-06)
R4  Allocation order: FIRST_COME                     (submittedAt ascending)
R5  Tie-break 1:         earlier registrationStartDate
R6  Tie-break 2:         earlier account verified date
R7  Tie-break 3:         stable hash of applicationId (documented as arbitrary but consistent)
```

```ts
function assignPosition(apps: Application[], ruleSet: RuleSet): Application[] {
  const eligible = apps.filter(a => a.eligibility.every(e => e.passed));
  eligible.sort((a, b) =>
    cmp(a.submittedAt, b.submittedAt) ||
    cmp(a.registrationStartDate ?? '9999', b.registrationStartDate ?? '9999') ||
    cmp(a.accountVerifiedAt, b.accountVerifiedAt) ||
    cmp(sha1(a.id), sha1(b.id))
  );
  return eligible.map((a, i) => ({ ...a, position: i + 1 }));
}
```

**Hard invariants:**
- `position` is computed server-side and returned read-only.
- There is **no endpoint** that reorders applications.
- Declining an applicant above your current position requires selecting a published criterion; the API returns `422 CODE_REQUIRED` otherwise.
- Reputation is never an input. Add an automated test that asserts this (19.3).

### 7.4 The written motivation generator

```ts
const LETTER_TEMPLATES: Record<string, (ctx: Ctx) => string> = {
  'APP-ELIG-04': c => `Your application for ${c.address} could not be taken forward because the
student-status requirement was not met at the time of application. This is a published criterion
(Selection rules v${c.ruleSetVersion}, item R1). You may re-apply once your enrolment is confirmed.`,
  'APP-ELIG-05': c => `... income or guarantor requirement (R2) ...`,
  'APP-DECLINE-07': c => `The landlord selected an earlier applicant in the published first-come order.
Your position was ${c.position} of ${c.total}. This is not an assessment of you: applications are
ordered by submission time, as published in Selection rules v${c.ruleSetVersion}.`,
};
```
Letters must be **generated, archived, and referenced from the audit row**. A decline with no letter is a bug, not a UI choice.

---

## 8. Reason code dictionary

Every code is public, printed in letters, and appears in the dashboard. `severity` drives the gate outcome.

| Code | Fires when | Check | Outcome | Owner | SLA | User-facing sentence |
|---|---|---|---|---|---|---|
| `ID-FAIL-01` | Identity assertion failed | ID | REFUSE | system | instant | "We could not confirm your identity, so listing rights are paused. You can retry." |
| `ID-EXPIRED-02` | Identity attestation expired | ID | HOLD | system | 24 h | "Your identity check has expired. Re-verify to continue." |
| `LOT-OWNER-02` | Poster is not the registered owner | OWN | REFUSE | system | instant | "The registered owner of this address does not match the account. The listing cannot go live." |
| `LOT-MANDATE-01` | Agent listing under mandate | OWN | HOLD | ops | 24 h | "Agent listing under a management mandate — queued for review." |
| `LOT-DUP-01` | Photos found elsewhere | DUP | HOLD/REFUSE | ops | 24 h | "These photographs appear on another listing. Upload an in-room photo taken now to appeal." |
| `LOT-DUP-02` | Image provenance unverifiable | DUP | HOLD | ops | 24 h | "We could not verify these photos. A photo taken in the room today clears it." |
| `LOT-ADDR-03` | Address not found / not residential | BAG | REFUSE | system | instant | "This address is not a registered dwelling." |
| `LOT-ADDR-04` | Street name mismatch | BAG | HOLD | ops | 24 h | "The street name does not match the registered address." |
| `LOT-RENT-04` | Asking rent above the WWS-O ceiling | RENT | PASS + WARN | system | — | "The asking rent is above the legal maximum for this room's point count. Both figures are shown." |
| `TRD-INVALID-01` | KvK does not resolve | TRADER | REFUSE + suspend | system | instant | "Your business registration could not be verified. Listings are suspended until corrected." |
| `PRF-SKIP-01` | Preference module skipped | — | none | — | — | "Not compared — you both skipped this." |
| `APP-ELIG-04` | Student status not verified | rules | INELIGIBLE | system | instant | "Student status was not verified at the time of application (R1)." |
| `APP-ELIG-05` | Income/guarantor below threshold | rules | INELIGIBLE | system | instant | "Income or guarantor requirement not met (R2)." |
| `APP-ELIG-06` | Household larger than allowed | rules | INELIGIBLE | system | instant | "Household size exceeds the maximum for this home (R3)." |
| `APP-DECLINE-07` | Landlord declined, earlier applicant chosen | rules | DECLINED | landlord | instant | "An earlier applicant in the published order was selected. Your position was N of M." |
| `APP-SILENT-06` | No landlord decision in 48 h | rules | escalate | ops | 48 h | "The landlord has not responded. We have escalated and moved to the next applicant." |
| `APP-SKIP-02` | Attempt to reorder/skip the queue | rules | blocked | system | instant | (internal) "Reordering is not available." |
| `MSG-OFFPLAT-01` | Request to move off-platform | messaging | warn | system | instant | "Keep the conversation here — contact details are hidden until an offer is accepted." |
| `MSG-FEE-02` | Upfront fee requested | messaging | block + escalate | ops | immediate | "This conversation has been paused. No legitimate landlord asks for a fee before a viewing." |
| `REP-TRIAGE-01` | Report untriaged for 72 h | reports | auto-hide | ops | 72 h | "This listing is hidden while we review a report." |
| `CON-MISSING-02` | Contract annex missing | contract | block | system | instant | "The contract cannot be generated until all mandatory disclosures are complete." |
| `DEP-CAP-03` | Deposit > 2× rent | deposit | block | system | instant | "The deposit cannot exceed two months' rent." |
| `DEP-PAYER-04` | Payer ≠ verified tenant | deposit | hold funds | ops | 4 h | "The payment came from a different account. We are checking before releasing the keys." |
| `DEP-NOCONF-01` | No dual confirmation in window | deposit | hold | ops | 7 d | "The handover was not confirmed by both sides, so the deposit is still held." |
| `DEP-DISPUTE-02` | Deposit withheld at exit | deposit | dispute | ops | 10 d | "The deposit is in dispute. Your check-in pack is attached as evidence." |
| `INC-BREACH-01` | Personal-data breach | incident | notify | ops | 72 h | "We are notifying you about an incident affecting your data, and the authority." |
| `HUM-SLA-01` | Hold not reviewed in 24 h | review | escalate | ops | 24 h | "This listing is still in review; it has been escalated to the duty reviewer." |

---

## 9. State machines

Implement as explicit transition tables with a `canTransition(from, to, actor)` guard. Illegal transitions must throw in dev and be logged in prod.

### 9.1 Listing

```
DRAFT ──submit──▶ CHECKING
CHECKING ──all pass──▶ PUBLISHED
CHECKING ──any fail──▶ REFUSED
CHECKING ──any warn──▶ HOLD
HOLD ──reviewer approves──▶ PUBLISHED
HOLD ──reviewer rejects──▶ REFUSED
HOLD ──no decision in 24h──▶ HOLD (escalated, HUM-SLA-01)
PUBLISHED ──report upheld──▶ SUSPENDED
PUBLISHED ──landlord withdraws──▶ WITHDRAWN
PUBLISHED ──offer accepted──▶ LET
SUSPENDED ──appeal upheld──▶ PUBLISHED
REFUSED ──poster appeals with evidence──▶ HOLD
```
**Never:** `REFUSED → PUBLISHED` directly. There is always a human between them.

### 9.2 Application

```
SUBMITTED ──rules evaluated, all pass──▶ ELIGIBLE ──▶ (position assigned)
SUBMITTED ──any rule fails──▶ INELIGIBLE
ELIGIBLE ──landlord accepts──▶ OFFERED
ELIGIBLE ──landlord declines + code──▶ DECLINED
ELIGIBLE ──48h silence──▶ ELIGIBLE (escalated)  ──72h──▶ auto-advance, stays ELIGIBLE at next position
OFFERED ──student accepts + signs──▶ ACCEPTED
OFFERED ──student declines / expires──▶ WITHDRAWN | EXPIRED
```

### 9.3 Deposit

```
NOT_REQUIRED
PENDING_PAYMENT ──payer matches tenant──▶ HELD
PENDING_PAYMENT ──payer mismatch──▶ HELD + DEP-PAYER-04 (human review)
HELD ──dual confirmation──▶ RELEASED
HELD ──window elapses, no dispute──▶ RELEASED
HELD ──dispute──▶ IN_DISPUTE ──human decision──▶ RELEASED | RETURNED
```

---

## 10. API surface

REST-ish, typed. Every response includes `auditSeq` so the UI can deep-link a decision to its audit row.

```http
POST   /api/listings                       create draft
POST   /api/listings/:id/checks            run the six checks  -> GateDecision
POST   /api/listings/:id/appeal            poster appeals a REFUSE/HOLD with evidence
GET    /api/listings?status=PUBLISHED&city=Delft
GET    /api/listings/:id                   includes ceiling.breakdown[] and decision.checks[]
```

```http
POST   /api/applications                   body: {listingId, eligibility: {...}}
GET    /api/applications/:id               returns position, ruleSetVersion, eligibility[], decisions
POST   /api/applications/:id/accept        landlord accepts
POST   /api/applications/:id/decline       body REQUIRES {code} else 422 CODE_REQUIRED
GET    /api/applications/:id/letter.pdf    generated motivation
```
**Deliberately absent endpoints** (the absence is the feature — document it in the README):
```
POST /api/applications/:id/reorder      -> 501 Not Implemented, by design
POST /api/listings/:id/rent-suggestion  -> 501, conflicts with WWS-O ceilings
POST /api/applicants/:id/score          -> 501, prohibited classification
POST /api/deposits/custody              -> 501, PSD2
```

```http
POST   /api/messages                       masked thread; runs the scam-pattern scan
POST   /api/reports                        one-click report
POST   /api/reports/:id/triage             ops: UPHELD | DISMISSED | ESCALATED
POST   /api/reservations/:id/accept        offer accepted -> deposit PENDING_PAYMENT
POST   /api/deposits                       creates a partner escrow intent (never custody)
POST   /api/deposits/:id/confirm           dual confirmation -> RELEASED
GET    /api/audit?subject=...              paginated, append-only
GET    /api/dashboard?city=Delft           aggregate metrics for the municipal view
```

### 10.1 Error contract

```json
{ "error": "CODE_REQUIRED",
  "message": "A decline must reference a published criterion.",
  "allowedCodes": ["APP-ELIG-04","APP-ELIG-05","APP-ELIG-06","APP-DECLINE-07"],
  "docUrl": "/codes/APP-DECLINE-07" }
```
The `allowedCodes` list is generated from the reason-code dictionary, so the UI can render the picker without hardcoding.

---

## 11. Adapters — interfaces and mocks

One file per adapter, one mock per adapter, one run-log per adapter invocation. **Every mock's return value must be visibly labelled in the UI** with a small `MOCK` chip and the issuer string.

```ts
interface IdentityAdapter {
  readonly issuer: string;                       // 'idin:mock-bank'
  assert(subjectRef: string): Promise<{ verified: boolean; assurance: Assurance; checkedAt: string; validUntil?: string }>;
}

interface OwnershipAdapter {
  readonly issuer: string;                       // 'kadaster:mock'
  ownersOf(a: Address): Promise<{ name: string; since: string }[]>;
}

interface AddressAdapter {
  readonly issuer: string;                       // 'bag:mock'
  lookup(postcode: string, houseNumber: string): Promise<{ bagId: string; street: string; city: string; usage: 'woonfunctie' | 'kantoor' | 'overig' } | null>;
}

interface RegistryAdapter {
  readonly issuer: string;                       // 'vies+bris:mock'
  lookup(kvk: string): Promise<{ active: boolean; legalName: string; viesValid: boolean }>;
}

interface ImageSearchAdapter {
  readonly issuer: string;                       // 'reverse-image:mock'
  reverseSearch(pHash: string): Promise<{ url: string; platform: string; firstSeen: string }[]>;
}

interface StudentStatusAdapter {
  readonly issuer: string;                       // 'inst:ssO:mock-tudelft' | 'eudi:wallet'
  verify(subjectRef: string, institution: string): Promise<{ verified: boolean; programme?: string; validUntil: string }>;
}

interface EscrowAdapter {
  readonly issuer: string;                       // 'escrow:mock-partner'
  createIntent(p: { amountCents: number; payerRef: string; beneficiaryRef: string }): Promise<{ intentId: string; status: 'PENDING' }>;
  confirmHandover(intentId: string, by: 'landlord' | 'student'): Promise<{ released: boolean }>;
}
```

### 11.1 Mock behaviour tables (must be deterministic)

The mocks are driven by a **fixture key**, never randomness, so the demo is reproducible.

| Fixture | Identity | Ownership | Address | Registry | Image search | Student |
|---|---|---|---|---|---|---|
| `landlord_genuine` | verified, substantieel | match | woonfunctie | active | no hits | — |
| `landlord_fraud` | **failed** | match found to *another* name | woonfunctie | **inactive** | **2 hits** (pararius, facebook) | — |
| `landlord_silent` | verified | match | woonfunctie | active | no hits | — |
| `landlord_agent` | verified | **mandate ref** | woonfunctie | active | no hits | — |
| `student_genuine` | verified | — | — | — | — | verified, validUntil +10 months |
| `student_expired` | verified | — | — | — | — | **expired** 2 days ago |
| `address_nondwelling` | — | — | **'kantoor'** | — | — | — |

Every adapter call must append a row to `adapter_runs` with `{adapter, input, output, ms}` so the demo can show "this is exactly what the check received".

### 11.2 Real-integration notes (document, don't implement)

- **iDIN** — bank-based eID at assurance level *Substantieel*; obtained through a bank or a reseller; returns a pseudonym and attribute set, not a document.
- **EUDI wallet** — every member state must offer one by 24 December 2026; in-scope private relying parties must accept it by 24 December 2027; a relying party registers with its member state and may request only the attributes it declared. The identity adapter is the seam designed for this date.
- **Kadaster** — ownership lookup is a paid per-request API; the demo mock returns a name and a `since` date only.
- **BAG** — address and usage lookup; `woonfunctie` is the flag that matters.
- **VIES + BRIS** — the DSA's "best efforts" verification route for traders.
- **SURFconext / eduID** — federated student-status assertion (ePPN, `eduPersonEntitlement`); realistically requires a SURF `aansluitovereenkomst`, so the demo uses a direct institution claim plus the Bewijs van Inschrijving fallback.

---

## 12. Audit log and hash chain

Append-only, tamper-evident, cheap to implement and disproportionately convincing in a demo.

```ts
function appendAudit(row: Omit<AuditRow,'seq'|'prevHash'|'hash'>): AuditRow {
  const prev = lastRow();
  const seq = (prev?.seq ?? 0) + 1;
  const prevHash = prev?.hash ?? 'GENESIS';
  const hash = sha256(canonicalJson({ ...row, seq, prevHash }));
  return store.insert({ ...row, seq, prevHash, hash });
}
```

`canonicalJson` = deterministic key ordering, no whitespace. `sha256` = Web Crypto in the browser, `node:crypto` on a server.

**Verify endpoint / panel:** recompute the chain from `seq = 1` and show `12/12 rows verified`. A tampered row breaks every subsequent hash — display that as a live demo trick if you like: edit the store by hand, reload, watch the panel turn red. That single moment proves the whole argument.

**What every audit row must contain:** actor, action, subject, the **inputs the decision considered** (including `ruleSetVersion`), the outcome, the reason codes, timestamps, hashes.

---

## 13. Design system

Tasteful means restrained, dense but airy, and clearly two-mode. Do not ship gradients-as-decoration, emoji-as-icons, or a hero image of students smiling.

### 13.1 Tokens

```css
:root{
  /* surfaces */
  --bg:#f6f7fb; --bg-2:#eef1f7; --panel:#ffffff; --panel-2:#f2f5fa;
  --line:#dce3ee; --line-strong:#c3cfe0;
  /* text */
  --text:#111823; --text-2:#3d4a5c; --muted:#5a6577; --faint:#8a94a6;
  /* actor colours — used ONLY for identity, never for decoration */
  --landlord:#ff6b4a; --agent:#ffb347; --student:#5aa9ff; --system:#c58cff;
  --reviewer:#2fd4c4; --inst:#35e08b; --muni:#ff79b0; --money:#ffd166;
  /* semantic */
  --pass:#17a673; --warn:#c9861a; --fail:#d64550; --info:#2f7fd1;
  /* effects */
  --radius:14px; --radius-sm:9px; --radius-pill:999px;
  --shadow-1:0 1px 2px rgba(16,26,45,.06), 0 8px 24px rgba(16,26,45,.06);
  --shadow-2:0 2px 6px rgba(16,26,45,.08), 0 18px 48px rgba(16,26,45,.10);
  --sp:4px;  /* spacing scale: 4 8 12 16 24 32 48 64 */
}
[data-theme="dark"]{
  --bg:#0b0d12; --bg-2:#0e1118; --panel:#131822; --panel-2:#1a2130;
  --line:#27303f; --line-strong:#39465c;
  --text:#e9eef6; --text-2:#c3cfe0; --muted:#8b97ab; --faint:#6b7688;
  --shadow-1:0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.35);
  --shadow-2:0 20px 60px rgba(0,0,0,.45);
}
```

Actor colours carry a **contrast obligation**: as a filled chip they need `#08111b` text; as text on a panel they need a 3:1 minimum against the panel. Test both modes.

### 13.2 Type

- **UI:** `Inter` or system stack (`-apple-system, "Segoe UI", Roboto, …`). No web fonts required — the demo must run offline.
- **Data, codes, hashes, timestamps:** `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. Reason codes are always monospace.
- Scale (rem): `0.6875` (11px micro-label), `0.75` (12px), `0.8125` (13px body-dense), `0.9375` (15px body), `1.0625` (17px), `1.25` (20px section), `clamp(1.5rem,2.4vw,2.25rem)` (page title).
- Line height `1.45` body, `1.2` headings. Letter-spacing `-0.015em` on headings ≥20px; `+0.08em` uppercase micro-labels.
- Numerals: `font-variant-numeric: tabular-nums` on every table, metric and position number.

### 13.3 Components (build exactly these sixteen)

| # | Component | Notes |
|---|---|---|
| 1 | `ActorChip` | dot + label, actor colour; `size: sm | md` |
| 2 | `ReasonCode` | monospace pill; colour by outcome (fail/warn/pass); tooltip = description + link to `/codes/:code` |
| 3 | `StatusBadge` | DRAFT / CHECKING / HOLD / PUBLISHED / REFUSED / SUSPENDED / LET |
| 4 | `CheckRow` | check id, verdict icon, one-line evidence, duration, expandable raw evidence |
| 5 | `GateSummary` | the six checks + the aggregate decision; the single most important component in the app |
| 6 | `StageCard` | number, name, subtitle, owner actor chip, `n of m outputs`; used in the flow canvas |
| 7 | `LedgerEntry` | artefact chip with colour channel (art/ok/bad/warn) and a stage heading |
| 8 | `QueuePosition` | big number, `of N`, the rule that produced it, the tie-break used |
| 9 | `MotivationLetter` | rendered letter with the code and rule version in the footer |
| 10 | `CeilingBreakdown` | point table + ceiling + asking rent + over/under indicator + disclaimer |
| 11 | `AuditRowView` | seq, actor, action, subject, codes, hash prefix, `verified ✓` |
| 12 | `ChainStatus` | `n/n rows verified` with a red state |
| 13 | `MetricTile` | label, value, optional delta, optional sparkline |
| 14 | `MaskedThread` | chat bubbles with masked contact details and an inline warning banner |
| 15 | `EmptyState` | icon-less, one sentence of why it is empty, one action |
| 16 | `Toast` | for `422 CODE_REQUIRED` style refusals — state what is blocked and why, never "Error" |

### 13.4 Motion

- Durations: `120ms` hover, `200ms` state change, `280ms` drawer, `600–900ms` packet travel on the flow canvas.
- Easing: `cubic-bezier(.2,.7,.3,1)`.
- One flourish only: **the packet** travelling the pipeline during the guided demo. Everything else is quiet.
- Respect `prefers-reduced-motion: reduce` → all transitions `none`, packet jumps between nodes.

### 13.5 Density and layout

- Max content width `1420px`; gutters `clamp(16px, 3vw, 44px)`.
- Two-column app layout: main `minmax(0,1fr)`, side panel `352px`, collapsing at `1080px`.
- Every interactive target ≥ `40×40px`. Focus ring: `2px solid var(--agent)` with `2px` offset, never removed.
- Tables: sticky header, `row:hover` background `--panel-2`, no zebra striping.

### 13.6 Accessibility (non-negotiable)

- WCAG 2.2 AA: 4.5:1 body text, 3:1 large text and UI boundaries.
- **Never colour alone** to convey verdict — pair with an icon or word (`PASS` / `FAIL` / `HOLD`).
- Full keyboard path for the demo script: tab order = canvas → ledger → controls.
- Announce async updates with `aria-live="polite"` (ledger additions, gate result, queue position).
- Reason-code tooltips must be reachable by keyboard and dismissible with `Escape`.

---

## 14. Legal invariants enforced in code

Each invariant gets an automated test so the claim "we cannot do this" is verifiable, not rhetorical.

### 14.1 No person-scoring field
Schema lint: fail the build if any model contains a field matching
`/(personality|trait|mbti|bigfive|big_five|fit_score|compatibility_score|trust_score|behaviour_score|character)/i`.
Also assert `DeclaredProfile` contains no derived numeric field.

### 14.2 No inference over free text
No NLP/LLM call may classify a message body. The scam scanner must be **pattern-based** (regex + structural rules) and its rule list must be reviewable. Test: message bodies are only ever read by `scanPatterns()`.

### 14.3 Images are hashed, not classified
Assert that the only functions receiving raw image bytes are `sha256()` and `dhash()`.

### 14.4 No off-platform gathering
Assert the outbound allowlist equals exactly the adapter hosts. A test enumerates all `fetch` call sites and fails on anything else.

### 14.5 No custody of funds
Assert no ledger, balance or `hold` table exists for deposits; deposit state is only ever written by `EscrowAdapter`.

### 14.6 Queue is immutable
Assert there is no `reorder` handler and that `Application.position` is written in exactly one place.

### 14.7 Rent is not suggested
Assert no endpoint or function returns a rent value; the only rent computation returns a **ceiling** for comparison.

### 14.8 Phone is not identity
Assert `phone` is never read by `IdentityAdapter` or any check.

### 14.9 No document storage
Assert no endpoint accepts `multipart/form-data` with a document mime type, and no column name matches `/(passport|id_doc|bsn|document|scan)/i`.

### 14.10 Human in the loop
Assert `REFUSE` and `HOLD` both create a review task with an SLA, and that `REFUSED → PUBLISHED` is not a legal transition.

### 14.11 Reputation is walled off
Assert `rankListings()`, `assignPosition()` and `evaluateRules()` have no import path to reputation. Implement as a module-boundary test.

---

## 15. Screens and states

Ten screens. Each needs: purpose, primary component, empty state, loading state, error state, and what the guided demo does here.

| # | Route | Screen | Primary component | Guided demo beat |
|---|---|---|---|---|
| 1 | `/` | Pipeline canvas | `StageCard[]` + ledger | Play the pipeline, watch outputs stream |
| 2 | `/landlord/new` | Create listing | form with the six checks previewed | Fill with fraud fixture; press "Run checks" |
| 3 | `/listings/:id` | Listing with gate result | `GateSummary` + `CeilingBreakdown` | Three codes fire; REFUSE; letter generated |
| 4 | `/ops/queue` | Review queue | review card + override recorder | Reviewer overrides, reason recorded, counter increments |
| 5 | `/student` | Discovery | listing cards + `Why this order` | Show the sort keys, then filter |
| 6 | `/listings/:id/apply` | Apply | eligibility rules, live pass/fail | Apply, see position with the rule that produced it |
| 7 | `/ops/applications/:id` | Landlord decision | ordered applicant list, decline requires code | Try to decline without a code → blocked |
| 8 | `/threads/:id` | Masked messaging | `MaskedThread` | Send "what's your WhatsApp" → nudge flagged; then a fee request → blocked |
| 9 | `/contracts/:id` | Offer, contract, deposit | contract preview + escrow state | Deposit to partner, payer matched, dual confirmation |
| 10 | `/dashboard` | Municipal dashboard | `MetricTile[]` + audit table + `ChainStatus` | Refusals by code; open an audit row; verify the chain |

### 15.1 States every data screen must implement

- **empty** — one sentence explaining why it is empty, plus the next action.
- **loading** — skeleton rows, never a spinner alone.
- **error** — the reason code and what to do, never "Something went wrong".
- **forbidden** — the permission matrix reason, e.g. "Applications cannot be reordered. The order is set by Selection rules v1, item R4."

---

## 16. The demo script — three scenarios

Seed three fixtures (Appendix A). The demo is a **guided path**, but every screen must also be explorable freely.

### Scenario A — Fraudulent listing (the money shot, ~90 s)

| Beat | Action | Expected on screen | Assertion |
|---|---|---|---|
| A1 | Start on `/`, select "Fraudulent" | Flow canvas with 10 stages | all stages render |
| A2 | Press **Play** | Packet walks 1→10 | stages 1,2 light; outputs appear |
| A3 | Arrive at stage 3 | `LOT-DUP-01`, `LOT-OWNER-02` fire; `LOT-RENT-04` discloses | exactly 3 codes, 2 FAIL 1 WARN |
| A4 | Gate result | `REFUSE`, listing not visible to students | status === REFUSED |
| A5 | Open the letter | Written motivation names each failed check | letter contains all 3 codes |
| A6 | Continue to stage 7 | `MSG-FEE-02` triggers, chat blocked, account suspended | report → UPHELD → SUSPENDED |
| A7 | Stage 10 | Refusal counts published; audit rows visible | dashboard shows ≥1 refusal per code |
| A8 | Verify chain | `n/n rows verified` | chain valid |

**Say out loud:** no deposit was ever requested, because stage 8 was never reached. That is the entire product.

### Scenario B — Genuine listing (~90 s)

| Beat | Action | Expected | Assertion |
|---|---|---|---|
| B1 | Select "Genuine", Play | all six checks PASS | status === PUBLISHED |
| B2 | Listing page | badge shows owner-match date, photo uniqueness, ceiling table | `ceiling.breakdown` non-empty |
| B3 | Student applies | eligible; `Position #1 of 4` with rule R4 cited | position === 1, ruleSetVersion present |
| B4 | Landlord declines applicant 1, tries without a code | **blocked**, `422 CODE_REQUIRED` toast | no state change |
| B5 | Decline with `APP-DECLINE-07` | letter generated and archived | `letter.pdf` exists, audit row written |
| B6 | Offer, sign, deposit | escrow PENDING → HELD → RELEASED on dual confirmation | deposit never enters our ledger |
| B7 | Dashboard | tenancy counted; time-to-offer metric updates | metric delta visible |

### Scenario C — Silent landlord (~60 s)

| Beat | Action | Expected | Assertion |
|---|---|---|---|
| C1 | Select "Silent", apply as 4th applicant | `Position #4 of 4` | position === 4 |
| C2 | Fast-forward 48 h (dev control) | `APP-SILENT-06` nudge sent | escalation appended |
| C3 | Fast-forward to 72 h | auto-advance, next applicant offered, both notified | status transitions recorded |
| C4 | Dashboard | "escalations per 100 applications" metric updates | metric exists and is non-zero |

**Dev control:** a small "simulate time" affordance (clearly marked as a demo tool) that advances the clock so SLA behaviour is demonstrable in seconds. It must be visually distinct from product UI.

---

## 17. Copy deck

Voice: first person plural, plain, specific, never cheerful about a refusal.

- **Gate result, refuse:** "This listing cannot go live. Two checks failed and one needs disclosure — the reasons are below and have been sent to the poster."
- **Gate result, publish:** "Six checks passed. What we verified, and when, is shown on the listing."
- **Rent disclosure:** "The asking rent is €{rent}. The legal maximum for this room's {points} points is about €{ceiling}. Asking above it is not automatically unlawful, but you should know the number."
- **Queue position:** "You are number {n} of {total}. Applications are ordered by submission time, as published in Selection rules v{version}. Nothing about you personally affected this position."
- **Decline blocked:** "A decline must reference a published criterion, so the applicant can see why. Choose the criterion that applied."
- **Scam block:** "This conversation is paused. No legitimate landlord asks for money before a viewing."
- **Dashboard intro:** "Every figure here comes from a row in the audit log. Click any number to see the rows behind it."
- **Mock disclosure (required):** "Demo environment. Identity, ownership, address and register checks are simulated; the issuer is shown on every result."

**Never write:** "Something went wrong." · "Oops." · "AI-powered matching." · "100% safe." · "Trusted by thousands." · any claim that fraud is eliminated.

---

## 18. Instrumentation and displayed metrics

Implement as counters derived **from the audit log**, not as separately maintained stats — otherwise the numbers can disagree with the evidence.

| Metric | Definition | Where shown |
|---|---|---|
| `listings.refused` by code | count of `LISTING_STATUS_CHANGED → REFUSED` grouped by code | dashboard |
| `listings.published` | count of `→ PUBLISHED` | dashboard |
| `refusal_rate` | refused / (refused + published) | dashboard hero |
| `holds.median_review_minutes` | median time HOLD → decision | ops |
| `override_rate` | reviewer overrides / total gate decisions | dashboard (published!) |
| `applications.median_time_to_offer` | submitted → OFFERED | dashboard |
| `applications.escalations_per_100` | auto-advances / applications × 100 | dashboard |
| `rejections.with_code` | must always be 100% | dashboard health check |
| `messages.offplatform_flags_per_100_threads` | nudge detections | trust & safety |
| `deposits.through_partner` | % of tenancies | dashboard |
| `coverage` | listings with a complete badge / published | dashboard |
| `chain.verified` | recomputed hash chain rows | audit panel |

Show the **override rate next to the refusal rate** deliberately. A vendor who publishes how often their gate was wrong is making a claim no competitor will match.

---

## 19. Testing and acceptance criteria

### 19.1 Unit — the gate

```
✔ aggregate(pass×6)                      -> PUBLISH, codes []
✔ aggregate(fail OWN, warn RENT)         -> REFUSE, codes ['LOT-OWNER-02','LOT-RENT-04']
✔ aggregate only WARNs                   -> HOLD
✔ every CheckResult FAIL/WARN has a code present in the dictionary
✔ gate is deterministic: same input twice -> identical JSON (deep equal, incl. evidence order)
```

### 19.2 Name matching — table-driven

```
✔ "J. van der Berg"   ~ "Jan van der Berg"   >= 0.92
✔ "P. de Vries"       ~ "J. de Vries"        <  0.92
✔ "Müller"            ~ "Muller"             >= 0.92
✔ "Ahmed El Amrani"   ~ "A. El Amrani"       >= 0.92
✔ "Jan Berg"          ~ "Jan van den Berg"   >= 0.92   (tussenvoegsel tolerance)
```

### 19.3 Wall tests (the ones that protect the whole argument)

```
✔ assignPosition() imports nothing from reputation
✔ no function with 'score' in its name returns a value about a person
✔ /reorder returns 501
✔ decline without code returns 422 and does not mutate state
✔ schema lint finds zero forbidden field names
✔ no fetch call outside the adapter allowlist
```

### 19.4 State machine

```
✔ REFUSED -> PUBLISHED throws
✔ HOLD with no reviewer after 24h produces HUM-SLA-01, stays HOLD
✔ LET is terminal for the listing
```

### 19.5 Accessibility and visual

```
✔ axe: 0 critical/serious violations on all 10 routes, light and dark
✔ keyboard: complete scenario A without a mouse
✔ `prefers-reduced-motion` disables the packet animation
✔ no horizontal overflow at 390 / 768 / 1024 / 1440 px
✔ tabular-nums applied to all metric and position figures
```

### 19.6 Demo integrity

```
✔ full scenario A, B and C run headless and assert every expected state
✔ reload preserves audit rows and the hash chain verifies
✔ seeded fixtures produce identical outputs on every run (no Math.random in fixtures)
```

### 19.7 Definition of done

- All three scenarios pass headless.
- Section 14 invariants all have a green test.
- Reads correctly at 1440 px and 390 px.
- The README states plainly which checks are mocked and what each real integration would require.
- A jury member can, unprompted, find the refusal log and the override rate.

---

## 20. Build order

| Phase | Deliverable | Rough size |
|---|---|---|
| 1 | Tokens, layout, the 16 components in isolation (Storybook or a `/kitchen-sink` route) | 1 day |
| 2 | Domain model + in-memory store + fixtures + audit chain + tests 19.1–19.4 | 1 day |
| 3 | Adapters and mocks + `adapter_runs` log | half day |
| 4 | Gate screen: draft → six checks → gate summary → letter | 1 day |
| 5 | Student discovery + apply + queue position + why-this-order | 1 day |
| 6 | Landlord decision + code-required enforcement + letters | half day |
| 7 | Masked messaging + scam patterns + reports + triage | 1 day |
| 8 | Offer → contract → escrow → dual confirmation | 1 day |
| 9 | Ops review queue + overrides + SLA clock | half day |
| 10 | Municipal dashboard + audit table + chain verifier | half day |
| 11 | Pipeline canvas + ledger + play controls + three scenarios | 1 day |
| 12 | Accessibility pass, reduced motion, mobile, headless demo tests | 1 day |

**If time is short, cut in this order:** dashboard sparklines → institution report → appeals → viewing records. **Never cut:** the gate, the code-required decline, the audit chain, the queue position explanation, the wall tests.

---

## Appendix A — seed fixtures

```ts
const LISTINGS = [
  { id:'L-1001', fixture:'genuine',  address:'Oude Delft 118, 2611 CG Delft',  rentEur: 620, sizeM2: 16, energyLabel:'C',
    shared:['kitchen','bathroom','toilet'], facilities:['furnished','central_heating'], residents: 4,
    photos:['p1.jpg','p2.jpg','p3.jpg'], house:{smoking:false,pets:false,guestsPolicy:'occasional'} },

  { id:'L-1002', fixture:'fraud',    address:'Phoenixstraat 42, 2611 AL Delft', rentEur: 780, sizeM2: 20, energyLabel:'D',
    shared:['kitchen','bathroom'], facilities:['furnished'], residents: 3,
    photos:['stolen_a.jpg','stolen_b.jpg'], house:{smoking:false,pets:true,guestsPolicy:'often'} },

  { id:'L-1003', fixture:'silent',   address:'Voorstraat 7, 2611 JN Delft',     rentEur: 545, sizeM2: 14, energyLabel:'B',
    shared:['kitchen','bathroom','toilet'], facilities:['furnished','balcony','central_heating'], residents: 5,
    photos:['s1.jpg','s2.jpg'], house:{smoking:false,pets:false,guestsPolicy:'rarely'} },

  { id:'L-1004', fixture:'agent',    address:'Jacobstraat 9, 2611 LA Delft',    rentEur: 695, sizeM2: 18, energyLabel:'C',
    shared:['kitchen','bathroom'], facilities:['furnished','private_shower'], residents: 4,
    photos:['a1.jpg','a2.jpg'], house:{smoking:false,pets:false,guestsPolicy:'sometimes'} },
];

const EXPECTED = {
  'L-1001': { status:'PUBLISH', codes:[] },
  'L-1002': { status:'REFUSE',  codes:['LOT-DUP-01','LOT-OWNER-02','LOT-RENT-04'] },
  'L-1003': { status:'PUBLISH', codes:[] },
  'L-1004': { status:'HOLD',    codes:['LOT-MANDATE-01'] },
};
```

**Why these numbers:** L-1002 at €780 with 20 m², label D, shared bathroom ≈ 60 points → ceiling ≈ €390–420 → `LOT-RENT-04` fires plausibly. L-1001 at €620 with 16 m², label C, private shower + toilet ≈ 100 points → ceiling ≈ €650 → passes. Keep the arithmetic honest: run `piecewiseLinearCeiling()` on the actual point totals and log them in the fixture file so the demo never shows a number the algorithm didn't produce.

Time offsets for the silent scenario: `t0 = now`, applicant 4 submitted at `t0 - 3h`, `t0 - 2h`, `t0 - 1h`, `t0`.

---

## Appendix B — sources and figures

Any number rendered in the demo must come from this list, with the source visible in the UI (a `?` popover is enough). Do not invent figures to fill a tile.

| Figure | Value used | Source |
|---|---|---|
| Student-room shortage, NL | ~21,500 rooms; 23,000–30,000 projected for 2026 | Kences, Landelijke Monitor Studentenhuisvesting |
| Rental-fraud reports | 175 in H1 2026 vs 21 in the preceding half-year | Fraudehelpdesk |
| Share of hotline reports that are scams | 11% (2025); rising from 1.4% (2022) and 9.3% (2024) | LSVb Housing Hotline |
| WWS-O ceiling 2026 | 143 points ≈ €932.93; 186 ≈ €1,228.07; no cap above 187 | Huurcommissie WWS-O 2026 |
| Student rooms above the legal maximum | ~6 in 10 | Huurcommissie / market reporting |
| Landlord duties | In force 1 July 2023 | Wet goed verhuurderschap |
| AI Act prohibitions / high-risk | Art. 5 (from 2 Feb 2025); Annex III 5(d) from 2 Dec 2027 | Reg. (EU) 2024/1689 |
| EUDI wallet | States by 24 Dec 2026; in-scope reliance by 24 Dec 2027 | Reg. (EU) 2024/1183 (eIDAS 2.0) |
| DSA trader traceability | Collect, best-efforts verify, publish, suspend | Reg. (EU) 2022/2065, Art. 30 |
| Deposit cap | 2× rent | Wet goed verhuurderschap |
| Data-breach notification | 72 hours | GDPR Art. 33 |

Footer must read: *"Working demo for a hackathon. Checks are simulated where marked. Not legal advice."*

---

## Appendix C — the one-paragraph pitch the build should support

> We built the verification layer that student housing is missing. A room cannot appear on our platform until someone we can prove owns it, with photographs nobody else has used, at a rent we show against the legal maximum — and every decision we make is a reason code in a log a municipality can audit. We do not score people and we do not rank them by feel: applicants are ordered by a rule we publish in advance, and every rejection is explained in writing. The AI does the checking; a human makes the decision; and the number we put on the slide is not how many users we have, it is how many listings we refused.

---

*End of brief. Build phase 2 (domain + audit + tests) before touching a single screen — the invariants are the product, and they are cheapest to enforce before there is a UI to retrofit.*
