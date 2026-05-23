# Early User Beta Onboarding Checklist

Last updated: 2026-05-23

## Who To Invite

- UK/EU tech jobseekers actively applying or preparing to apply.
- Users comfortable giving detailed product feedback.
- Users willing to use fake or non-sensitive test data during onboarding.
- Do not invite users expecting a finished public SaaS product.

## What They Should Test

- Whether job import is understandable.
- Whether EU fit check gives a sensible recommendation.
- Whether the application kit is useful enough to copy/edit.
- Whether waitlist/feedback action is clear.
- Whether disclaimers and verification guidance are understandable.

## What Feedback To Collect

- What confused them.
- What felt valuable.
- Whether they trusted the recommendation.
- Whether the application kit saved time.
- Whether they would use it again for real applications.
- What must improve before public launch.

## How To Explain Beta Limitations

- AutoTime EU Apply is in Private Beta v1 / Early Access Beta.
- It is feedback-led and founder-guided.
- It is not a final public SaaS release.
- It does not guarantee jobs, interviews, visas, sponsorship, or employer responses.
- Users must verify employer requirements and official government/immigration guidance.

## What Not To Promise

- Do not promise job outcomes.
- Do not promise interview outcomes.
- Do not promise visa or sponsorship outcomes.
- Do not promise all job sites/import flows will work perfectly.
- Do not promise AI output is legally or professionally final.

## How To Handle Bugs

- Ask the user what they were trying to do.
- Record page/route, action, and visible error only.
- Do not ask for real CV text, full job descriptions, tokens, or private account data.
- Check Sentry for the corresponding event if an error occurred.
- Mark the issue as blocking, confusing, or improvement.

## How To Record Feedback

- Use short notes with fake-data scenario labels.
- Record outcome judgement: useful, unclear, unsafe, missing, or strong.
- Record whether the user would use the product again.
- Keep sensitive personal data out of notes.

## Founder-Led Onboarding Steps

1. Explain the beta scope and limitations.
2. Ask the user to use fake or non-sensitive job/profile data.
3. Walk through job import.
4. Ask whether the EU fit result makes sense.
5. Generate the application kit and ask whether it is copy-ready.
6. Ask the user to complete waitlist/feedback.
7. Review Sentry only for bugs, not product analytics.
8. Record feedback and next fixes.
