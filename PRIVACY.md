# Privacy Summary

This is a short pointer, not the legal source of truth. The authoritative,
regularly-updated privacy policy is the in-app page at
[`/privacy`](https://autotime-eu-apply.vercel.app/privacy)
(`apps/web/app/privacy/page.tsx`) - read that page for the full policy,
current data controller details, and your GDPR rights.

## Data Stored

AutoTime may store:

- Email address and OAuth account identifiers used for sign-in.
- Candidate profile information you choose to save, including role targets,
  work-right details, CV evidence, and your ESCO skill profile.
- Application history, job descriptions, notes, status updates, outreach
  drafts, and interview preparation records.
- Extension connection and sync status when the extension is linked to your
  account.

## Where Data Is Stored

- Browser extension data is stored locally in Chrome extension storage unless
  it is linked and synced to a web account.
- Web dashboard account and product data is stored in Supabase, in an EU
  region.
- The web application is hosted on Vercel; some server workloads may run in
  Vercel regions outside the EEA, subject to Vercel's transfer safeguards.
- Python analytics uses submitted evidence and outcome records to produce
  descriptive analytics and ML-readiness signals.

## Third-Party Processors

AutoTime may use:

- Supabase for authentication and database storage.
- Vercel for hosting and serverless/services runtime.
- OpenAI, when AI features are used, to process job descriptions and profile
  data - not to train OpenAI's models, under a data processing agreement.
- Stripe for subscription and credit-pack payments. AutoTime does not store
  card details.
- Resend for account and matched-job alert email delivery.
- Adzuna, Jooble, EURES, and direct employer ATS providers for job-listing
  data; candidate profile and CV data is not sent to these providers.
- PostHog EU for consent-gated product analytics.

AutoTime does not sell personal data.

## AI And Analytics Limits

AI output must be based on user-provided profile, CV, reusable answers, job text,
and saved evidence. Analytics are descriptive unless enough real outcomes exist
for calibration. AutoTime does not provide immigration, legal, or employment
authorisation decisions.

## Deletion

Users can remove local extension data from extension settings. For a web
account, "Export my data" and "Delete my account" under Settings > Your data
rights are self-service - deletion is immediate and permanent, except for
limited records retained for legal, tax, or fraud-prevention reasons. For
corrections, restriction, or objection requests, contact
hello@autotimeai.com.
