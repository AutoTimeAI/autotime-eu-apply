# Manual verification for feature-spec phases 1–10

Run `powershell -ExecutionPolicy Bypass -File scripts/verify-feature-implementation.ps1` on Windows, or `bash scripts/verify-feature-implementation.sh` on macOS/Linux. The checks below require live credentials, deployed infrastructure, browser interaction, or human review and therefore are not asserted by the repository script.

## Ingestion and data

- Trigger `sync-eures` locally and in production; confirm real `source = 'eures'` rows, pagination, and retry/backoff behavior.
- Test Greenhouse, Lever, Ashby, and Personio with a real company and a company with no open roles. Confirm normalized title, company, location, URL, and ATS platform fields.
- Run overlapping sources and confirm `dedup_hash` prevents duplicates. Use `EXPLAIN ANALYZE` at realistic volume to confirm the unique index is used.
- Verify intended `job_listings` RLS using an authenticated non-admin session.
- Test Adzuna and Jooble with live server-side credentials, inspect current quota headers, and confirm rate limiting degrades gracefully.

## Product flows

- At `/dashboard/jobs/browse`, confirm EURES and direct-feed listings appear together and tracking a listing creates one private tracked job.
- Export a CV and confirm selectable, complete plain text, a single-column layout, conventional headings, and no header/footer contact fields. Tailor against a real tracked job and confirm job-specific changes.
- Generate two cover-letter versions for a synced tracked job, edit the latest version, and confirm both versions remain user-scoped in `cover_letters`.
- Draft all three outreach channels and check the 300-character LinkedIn-note and approximately 150-word InMail/email constraints.
- Confirm manual contact fields persist. Compare peer tone with recruiter/manager tone: peer outreach must be informational, request a short role/team conversation, and contain no application or referral ask.
- Confirm copying marks the draft sent, records `sent_at`, and schedules the expected follow-up. Confirm no LinkedIn endpoint is called.
- Complete the ESCO questionnaire and confirm profile-aware adaptive questions, per-round profile writes, plausible overlap-only role ranking, and human-readable skill explanations. Confirm realistic official ESCO row counts; vector matching is intentionally deferred.

## Extension

- Greenhouse: reference-only mode; no selector extraction.
- Workday: selector extraction remains available.
- Bespoke career site: generic title and JSON-LD `JobPosting` fallback works.
- LinkedIn and restricted boards: manual-only; no page extraction or automation.
- With a connected account and imported ESCO profile, verify the in-page overlay on one API-covered ATS URL and one permitted fallback page; confirm LinkedIn never renders or extracts an overlay.
- On a LinkedIn job-detail URL, confirm page load alone performs no scoring. Click the extension icon, verify the one-time risk disclosure appears before content is read, acknowledge it, and confirm only an ephemeral ESCO result is shown. Verify search-result pages, clicks, messages, poster data, and raw-content storage remain untouched.

## Compliance and production

- Reconcile `docs/job-aggregation-compliance.md` with the implementation. Candidate data and listing ingestion must remain separated.
- Search for LinkedIn automation, scraping libraries, and credentials; UI labels and explicit manual-only handling are acceptable.
- Confirm production secrets without printing their values, apply migrations, and manually trigger both ingestion functions.
- Enable exactly one scheduler: Supabase `pg_cron` or GitHub Actions, never both.
