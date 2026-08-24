# k6 load tests

Two scripts, both restricted to safe, public, read-only, non-mutating pages
(`/` and `/login`) — never an authenticated or write endpoint, never a real
job application, never customer data.

## `smoke.js`

1-2 virtual users, ~20 seconds. Meant for local runs and CI, against a
**local** build only — never run automatically against production.

```
k6 run k6/smoke.js
# or against a locally running dev/preview server on a different port:
k6 run -e TARGET_URL=http://127.0.0.1:3100 k6/smoke.js
```

## `load.js`

Configurable via environment variables, conservative defaults (5 VUs, 1
minute):

```
k6 run -e VUS=5 -e DURATION=1m -e TARGET_URL=http://127.0.0.1:3000 k6/load.js
```

## Running against production

This is a **manual, human-triggered action only** — see
`.github/workflows/k6-manual.yml`, which requires a typed confirmation input
before it will target anything other than a local URL. Nothing in this repo
triggers that workflow automatically. If you do run it against production:

- Keep VUs low (single digits) and duration short (a minute or two).
- Only ever target `/` and `/login` — do not add authenticated or
  write-path URLs to these scripts without re-reading
  `docs/quality-assurance.md`'s load-testing section first.
- Never run this during a real incident or alongside another load test.
