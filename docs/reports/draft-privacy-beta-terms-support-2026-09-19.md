# Draft: Privacy / Beta-Terms / Support Confirmation

**For founder review only — nothing here has been published or wired into the app. This is a draft for you to approve, edit, or reject.**

Prepared to close the "Founder confirmation of privacy notice, beta terms, and support channel" gate in the release dossier. I checked the existing `/privacy` and `/terms` pages against the actual codebase first — they're already specific and accurate (real subprocessors: Supabase, Vercel, OpenAI, Stripe, Resend, Adzuna/Jooble/EURES, PostHog — all confirmed genuinely wired in code, not placeholder text). The one gap in `/privacy` is explicit: *"ICO registration reference will be added after registration is complete"* — that's a real open item, separately tracked as a public-launch requirement, not something I'm drafting around here.

What's actually missing is **beta-specific** content: nothing in the current app states the beta's limitations, or confirms a support channel, in a way a new invited user would actually see and accept. Below is draft text for that gap.

## 1. Existing privacy notice — confirm, don't rewrite

Read `apps/web/app/privacy/page.tsx` and `apps/web/app/terms/page.tsx` yourself and confirm:
- [ ] The subprocessor list still matches what's actually in production (it does, as of today's check).
- [ ] The ICO registration line is acceptable to leave as "will be added after registration is complete" for the current private-beta scope, or whether that needs resolving first.
- [ ] "Last updated: 15 August 2026" should be bumped if you make any edit.

## 2. Draft: Beta Program Terms & Limitations (new content)

Suggested placement: a short acknowledgement step during onboarding (e.g. a checkbox on the onboarding wizard's first screen, or a one-time modal after first login), separate from the general `/terms` page since it's specific to the beta, not the permanent ToS.

> **AutoTime EU Apply — Private Beta**
>
> You're using an early, invitation-only version of AutoTime EU Apply. By continuing, you understand:
>
> - This is a **beta**. Features may change, break, or be temporarily unavailable without notice.
> - AutoTime supports job-search preparation and workflow organisation. **It does not guarantee interviews, job offers, visa sponsorship, or immigration eligibility**, and does not submit applications without your review and confirmation.
> - **Verify country, sponsorship, and salary facts independently** through official sources before relying on them — AutoTime's recommendations are decision support, not legal or immigration advice.
> - **Review and correct all AI-generated content** before using it in a real application.
> - **Don't enter unnecessary sensitive data** — passwords, payment details, passport images, or other personal data beyond what the product asks for.
> - You can report a defect, privacy concern, or security concern at **hello@autotimeai.com** at any time.
> - Your data is handled per our [Privacy Policy](/privacy); general terms of use are at [Terms of Service](/terms).

This closely mirrors the language already drafted in `AutoTime_AI_Private_Beta_v1.0.1_Release_Guide.pdf`'s "Participant acknowledgement" section (which already exists as a document but isn't wired into the product itself) — reusing that wording rather than inventing new language, since it was already written and approved as part of that release guide.

## 3. Draft: Support channel description (for wherever this is shown — e.g. a dashboard footer link, or the beta acknowledgement text above)

> **Support during the beta**
> Email **hello@autotimeai.com** for any question, bug report, or concern. This inbox is monitored by the founder directly during the beta period. For anything urgent — a security or privacy concern, or something that looks like it exposed another user's data — put "URGENT" in the subject line.

This is honest about the current reality (founder-monitored inbox, not a support team) rather than implying a bigger operation than exists — matches the "don't overstate what's actually true" principle already used throughout the existing legal pages.

## What I need from you

- [ ] Approve, edit, or reject the beta-terms text in section 2.
- [ ] Approve, edit, or reject the support-channel text in section 3.
- [ ] Decide where these actually get shown (a real onboarding checkbox with a stored acceptance timestamp is the most defensible — a static text block a user could ignore is weaker evidence if it's ever questioned). If you want the onboarding-checkbox version built, tell me and I'll implement it as a real feature with a DB record of acceptance, not just static text.
- [ ] Confirm the ICO-registration line in `/privacy` is fine to leave as-is for now, or tell me if that needs to change.

Once you've approved wording and told me where it should appear, I can implement it as a real, tracked acceptance step (recommended) or just publish the static text (weaker evidence, faster).
