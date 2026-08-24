# Founder-approved visual baseline refresh

Approval reference: **Visual baseline refresh approved on 24 August 2026.**

Only these baselines were replaced:

| Baseline          | Viewport | Classification                                             | Result                       |
| ----------------- | -------: | ---------------------------------------------------------- | ---------------------------- |
| Desktop login     | 1440×900 | Old image captured fallback/error UI and development badge | Replaced with real login UI  |
| Mobile login      |  390×844 | Old image captured fallback/error UI and development badge | Replaced with real login UI  |
| Desktop dashboard | 1440×900 | Intentional Product Walkthrough from commit `f837e201`     | Founder-approved replacement |

No other snapshot was modified. The complete 12-test Chromium suite was then run without snapshot-update mode: **12 PASS, 0 FAIL, 0 remaining differences**, exit code 0. Visual inspection confirms the login captures show “Open your dashboard,” account-consent controls and sign-in actions; neither contains fallback/error copy or a development issue badge.

Working evidence is in `test-evidence/remediation-working/visual-baseline-refresh/`, including before/after PNGs, clean suite log, environment/browser/viewport/timestamps and SHA-256 hashes. Because the remediation working tree is not yet frozen, this execution must be repeated against the eventual candidate SHA before it can satisfy the final release gate.
