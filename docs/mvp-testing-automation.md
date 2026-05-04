# MVP Testing Automation

The MVP target is to automate 90-95% of release confidence and leave only the
parts that genuinely require live browser or live-site evidence as manual.

## Automated Coverage Target

Run:

```bash
pnpm test:mvp:coverage
```

This enforces the current coverage model:

| Area | Mode | Weight |
|---|---|---:|
| Extension domain logic | Automated | 20% |
| Privacy and local-first safety | Automated | 12% |
| Job platform policy and import inference | Automated | 12% |
| Tracker, applications, CSV, and validation metrics | Automated | 12% |
| AI guardrails and fallback behavior | Automated | 9% |
| V2 dashboard data contracts and interview prep | Automated | 12% |
| Web dashboard smoke coverage | Automated | 6% |
| Static quality and production builds | Automated | 12% |
| Manual Chrome side-panel UX confirmation | Manual | 2% |
| Live UK/EU selector drift confirmation | Manual | 2% |
| Controlled live AI-key validation | Manual | 1% |

Current target: 95% automated, 5% manual.

## Full Automated Gate

Run the offline automated MVP gate:

```bash
SKIP_LIVE_SMOKE=1 pnpm test:mvp
```

Run the full gate with deployed dashboard smoke enabled:

```bash
pnpm test:mvp
```

The toolkit writes timestamped evidence to `docs/automation-runs/`.

## Remaining Manual Evidence

The remaining manual slice is intentionally small:

- Load or reload `apps/extension/.output/chrome-mv3` in Chrome.
- Complete `docs/extension-smoke-test.md`.
- Complete `docs/v2-smoke-test.md` if the V2 dashboard changed.
- Validate LinkedIn manual copy/paste only on a live UK/EU job.
- Validate Greenhouse, Lever, and Workday import on live UK/EU jobs.
- Export Applications CSV and Validation Metrics CSV.
- Record results in a generated founder validation report from
  `pnpm validation:new`.
