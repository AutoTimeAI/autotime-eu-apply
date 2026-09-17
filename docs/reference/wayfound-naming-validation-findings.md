# Wayfound Naming Validation — Findings (Stage A–E working documents)

**Status:** Preliminary AI-assisted validation, prepared 16 September 2026 by Claude Code per the request in `docs/reference/wayfound-product-naming-plan.md`.
**This document does not constitute a GO decision.** It gathers evidence for Stages A and B where an AI agent can meaningfully contribute, drafts the materials Stages C and D require to be run with real people, and provides a blank Stage E record for the founder to complete.

---

## Stage A — Collision and legal screen (preliminary web search only)

**Important limitation stated up front:** everything below comes from public web search and public registry APIs I can query directly. It is **not** a formal trademark search of UKIPO, EUIPO, or WIPO — those registers block automated queries (confirmed: `trademarks.ipo.gov.uk` returned HTTP 403 to a direct fetch) and require a human to search them through the browser, or a paid clearance search from a trademark professional. Treat everything here as reasons for concern, not a legal clearance.

### Material finding: an active, funded, trademark-asserting company already operates as "Wayfound" in an adjacent category

- **wayfound.ai** — "Wayfound," a business/productivity software company building an "AI Agent Supervision" platform. Confirmed via Crunchbase/PitchBook: **$3.23M raised**, investors including AI Operator's Fund, Bee Partners, Courtyard Ventures, DNX Ventures, Latch VC. Their own terms page states: *"Wayfound's trademarks and trade dress may not be used in connection with any product or service without prior written consent."* — an explicit, asserted trademark claim.
- This is the same broad legal/commercial class this product would file under (software/SaaS/business platform), which is exactly the kind of conflict the plan document's own Stage A stop condition is written to catch: *"a material conflict in a relevant market or class that cannot be reasonably mitigated."*

### Technical namespace: the exact name is already taken where this product would need it

- **npm package `wayfound`** — exists, actively maintained, v2.5.0, last updated **2026-09-14** (two days before this check). Published by `wayfound.ai`'s own team (`chad@wayfound.ai`, `james@wayfound.ai`). Source: `https://github.com/Wayfound-AI/wayfound-sdk-javascript`.
- **GitHub org/user `wayfound`** — confirmed to exist (`https://github.com/wayfound`, account ID 107059236). The exact lowercase org name is unavailable.
- **X/Twitter `@wayfound`** — resolves (HTTP 200); note X's client-rendered pages can return 200 for unregistered-looking URLs too, so this specific check is lower-confidence and should be re-verified by actually opening the profile.

### Other active organizations using "Wayfound" (lower risk — different categories, but confirm the name is heavily saturated)

| Domain | What it is | Category overlap with this product |
|---|---|---|
| `wayfound.us` | "A family-controlled navigator for disability systems that connects records across programs and helps prepare applications, letters, and appeals" | **Closest conceptual overlap** — decision-navigation + application preparation, just a different vertical (disability services, not careers) |
| `wayfound.ca` | Wayfound Mental Health Group — counselling, assessment, occupational therapy (Calgary/Edmonton/Toronto) | Low — different industry entirely |
| `wayfound.com.au` | Tourism/destination-branding and wayfinding-signage consultancy | Low, but reinforces the "wayfinding/navigation" association risk noted in Stage B below |
| `wayfoundhq.com` | A 4-week leadership/people-manager training program | Low — different industry |
| `WayFound GmbH` (LinkedIn) | German consulting company | Low, but a real registered business using the exact name in a EU market this product targets |
| `wayfound.com` | No live content found in search results | Possibly available or parked — **needs a real registrar/WHOIS lookup**, not a search-result inference |

### UK company registration

- Direct query against the UK Companies House register (`find-and-update.company-information.service.gov.uk/search/companies?q=wayfound`) returned **zero results** — no UK-registered company is named "Wayfound." This is a genuinely clean data point (registered-company name availability in the UK specifically), separate from the trademark question above.

### Stage A preliminary conclusion

Per the plan document's own stop condition, **this looks like a material conflict that would need genuine legal mitigation, not a clean pass.** The strongest concern is `wayfound.ai`: same broad software/SaaS category, funded, actively trading, and explicitly asserting trademark rights — plus the exact `wayfound` name is already unavailable on npm and GitHub, which would force awkward namespacing (`wayfound-eu`, `getwayfound`, etc.) even before any legal question is resolved. This does not by itself prove a UK/EU trademark application would fail — coexistence is sometimes possible across sufficiently distinct goods/services classes — but it is exactly the kind of finding that should go to a trademark professional before any further investment, per the plan document's own instruction ("Obtain qualified trademark advice before material public investment").

**Still outstanding, requires a human:**
- Actual UKIPO/EUIPO/WIPO register searches (blocked to automated tools).
- A paid clearance opinion from a UK or EU trademark attorney, specifically addressing coexistence with wayfound.ai's registered/asserted marks.
- Manual confirmation of social handle availability (Instagram, LinkedIn company page, Chrome Web Store listing name) — not reliably checkable by automated request.

---

## Stage B — Linguistic and accessibility screen (AI desk review only — NOT a substitute for native-speaker validation)

**Confidence limitation, stated per the plan document's own Stage B requirement:** the plan calls for testing "with speakers or qualified reviewers." What follows is my own general-knowledge assessment of each language, not a native speaker's judgment. Every row below should be treated as "needs confirmation," not "passed."

