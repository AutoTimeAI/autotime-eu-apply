# Configuration ownership

`config/` contains shared operational definitions that are consumed by more
than one runtime or deployment process. Tool bootstrap files stay at the
repository root when their tools require fixed conventional locations.

## Configuration map

| Configuration | Canonical location | Owner responsibility |
| --- | --- | --- |
| Workspace commands and dependency policy | `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | Engineering |
| TypeScript baseline | `tsconfig.base.json` | Engineering |
| Web runtime/build | `apps/web/next.config.ts`, `apps/web/tsconfig.json` | Web engineering |
| Extension manifest/build | `apps/extension/wxt.config.ts` | Extension engineering |
| Analytics runtime | `apps/analytics/pyproject.toml` | Analytics engineering |
| Hosting and schedules | `vercel.json` | Platform/CTO |
| Browser verification | `playwright*.config.ts` | QA engineering |
| Performance budgets | `lighthouserc.json` | Web/QA |
| Synthetic monitoring | `checkly.config.ts` | Operations |
| Monitoring contracts | `config/monitoring/` | Operations/Security |
| Environment isolation contract | `config/environments.json` | Platform/Security |
| Runtime and policy ownership | `config/ownership.json` | CTO/Engineering |
| CI and release automation | `.github/workflows/` | Platform/CTO |
| Environment contracts | `.env*.example` | Platform/Security |

## Environment matrix

| Lane | Supabase | Stripe | OpenAI | Email | Sentry | Scheduled jobs |
| --- | --- | --- | --- | --- | --- | --- |
| Local | Development project | Test mode | Mock or controlled key | Sandbox | Development | Off |
| CI | Mock/test boundary | Test placeholders | Mock unless explicit live test | Mock | Test/disabled | Off |
| Preview | Development project | Test mode | Controlled | Sandbox | Preview | Off by default |
| Production | Production project | Live mode | Production | Verified sender | Production | Explicitly enabled |

Secrets never belong in `config/`. Environment examples define names and safe
placeholders only; deployed values live in the environment provider.
