# Role Pathways

Role Pathways is AutoTime's Europe-first, evidence-led career workspace at `/dashboard/role-pathways`. It is not a quiz, a hiring probability, or an immigration decision.

## Architecture and data

`packages/shared/src/role-pathways.ts` owns strict schemas, deterministic evidence weighting, specialised-role gates, transitions, country-market aggregation, lane validation and ESCO providers. ESCO is canonical. `ApiEscoProvider` supports a configured API and `ResilientEscoProvider` falls back to the versioned repository fixture shaped like provider output, including stable IDs, URIs, source and retrieval metadata.

Market adapters return `NormalisedEuropeanJob` with source text for every claim. Observations remain country-specific. Fewer than three vacancies means “insufficient data”; missing data never means zero demand. Initial inputs are pasted/saved jobs and fixtures. EURES-compatible and authorised employer adapters are future work; prohibited scraping is out of scope.

## NVIDIA NIM

```env
ROLE_PATHWAYS_AI_MODE=mock
NVIDIA_API_KEY=
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=openai/gpt-oss-20b
```

Mock mode is deterministic and makes no external request. NVIDIA mode is server-only, low-temperature JSON validated by strict Zod schemas, with a 20-second timeout, one bounded retry with exponential backoff/jitter for 429/5xx/format failures, two-request concurrency limit, 15-minute cache and 80 KB input limit. Email, phone and URLs are redacted. Raw CVs, credentials and model reasoning are not logged. Invalid output fails closed.

The NVIDIA developer endpoint is not guaranteed permanently free or production-grade. Change the open model with `NVIDIA_MODEL`. A production migration can point `NVIDIA_BASE_URL` to an approved NIM or self-hosted OpenAI-compatible endpoint and add durable encrypted cache and monitoring.

## Deterministic method, refresh and privacy

Professional evidence outranks production projects, community work, portfolio work, education and unsupported self-declaration. Preferences alter ordering only. Specialised gates block SQL-only data, general-support cybersecurity, entry-certificate cloud, ceremony-only product, course-only software and tool-use-only AI inflation. Sponsor-register presence is never vacancy sponsorship.

Unsupported aspirations can only be Explorer. Storage is schema/catalogue-versioned and keyed by the non-empty authenticated user ID; cross-user payloads and anonymous keys are rejected. No migration is needed.

Taxonomy and market refresh are separate explicit operations, never page-load work. A production refresh records provider, dataset/schema/model versions, retrieval time, records, countries and success/failure. Add a country by extending governed packs and the preference schema; add a market provider by returning provenance-rich `NormalisedEuropeanJob` records.
