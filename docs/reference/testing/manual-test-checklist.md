# Manual Test Checklist

Last updated: 2026-05-23

Manual testing is the 20% judgement-based layer. Use fake data only. Do not
enter real CV text, real job descriptions, email addresses, phone numbers,
visa/share-code data, payment data, cookies, tokens, or API keys.

## Visual UI Quality

- [ ] Homepage and dashboard look polished on desktop.
- [ ] Homepage and dashboard look polished on mobile.
- [ ] Buttons fit text and do not overlap content.
- [ ] The MVP flow order is visible: Job import -> EU fit -> application kit -> waitlist / feedback.
- [ ] Waitlist/feedback panel is easy to find.

## User Journey Clarity

- [ ] Product clearly says Private Beta v1 / Early Access Beta.
- [ ] User understands access is limited and feedback-led.
- [ ] User understands onboarding is founder-led or guided.
- [ ] First user can identify the next action at every step.
- [ ] Job import wording is clear.
- [ ] EU fit wording explains that output is guidance.
- [ ] Application kit wording explains copy/edit/save behaviour.
- [ ] Waitlist and feedback actions are simple and not too long.

## Content Usefulness

- [ ] Application kit output is copy-friendly.
- [ ] Output is specific enough to be useful with fake role/profile data.
- [ ] Output avoids unsupported claims.
- [ ] User can copy individual fields easily.

## Compliance And Disclaimer Wording

- [ ] No job guarantee is stated.
- [ ] No interview guarantee is stated.
- [ ] No visa guarantee is stated.
- [ ] No sponsorship guarantee is stated.
- [ ] Employer/government verification is required before action.

## Real-User UX Feedback

- [ ] User understands this is not a final public SaaS release.
- [ ] First tester completes the flow using fake data.
- [ ] Tester can explain what AutoTime does after one walkthrough.
- [ ] Tester identifies any confusing labels or missing helper text.
- [ ] Feedback is recorded without sensitive personal data.

## Final Production Sanity

- [ ] Production homepage loads.
- [ ] Production dashboard entry loads after sign-in.
- [ ] `/sentry-test` is not available in production.
- [ ] `/api/sentry-test` returns 404 in production unless intentionally enabled.
- [ ] No Stripe/payment flow is touched during MVP QA.

## Sentry Dashboard Privacy Spot-Check

- [ ] Client test error appears in the expected environment.
- [ ] Server test error appears in the expected environment if enabled.
- [ ] Breadcrumbs appear inside captured events.
- [ ] Error-only replay is attached only after an error.
- [ ] No CV text, job description, email, phone, visa/share-code, payment data,
  cookie, token, or API key appears in event payloads.
