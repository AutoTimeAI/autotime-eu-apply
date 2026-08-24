# Phase 1 Home founder-review evidence manifest

## Provenance

- Worktree: `C:\Development\Autotime-EU-Apply\.codex-temp\design-worktree`
- Branch: `design/product-experience-reset`
- Evidence directory: `screenshots/phase-1-home/corrected-final-apps-v3/`
- Browser: Chromium, one Playwright run, one worker
- Fixtures: authenticated test principal; no public fixture route or query flag
- Visual review: founder approved 3 August 2026

Each PNG has a neighbouring `.png.json` sidecar containing its absolute path, UTC modification timestamp, SHA-256, worktree, branch, status summary, viewport, fixture, header height, green scan, CTA obstruction result, and development-overlay result.

| Fixture                 | Expected next action               | Viewport | File                                            | SHA-256                                                            |
| ----------------------- | ---------------------------------- | -------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| Imminent interview      | `prepare_interview`                | 1440x900 | `imminent-interview-corrected-1440x900.png`     | `2bf3b950e205eb76fe9a1c438ad4db215264c4cc8799f46e80ace7f3427d9cd7` |
| Imminent interview      | `prepare_interview`                | 390x844  | `imminent-interview-corrected-390x844.png`      | `48281ee63b8d43f3d354f5dd30b0680a17bd184da0b8a4ab610ecca053ed3812` |
| Completely new user     | `add_career_evidence` / onboarding | 390x844  | `completely-new-user-corrected-390x844.png`     | `a0b5fa8f52c411297db0a17b30ae626356951f6fc203c275913955867ce261e3` |
| Active application      | `review_application`               | 390x844  | `active-application-corrected-390x844.png`      | `99f0bc6247d8dfeb2084d85fbcb98d8af34a22fdb04659c90c115ee39deb7aed` |
| Integration unavailable | safe retry                         | 390x844  | `integration-unavailable-corrected-390x844.png` | `dd83492ff449f5d931dd768e482110f1c42fcdeb1b9a3c98c67416a3bc7d30e4` |

## Capture gates

Every capture asserts:

- no `Upgrade - GBP 9/month` text or full-width promotion banner;
- no duplicate Home journey grid;
- no rendered green-family colour in text, backgrounds, gradients, borders, outlines, or shadows;
- no visible Next.js badge or development dialog;
- skip link hidden until keyboard focus;
- no underlined text inside the primary CTA;
- exactly one visible primary action;
- primary CTA centre unobstructed and inside the viewport;
- no horizontal document overflow;
- account menu closed;
- desktop/mobile navigation appropriate to the viewport.

Mobile captures additionally assert a computed navigation label size of at most 10px, the visual label `Apps`, the accessible name `Applications`, and at least 12px between Apps and Interviews.

The ten-state deterministic action matrix remains asserted by `tests/e2e/23-phase-1-home-states.spec.ts`; it is automated coverage rather than the founder-review screenshot set.
