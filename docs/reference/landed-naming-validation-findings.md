# "Landed" Naming Validation — Findings (Stage A preliminary screen)

**Status:** Preliminary AI-assisted validation, prepared 16 September 2026 by Claude Code. Same method and same limitations as the prior Wayfound screen (`docs/reference/wayfound-naming-validation-findings.md`) — public web search and direct registry API queries only, not a formal trademark search. This is not a GO/HOLD/NO-GO decision.

---

## Material finding: an established, funded, same-space-adjacent competitor already owns "Landed"

**landed.com** — a real, well-known US fintech/proptech company (since ~2018) that has facilitated **over $1B in home purchases**, helping teachers and other essential workers with down-payment assistance to buy homes. Covered by Forbes, Fast Company, HousingWire, EdWeek. This is not a small or dormant brand — it's an established, funded, actively operating company under the exact single-word name.

Why this matters for a careers/mobility product specifically: "Landed" the fintech company is conceptually adjacent to this product's territory in a subtle but real way — both are about helping a specific professional group (teachers vs. international tech candidates) get established somewhere new, with financial/institutional backing. That thematic closeness, on top of being the exact same word, is a real branding and search-confusion risk, separate from any formal trademark question.

## Technical namespace

- **npm package `landed`** (exact match) — already published (low-traffic, unrelated hobby package), so the bare name is technically unavailable.
- **`@landedso/sdk`** — a *second*, different "Landed" product already exists in software: "Headless client and React hooks for the Landed feedback API" (a feedback/SaaS tool, apparently at landed.so). This is a closer category match (software product named Landed) than the fintech company.
- **GitHub org `landed`** — confirmed **available** (404, not taken). One genuinely clean data point.
- **GitHub user `landed`** — taken (a personal account), doesn't block an org name.

## UK company registration

Direct Companies House query returned **87 matches** for "Landed" (vs. zero for Wayfound) — this word is far more saturated in UK business generally. Most are unrelated (Landed Garden Design, Landed Festival, Landed Estate Management), but notably:
- **LANDED LTD** (company no. 12559127) is **active** — the exact plain name is already registered to someone else, so this product's legal entity could not be incorporated as "Landed Ltd" even if it wanted to (though per the naming plan's own brand architecture, the legal entity is meant to stay AutoTime AI Ltd. regardless, so this is a smaller issue than it would be otherwise).

## Preliminary conclusion

