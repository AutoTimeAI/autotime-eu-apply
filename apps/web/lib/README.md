# Web application libraries

This directory contains product rules and integration boundaries shared by the
Next.js routes and components. Pure decision modules are kept separate from
server-only repositories and browser storage adapters so evidence, privacy,
authorization, and workflow rules can be tested without rendering UI.

- `admin-*` implements operations access control and privacy-minimised data.
- `ats-feeds/` and `aggregators/` normalise approved public job sources.
- `cv/`, `esco/`, and `outreach/` support evidence-led product workflows.
- `supabase/` owns browser, request-scoped, and privileged database clients.
- Workflow and storage modules keep user-owned state scoped by user ID.

Callers should prefer an existing boundary here over duplicating policy in a
route or component. Server-only modules must never be imported into a client
component.
