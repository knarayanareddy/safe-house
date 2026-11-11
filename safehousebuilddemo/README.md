# Verified — verified student housing for Groningen

A working demo of the *Verified* master spec, adapted to Groningen (RUG, Hanze, Room.nl, Kamernet, GSb, hospiteer culture), plus a **Swarm Lab** (MiroFish-style agent simulation) and a **Survey Lab** (review of the Google Form, a redesigned v2, and 262 persona agents filling both in).

Run: `npm run dev` · Wall + integrity tests: `npx tsx scripts/verify.ts` · Swarm/survey sanity numbers: `npx tsx scripts/swarm-test.ts`

## Tabs
| Route | What it shows |
|---|---|
| `/` | Premium landing (Funda / HousingAnywhere-style) with live stats from the audit log |
| `/discover` | 18 Groningen listings, filters, "why this order" panel (same object as the sort function) |
| `/room/:id` | Photography, six-check gate, WWS-O-2026-approx breakdown, apply (queue position + cap), landlord console (decline needs a code; reorder → 501) |
| `/gate` | Landlord submits a room; fraud is refused with named codes and a letter; rows land in the audit chain |
| `/hospiteer` | Published procedure, prohibited-phrase lint, pool of 15, parity table with the flip-to-lottery rule |
| `/swap` | Sublet with consent as a hard gate (server-enforced), three caps, 48 h floor, top-trading-cycle swap board |
| `/simulate` | 214 deterministic agents (seed 20261111), eleven gates, live invariants, four adversarial runs, deferred acceptance |
| `/swarm` | **Swarm Lab**: force-directed agent graph, survey swarm, adoption swarm, two simulated communities, interview an agent, 5 × 1,000 Monte-Carlo scenario frequencies |
| `/survey` | Does the Google Form capture the build? Coverage matrix, ten findings, v2 outline |
| `/survey/results` | v1 vs v2 results from stored responses; segment cuts; derived insights |
| `/survey/take` | Take v2 for real (stored with `source = real`) |
| `/dashboard` | Municipal metrics, all derived from the audit log |
| `/audit` | Hash-chained log, verifier, tamper-row-7 demo, reason-code dictionary |

## The wall (reproduced from spec §2)
W1 no personality/trait/fit/trust score about a person · W2 no free text is scored, ranked or used for allocation · W3 no AI-text detection · W4 no biometric/image-content classification (hash only) · W5 no phone as identity · W6 no passports/ID/BSN stored · W7 no custody of deposits · W8 no queue reordering · W9 every refusal has a code and a written motivation · W10 every REFUSE/HOLD reaches a named human in 24 h · W11 no sublet without recorded landlord consent · W12 mock values always show their issuer.

Note on the personas: they carry *simulation-only* traits (e.g. `aiTrust`, `skeptic`) to generate synthetic survey answers. They live in `src/lib/personas.ts` / `survey.ts` / `adoption.ts`, are never imported by the allocation engine (checked in `scripts/verify.ts`, T-09), and are labelled SIMULATED wherever shown.

## What is mocked, and what the real thing needs
| Mock | Real |
|---|---|
| `idin:mock-bank` | iDIN via a certified broker |
| `kadaster:mock` | Kadaster owner lookup (paid per query — open question 7) |
| `bag:mock` | Public BAG API |
| `kvk:mock` | KvK Handelsregister API |
| `phash:mock` / `tineye:mock` | own sha256 + dHash plus an external reverse-image API |
| `huurcommissie:approx` | the official Huurcommissie calculator (the model is labelled `WWS-O-2026-approx`; the 60-pt base and furnishing/heating terms are our additions — SPEC-GAP) |
| `escrow:mock` | licensed escrow partner |
| Listing photos | Pexels stock images (illustrative) |
| Survey respondents | 262 synthetic personas — **not user research** |

## SPEC-GAPs we recorded
- The spec's name-similarity table says `P. de Vries ~ J. de Vries` must fail, but its token filter drops initials (score 1.0). We added an initials-consistency check.
- The fraud fixture's identity check **passes** (a fraudster using their own real identity but someone else's house) so the three named codes are exactly `LOT-DUP-01`, `LOT-OWNER-02`, `LOT-RENT-04`. The adapter table in §5.3 says "failed"; ours is the more realistic reading.
- Fixture rents were adjusted (never the algorithm) so each of the four fixtures produces its expected outcome; the dup check compares only against already-live inventory.
- The funnel draw stream was calibrated (`scripts/calibrate.ts`, variant 121176) so seed 20261111 produces `214→181→99→79→32→15→15→11→1`. The cohort prior (NL 42 / EU 28 / non-EU 30) is untouched.

## Survey review in one paragraph
The Google Form pitches "AI-powered matching" (the build refuses to do that), has no segmentation (RUG vs Hanze vs international), never asks about the queue/cap, hospiteer, sublet consent, or reasons for declines, merges unlike items into one single-choice "most valuable feature", and gives landlords the student questionnaire. `/survey` has the full coverage matrix; v2 covers 9.5 of 10 needs vs 3.5 for v1.

## Open questions (spec Appendix C)
1. Is 10 the right active-application cap? Test 5/10/15. 2. Per-code refusal counts or per-neighbourhood overpricing for municipalities? 3. Does a €5–10 refundable commitment deter the poor? 4. Which meeting format gives comparable 20-minute judgements? 5. Who is the first paying institution? 6. Does the 48 h floor leave rooms empty? 7. Real cost of a Kadaster lookup at volume?

*Working demo for a hackathon. Checks are simulated where marked. Detector figures are used as a simulation input, attributed. Not legal advice.*