| Language | Pronounceability | Known negative/unintended meaning | Confusability risk | Confidence |
|---|---|---|---|---|
| English | Straightforward compound ("way" + "found") | None known | High: easily confused with "wayfinding"/"wayfinder" (an established UX/signage term) and could scan as a navigation/maps app | Medium — I'm reasoning in my primary language, still not a real test |
| German | Should pronounce cleanly; direct sense-parallel to "Weg gefunden" (path found), coherent and positive | None known | Same wayfinding-adjacent risk as English, arguably stronger since German UX/logistics contexts use "Wegfindung" (wayfinding) as an established term | Low-medium — needs a native reviewer |
| French | English "w" is a known friction point for some French speakers; may shift stress or soften the final "d" | None known | Same wayfinding association risk | Low — needs a native reviewer |
| Dutch | High English proficiency generally; direct sense-parallel to "weg gevonden" | None known | Same wayfinding association risk | Low — needs a native reviewer |
| Spanish | Word-initial "w" is rare in Spanish outside loanwords; some speakers may render it closer to "guayfound" or "vayfound" | None known | Same wayfinding association risk | Low — needs a native reviewer |
| Portuguese | Similar word-initial "w" friction to Spanish, though "w" loanwords (WhatsApp, web) are extremely common in the target tech-worker demographic | None known | Same wayfinding association risk | Low — needs a native reviewer |
| Swedish (Nordic representative) | High English proficiency; should pronounce cleanly | None known | Same wayfinding association risk | Low — needs a native reviewer |

**The one risk that shows up in every language, not just English:** "Wayfound" reads as a *navigation/wayfinding* product name before it reads as a *career-decision* product name, in every language I assessed. This matches the plan document's own risk table (§11: "Users interpret it as travel/navigation") and is reinforced by real-world evidence from Stage A — `wayfound.com.au` is literally a wayfinding-signage consultancy. The plan's mitigation (always pair with the descriptor) is necessary, not optional, and may need to be permanent rather than just an early-brand-building measure.

**Still outstanding, requires humans:** actual native/qualified-speaker review per language, ideally including a screen-reader/speech-to-text pass, per the document's own checklist — none of which I can genuinely simulate.

---

## Stage C — Target-user comprehension and recall (draft materials, not run)

Ready to send to 5–10 real target candidates, using the exact question set from the plan document (§7), unmodified:

1. What kind of product do you think `Wayfound` might be?
2. What feeling does the name create?
3. After seeing the descriptor, what do you believe the product does?
4. Does it sound credible for a product involving job and mobility evidence?
5. Does it sound like legal or immigration advice?
6. Can you recall and spell the name after a 15-minute unrelated task?
7. Would you feel comfortable sharing a Wayfound decision with a recruiter, adviser or colleague?

Descriptor to show after Q2 (per the plan document): *"Wayfound — Evidence-backed decisions for cross-border technology careers."*

**This has not been run. It requires recruiting real international tech candidates** — something outside what I can do. If useful, I can help draft a short recruitment message for posting in relevant communities, but running actual sessions is founder/human work.

---

## Stage D — Proposition comparison (draft materials, not run)

Per the plan document, this needs four names shown with an identical descriptor and product screenshot, order randomised:

1. Wayfound
2. EU Apply (current name)
3. One descriptive control name — not yet chosen. Suggest something literally descriptive for contrast, e.g. "MobilityFit" or "EvidenceApply" (placeholders — pick something the team wouldn't actually want, so it's a genuine low-anchor control, not a real second candidate).
4. One credible alternative surviving legal screening — **not yet chosen**, since no other candidate has been through Stage A. This step is blocked until at least one more real alternative exists and clears its own collision screen.

**This has not been run**, and step 4 can't be filled in without doing Stage A again for a second candidate name.

---

## Stage E — Founder decision record (template, decision field left blank)

| Field | Content |
|---|---|
| Candidate name | Wayfound |
| Evidence reviewed | This document (Stages A–B, preliminary only) |
| Legal-advice status | **Not obtained.** Preliminary web/registry search only; no UKIPO/EUIPO/WIPO search performed (blocked to automated tools); no trademark attorney consulted |
| Validation participants (Stage C/D) | **None yet — not run** |
| Scorecard | Carried over from the plan document §15.7: Wayfound 3.95/5 vs. 4.0 GO threshold (pre-dates this Stage A finding; the wayfound.ai collision was not priced into that score and would likely lower the "Search/ownership potential" and possibly "Distinctiveness" line items further) |
| Unresolved risks | (1) Active trademark-asserting competitor in an adjacent software category; (2) exact name unavailable on npm/GitHub, forcing a namespaced variant; (3) name reads as navigation/wayfinding rather than career-decision in every language assessed; (4) no native-speaker or real-user validation has occurred |
| Chosen name and descriptor | *(blank — founder to complete)* |
| **GO / HOLD / NO-GO** | *(blank — founder to complete; this is explicitly not my decision to make)* |
| Founder signature/name and date | *(blank)* |

---

## My read, for what it's worth

Not a substitute for the founder's own call, but stated plainly since it's what "validate it" was asked for: the Stage A findings — a funded, trademark-asserting company already operating as "Wayfound" in an adjacent software category, plus the exact name being unavailable on npm and GitHub — are the kind of finding the plan document itself says should stop the process before further investment. I'd treat this as a **HOLD**, pending a real trademark attorney's opinion specifically on coexistence with wayfound.ai, before spending any more time on Stages B–D for this specific name.
