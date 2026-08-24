# Current test inventory

The canonical catalogue is `test-cases.csv` and `test-cases.json`. It covers repository automation plus explicitly required manual and runtime scenarios. A test definition is not execution evidence.

## Harnesses

| Harness            | Scope                                             | Canonical command                                            |
| ------------------ | ------------------------------------------------- | ------------------------------------------------------------ |
| Node/TypeScript    | unit, contract, security and static checks        | `pnpm test:unit`                                             |
| Playwright         | browser E2E, accessibility, responsive and visual | `pnpm test:e2e`                                              |
| Next.js            | production compilation                            | `pnpm build:web`                                             |
| WXT                | extension compilation and tests                   | `pnpm build:extension`; `pnpm --filter extension test`       |
| pnpm audit         | dependency vulnerability audit                    | `pnpm audit --audit-level high --json`                       |
| Lighthouse         | local public-page performance/accessibility       | `pnpm test:lighthouse`                                       |
| Supabase/Postgres  | RLS, role, concurrency, migration and recovery    | BLOCKED until an authorised local/test database is available |
| Founder-led manual | UAT and scoped OWASP/API assessment               | Requires recorded operator, timestamp and evidence           |

Legacy reports under `docs/reference/` are contextual only. They are not current release evidence unless indexed, hashed, and tied to the frozen candidate SHA.
