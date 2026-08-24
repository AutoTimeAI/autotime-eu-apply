# apps/analytics

A standalone Python FastAPI service that turns a user's tracked evidence
checks and application outcomes into descriptive statistics: observed
interview rate by Decision Index score band, by content gate, and by risk
exposure, plus a "learning stage" signal for whether enough real outcomes
exist yet to justify calibration or model-training claims.

It never predicts anything. See the `limits` list `POST /evidence-outcomes`
always returns, and `learning_stage` in `main.py`.

## How it's deployed and called

`vercel.json` routes the public `/analytics` prefix straight to
`apps/analytics/main.py`, so this runs as its own independent process
alongside `apps/web`, not through a Next.js API route.

The only caller today is the web dashboard: `runOnlineAnalytics` in
`apps/web/components/DashboardExperience.tsx` fetches
`${NEXT_PUBLIC_ANALYTICS_URL ?? "/analytics"}/evidence-outcomes` directly
from the browser with the user's own already-persisted evidence/outcome
records. There is no server-side proxy route and **no authentication** on
this endpoint currently.

## Files

- `main.py` - the entire service: Pydantic request/response models, the
  scoring/bucketing helpers, and the two routes (`GET /health`,
  `POST /evidence-outcomes`).
- `tests/test_analytics.py` - exercises both routes via FastAPI's
  `TestClient`.
- `pyproject.toml` - dependencies (`fastapi`, `pydantic`; dev extras add
  `httpx`, `pytest`, `uvicorn`).

## Local development

```bash
cd apps/analytics
pip install -e ".[dev]"
uvicorn main:app --reload
```

## Tests

```bash
cd apps/analytics
pytest
```