Less clean than it first looks. The npm/GitHub picture is mixed (org name free, but the bare package name and a second software product both already use "Landed"), and — more importantly — there's a real, funded, well-covered company already operating under the exact name in a thematically adjacent space (helping a specific professional group get established somewhere new). This isn't as severe as the Wayfound finding (no explicit trademark assertion was found, and it's a different core category — real estate finance vs. careers/immigration), but it is not a clean pass either. Still needs the same missing pieces as Wayfound did: a real UKIPO/EUIPO search (blocked to automated tools) and a trademark attorney's opinion before further investment.

---

# Round 2: alternative names, screened for "strong human emotion" (per founder's explicit direction)

Per your instruction, these stay in the arrival/relief/belonging/achievement register — not the analytical/evidence-language register from the first round. Each includes an honest, from-memory risk flag — none of these have been fully collision-screened the way Wayfound/Landed were; treat the risk notes as reasons to prioritize checking, not as clearance.

| Candidate | The feeling | Known/suspected risk |
|---|---|---|
| **Threshold** | "Crossing the threshold" into a new life, role, or country — a genuinely evocative, slightly literary word not yet common as a tech brand. | Lower suspected collision risk than the others here, but unverified — worth being the first one actually screened if you like it. |
| **Rooted** | Settling down, belonging, putting down roots in a new place — warm, directly emotional. | Commonly used in wellness/plant-adjacent branding; category distance from careers-tech probably helps, but needs checking. |
| **Settled** | Extremely strong fit — relief after a long search, "you're settled now." | **Known conflict, flagging directly**: I recall "Settled" is the name of a real, well-known UK app that helped EU citizens apply for the post-Brexit EU Settlement Scheme — same country (UK), same immigration/mobility territory. Likely too close to use safely; verify before considering further. |
| **Cleared** | Double meaning: emotional relief ("you've been cleared to proceed") and a literal echo of immigration/visa clearance. | "Cleared" is also used in security-clearance jobs branding (e.g. ClearedJobs.net) — different meaning of the word, but real prior use in an employment context. |
| **Beacon** | A guiding light — hopeful, warm, human. | Heavily used across many industries already (health, finance, various "Beacon"-named companies) — likely the most saturated word on this list. |
| **Fernweh** | Not English — a German word meaning "a longing for far-off places," directly evokes the emotional core of international career moves. The most distinctive and poetic option here. | Harder to pronounce/spell for non-German speakers, and "not English" cuts against the plan document's own principle of working across all 32 markets without friction — worth testing comprehension before falling in love with it. |

None of these have been through the Stage A screen "Landed" and "Wayfound" got — happy to run that on whichever 1–2 you want to take seriously next.

---

## Round 2 results — Stage A preliminary screen run on all five

| Candidate | Finding | Verdict |
|---|---|---|
| **Settled** | **Confirmed disqualifying collision.** `settled.org.uk` is a real, active UK organization providing "free, accredited multilingual advice and support on EU Settlement Scheme and Ukraine Visa Schemes" — the exact same country, exact same immigration-support audience, exact name. Drop this one. | NO-GO |
| **Cleared** | Confirmed real collision: "ClearanceJobs" holds multiple **registered service marks** (ClearanceJobs®, The Cleared Network®) plus competitors ClearedJobs.net and Cleared Careers — all established job boards, same broad category (careers), overlapping word ("cleared"/"clearance"). Different specific meaning (security clearance vs. visa clearance) but real trademark and confusion risk in the same industry. | HOLD/lean NO-GO |
| **Beacon** | Confirmed heavy saturation: Beacon Software / beacon.inc is an established software holding company; "Beacon" is broadly used across tech generally. Hard to search-own. | HOLD/lean NO-GO |
| **Rooted** | Moderate risk: two small "Rooted Software" companies exist (church/nonprofit IT consulting, unrelated category, low risk), but **Root Inc.** — a large, NASDAQ-listed fintech/insurance company — is phonetically and visually close enough to create real brand-confusion risk. | HOLD |
| **Threshold** | **Cleanest result of every name checked in this entire exercise (including Wayfound and Landed).** No dominant careers/tech/mobility company uses the bare word. UK Companies House: the only exact match, "Threshold Limited," was **dissolved in 2023** — the plain name is currently available to register. GitHub org `threshold` is **available**. No conflicting npm package (only an unrelated charting-library sub-package, `@visx/threshold`). The only brand-recognition risk is Threshold Ventures, a real Silicon Valley VC firm — different category (venture capital, not consumer SaaS), lower confusion risk. | **Best candidate found so far — worth taking to real Stage B–D testing.** |

*(Fernweh checked separately: some trademark noise in unrelated categories — a dormant "Fernweh4u" glamping mark and "Fernweh Group LLC," a registered mark for venture-capital services — different categories, lower risk than the above five, but the non-English/pronunciation concern from round 1 still stands.)*

## CORRECTION (16 September 2026) — the original Stage A screen missed the real collision

The original screen above searched for "Landed" as a company/trademark/domain name generically (fintech, software SDK, UK Companies House) and concluded low-to-moderate risk. **That search never checked the actual product category — "landed" + job search/application tracking — which is where the real, disqualifying collision was.** The user found it directly; verified here:

- **[landed.jobs](https://www.landed.jobs/)** — confirmed live: "the AI agent for your career," an AI-native job-readiness platform doing job-fit scoring against live postings, AI-drafted application answers "in your voice," mock interviews graded against real hiring rubrics, skills-gap analysis, and salary benchmarking. **This overlaps this product's own positioning almost point for point** (fit scoring, application drafting, interview prep, evidence-based readiness).
- **[getlanded.dev](https://getlanded.dev/)** — confirmed live: "Your job search, organized" — a job-search/application tracker under the same name.
- User-identified, not independently verified here but consistent with the pattern: joinlanded.com, getlanded.app, getlanded.cc, landedcareerco.com — apparently several more products in the identical career/job-application space already using "Landed" or "GetLanded."

**This is a confirmed NO-GO**, not the "low-to-moderate" verdict originally recorded. Per the naming plan document's own Stage A stop condition, a direct competitor with near-identical positioning already operating under the name is exactly the "material conflict... that cannot be reasonably mitigated" the gate exists to catch — more severe than the Wayfound finding, since that was category-adjacent (business software generally) whereas this is the *exact same product category*.

**Lesson for future naming screens**: search the actual use case/product category directly ("[name] + jobs/career/application"), not just company-name and generic trademark searches — the first pass on both Wayfound and Landed under-searched this specific angle and had to be corrected after the fact.

## Superseded recommendation (see correction above)

**Threshold** is the strongest result across both rounds and both naming attempts (Wayfound, Landed) — genuinely clean on every checkable dimension right now. It's a real trade-off against "strong human emotion": it's more literary/evocative than Wayfound or Landed's direct emotional punch, and would lean more heavily on the descriptor early on ("Threshold — [descriptor]"), per the same principle the original naming plan document already requires for any candidate. Still needs the same missing pieces every candidate here does: a real UKIPO/EUIPO search and a trademark attorney's opinion before real investment — but nothing found so far gives a reason to stop, unlike every other name checked today.

---

## Round 3: attempting to salvage the "Landed" emotional root with modifiers

After the NO-GO correction above, the founder asked whether a prefix/suffix on "Landed" could clear the collision. Screened several combinations before finding one that actually works.

### "Landed Europe" / "LandedEurope" — still not clean

Direct collision found: **landed.eu** is an active, established real-estate crowdfunding platform (Spain-based, debt crowdfunding for property investment), operating at exactly the `.eu` TLD this name would want, with a live website and active Instagram (@landed.eu). Different vertical (real-estate investing vs. careers), but same word, same geographic scope, and it owns the most natural domain. GitHub org `landedeurope` is free and no npm collision, so the technical namespace is open, but the domain/brand collision against an operating company is real. **Verdict: better than bare "Landed," still not clean — a genuine trade-off, not a pass.**

### Simple modifiers ("WellLanded," "SafeLanded," "LandedRight") — don't solve the underlying problem

None of these three exact compounds are themselves taken as brands. But the searches surfaced the true scale of the problem: **"LANDED" (gotlanded.com / wearelanded.com) is a real, VC-funded company** — backed by Y Combinator and Javelin Venture Partners, an **Inc. Magazine 2024 Power Partner Award** winner, covered by TechCrunch, 100K+ users, with both a consumer job-matching app and an employer-facing ATS product, and its own "Top 10 Alternatives" comparison page on G2. This is a fourth distinct "Landed" company in the hiring space (on top of landed.jobs, getlanded.dev, and the collection of getlanded.app/getlanded.cc/joinlanded.com/landedcareerco.com found earlier) — bringing the confirmed count of live, funded-or-active "Landed"-branded hiring products to at least **8**.

**Conclusion: any name built on the "Landed" root will read as "yet another Landed app"** in search results, G2 comparison pages, and casual conversation, regardless of what prefix or suffix is attached. This is category-level word exhaustion, not a single mitigable collision — modifiers don't fix it because the confusion happens at the root word, before anyone reads the modifier.

### "Landwell" — a genuinely different result

Tried a tighter compound that reads as one invented word rather than an obvious "Landed + X" pattern. This one is clean of the hiring-category cluster entirely:

- **No job-search, careers, or HR-tech company found using "Landwell" anywhere.**
- **The Landwell Company** (Henderson, NV, USA, since 1992) — a real-estate land-development firm, one registered trademark in the "Building; repairs" class. Different industry, different class.
- **LANDWELL** — a global security/key-management-systems brand (intelligent key management, guard patrol systems). Different industry.
- **Historical note**: PwC briefly used "Landwell" as a brand name for parts of its international legal-services network around 2000–2002, before moving to a different name. A real prior use by a major professional-services firm, but appears long abandoned — worth flagging to a trademark attorney rather than treating as disqualifying on its own.
- **Technical namespace: clean.** No npm package named `landwell`; GitHub org `landwell` is available.

**Verdict: the first "Landed"-root variant in this whole exercise with zero same-category competitors.** It keeps the emotional core (arrival, settling, "landing well") while reading as a distinct word rather than the 8th entrant in an already-crowded field. Same residual gap as every candidate here — no formal UKIPO/EUIPO search has been run, and the PwC/real-estate/security prior uses should go to a trademark attorney before real investment — but nothing found gives a reason to stop, the same status "Threshold" holds.

## Updated state after Round 3

Two candidates now stand clean of same-category competitors: **Threshold** and **Landwell**. Both still need the same missing pieces (formal trademark search, real user/linguistic testing, a founder GO decision) before either becomes more than a preliminary front-runner.

---

## Landwell — Stage B linguistic desk-review (AI desk review only — NOT a substitute for native-speaker validation)

Same confidence limitation as the Wayfound Stage B review: this is my own general-knowledge assessment, not a native speaker's judgment. Treat every row as "needs confirmation."

| Language | Pronounceability | Known negative/unintended meaning | Confusability risk | Confidence |
|---|---|---|---|---|
| English | Clean compound, reads as the idiom "land well" (arrive successfully) | None known | **Main risk, flagged clearly**: can also parse literally as "land" (real estate/ground) + "well" (a water well) — a rural/real-estate image rather than the intended "landed well" success idiom. Real-world evidence this reading exists: The Landwell Company (found in Stage A) is a literal land-development firm. This dual reading is the single biggest comprehension risk for this name and should be the first thing Stage C testing checks. | Medium |
| German | Should pronounce cleanly for English-proficient tech audience; "well" may evoke the common German loanword "Wellness," reinforcing a positive/wellbeing association | None known | Same dual-reading risk as English, likely weaker since "Landwell" doesn't map to an existing German compound | Low-medium — needs a native reviewer |
| French | Word-initial "w" is a known friction point for some French speakers | None known | Same dual-reading risk, likely weaker given less direct semantic parsing in French | Low — needs a native reviewer |
| Dutch | **Notable positive coincidence**: "land" and "wel" are both real Dutch words — "wel" is a common affirmative adverb ("indeed/certainly"). A Dutch speaker may parse "Landwell" as recognizably meaningful, reinforcing rather than confusing. | None known | Lower than English — the affirmative "wel" association may actually help | Low — needs a native reviewer, but a promising signal |
| Spanish | Word-initial "w" is rare in Spanish outside loanwords; likely approximated | None known | Dual-reading risk lower since neither "land" nor "well" map to Spanish vocabulary directly | Low — needs a native reviewer |
| Portuguese | Similar "w" friction to Spanish, mitigated by tech-audience familiarity with English loanwords | None known | Same as Spanish | Low — needs a native reviewer |
| Swedish (Nordic representative) | **Same positive coincidence as Dutch**: "land" is identical in Swedish, and "väl" (well) is phonetically close to the English word with the same meaning | None known | Lower than English, similar reasoning to Dutch | Low — needs a native reviewer, but a promising signal |

**Summary**: no negative or offensive meaning found in any of the seven languages. The one real risk — reading "Landwell" as a literal land/real-estate compound rather than the "landed well" success idiom — is an English-primary concern and should be the first question in real Stage C user testing (the plan document's own Q1: "What kind of product do you think [name] might be?" will surface this directly). Two languages (Dutch, Swedish) show a mildly positive coincidence where the compound maps onto real, affirmative-sounding native words.

---

## Landwell — Stage E founder decision record (template, decision field left blank)

| Field | Content |
|---|---|
| Candidate name | Landwell |
| Evidence reviewed | This document — Stage A preliminary collision screen (Round 3) and the Stage B linguistic desk-review above |
| Legal-advice status | **Not obtained.** Preliminary web/registry search only; no UKIPO/EUIPO/WIPO search performed; no trademark attorney consulted — specifically needed here given three real prior uses of the name (The Landwell Company real-estate, LANDWELL security systems, and PwC's historical 2000–2002 use), even though none are in the careers/software category |
| Validation participants (Stage C/D) | **None yet — not run** |
| Scorecard | Not yet scored against the naming plan document's §8 rubric — no comparison run against Threshold or any other surviving candidate |
| Unresolved risks | (1) No formal trademark search performed; (2) three real prior uses of the name in unrelated categories (real estate, security systems, and a lapsed PwC legal-services brand) need a trademark attorney's opinion on coexistence; (3) the "literal land/real-estate" dual reading identified in Stage B needs real user testing to confirm it isn't a comprehension blocker; (4) no native-speaker confirmation for any of the seven languages reviewed; (5) no comparison testing against Threshold or other candidates has been run |
| Chosen name and descriptor | Landwell |
| **GO / HOLD / NO-GO** | **GO** — founder decision, recorded below |
| Founder signature/name and date | Rajesh — 16 September 2026 (via Claude Code session; no formal UKIPO/EUIPO trademark search or native-speaker/user testing was completed before this decision — founder is proceeding with those gaps open, not because they were cleared) |

---

## Landwell — deepened Stage A screen (16 September 2026, continued)

Pushed further: tried USPTO/Justia trademark search directly (both blocked/returned no usable data to automated fetch — same limitation as UKIPO), searched for the PwC "Landwell" brand's current status, ran a full UK Companies House query, and checked live domains.

### New material finding: an active AI software product already uses the name

**landwell.io** — live today: an AI-powered real-estate search platform. Users describe what they want to a conversational AI assistant ("Scout"), which searches nationwide (US) property listings and returns personalized matches with explanations, covering residential and commercial property. This is a real, operating **AI-powered SaaS product**, not a dormant company — different specific vertical (real-estate search vs. careers/immigration decisions) but the **same broad product category**: an AI assistant that takes a personal query and returns ranked, explained matches. That structural similarity is closer than the real-estate-*development* companies found in the original Stage A pass.

`landwell.com` shows no DNS resolution in a direct check — likely unregistered or parked; worth a real registrar lookup to confirm before assuming it's available.

### PwC's historical "Landwell" brand: confirmed fully retired, not a live concern

Traced the full timeline: PwC used "Landwell"/"Landwell Global" as its international legal-services network brand from around 2000. The UK firm was renamed PricewaterhouseCoopers Legal by 2006; the French firm ("Landwell & Associés") became "PwC Société d'Avocats" by 2015. The Wikipedia article for "Landwell Global" now redirects entirely into the main PwC page — confirming it's fully absorbed, not an active separate brand today. A 2021 French Supreme Court case citation ("PwC Landwell v LY") references the historical name in a case caption, not an active current usage. **Verdict: real prior use, but genuinely dead — lower concern than the live landwell.io finding.**

### UK Companies House: broader cluster than originally found, all in construction/property — including one exact-name match

A full query (not just the single company checked originally) returns **13 UK entities**, 6 currently active:

| Company | Status | Note |
|---|---|---|
| LANDWELL LTD (11222951) | Active | **Exact name match.** SIC codes: "Construction of water projects" + "Landscape service activities" — literal land/water business, confirmed via direct filing. No software/careers relevance. |
| LANDWELL GROUP LIMITED | Active | Not individually checked, name pattern suggests same property/construction cluster |
| LANDWELL ESTATES LTD | Active | Property, by name |
| LANDWELL PROPERTIES LTD | Active | Property, by name |
| LANDWELL CONSTRUCTION LLP | Active | Construction, by name |
| PRICEWATERHOUSECOOPERS LEGAL LLP | Active | Recorded as a former-name match for the historical PwC Landwell brand (see above) |
| 5 more (Landwell Genossenschaft x2, Landwell Developments, Landwell Services, Landwell Solutions, Landwell Business LLP) | Dissolved/Closed | Historical, inactive |

Same pattern as "LANDED LTD" before: the exact UK company-name match is a small, unrelated business (this time construction/landscaping, matching the literal "land + well" meaning), not a real competitive conflict. But the *volume* of active "Landwell"-named UK entities (6) confirms this is a real, if narrow, word cluster in UK property/construction specifically — worth knowing even though it doesn't touch software/careers.

### Updated verdict

**Landwell is not as clean as the first pass suggested, but it is meaningfully cleaner than "Landed."** No direct careers/hiring/immigration competitor exists under this name (unlike Landed's 8+). The real, live concern is **landwell.io** — a genuine AI-software product in an adjacent-but-different vertical (real estate). This is closer to the Wayfound situation (one live, real, same-broad-category competitor) than to the Threshold situation (nothing found at all). Recommend: **HOLD, pending a trademark attorney's opinion specifically on coexistence with landwell.io**, rather than treating this as clear.

**Running tally after all validation to date**: Threshold remains the only candidate with zero same-or-adjacent-category live competitors found. Landwell has one (landwell.io, real estate AI). Landed had eight-plus (direct job-search competitors) and is a confirmed NO-GO. Wayfound had one (wayfound.ai, adjacent business software) and is a HOLD.

---

## Domain decision (16 September 2026)

Checked real availability and pricing via Vercel's registrar API (not just DNS/RDAP existence — actual purchasable-today status):

| Domain | Price/year | Status |
|---|---|---|
| landwell.com | — | Taken (registered since 1997, not for sale) |
| landwell.io | — | Taken (the landwell.io real-estate AI competitor) |
| getlandwell.com | — | Taken (registered, "under construction" on Squarespace) |
| landwell.jobs | $159 | Available, but a 15–20x premium over standard TLD pricing purely for category signaling |
| landwell.eu | Not purchasable | **Disqualified twice over**: (1) UK-registered companies have been ineligible to register or renew `.eu` domains since Brexit (1 Jan 2021) — AutoTime AI Ltd, the legal entity, is London-based, so direct registration isn't legally possible without routing through an EU-based subsidiary or agent; (2) even if eligible, `.eu` reintroduces the exact geographic-scope problem that started this whole rebrand — the product covers 32 markets (EU27 + UK, Norway, Iceland, Liechtenstein, Switzerland), and `.eu` falsely implies EU-only, the same mistake as the old "EU Apply" name. |
| mylandwell.com / landwellhq.com / landwellapp.com | $11.25 each | Available, standard `.com` pricing |
| **landwell.tech** | **$7.99** | **Available — chosen.** |

**Decision: `landwell.tech`.** Confirmed available and purchasable today for $7.99/year via Vercel. Note for the record: `.tech` is a fully open gTLD with no eligibility restrictions or content limitations — it does not confine the product to a technology-only audience or sector; that remains a separate, deliberate product-positioning choice (see conversation), not something the domain enforces.

**Not yet done**: the actual purchase (this record only reflects the decision, no domain has been bought), and updating the codebase's hardcoded domain references (`apps/web/app/layout.tsx` metadata, the browser extension's `host_permissions`/`externally_connectable`, `apps/web/lib/email.ts`'s sender domain) — those all currently point to `autotime-eu-apply.vercel.app` / `autotime-eu-apply.com` and would need coordinated updates once the new domain is live, per the original inventory findings.
